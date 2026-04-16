// ============================================================
// Helper-ID API Server
// Handles outbound email (SendGrid) and Stripe webhook provisioning
// Never exposes API keys to the browser
// ============================================================

const express          = require('express');
const cors             = require('cors');
const multer           = require('multer');
const sgMail           = require('@sendgrid/mail');
const { createClient } = require('@supabase/supabase-js');
const bcrypt           = require('bcryptjs');
const crypto           = require('crypto');
const Stripe           = require('stripe');
const rateLimit        = require('express-rate-limit');

const app  = express();
const PORT = process.env.PORT || 3000;

// ---- Config ----
const SENDGRID_API_KEY          = process.env.SENDGRID_API_KEY;
const FROM_EMAIL                = process.env.FROM_EMAIL || 'hello@helper-id.com';
const STRIPE_SECRET_KEY         = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET     = process.env.STRIPE_WEBHOOK_SECRET;
const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SETUP_LINK_SECRET         = process.env.SETUP_LINK_SECRET;
const SITE_URL                  = process.env.SITE_URL || 'https://helper-id.com';

const REQUIRED_ENV_VARS = [
  'SENDGRID_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
];
const missingEnvVars = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (missingEnvVars.length > 0) {
  console.error('ERROR: Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);


const stripe   = Stripe(STRIPE_SECRET_KEY);
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---- Middleware ----
// Stripe webhook needs the raw body — must come BEFORE express.json()
app.use('/stripe-webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));

// CORS — restrict to your own domain in production
const allowedOrigins = [
  'https://helper-id.com',
  'https://www.helper-id.com',
  'https://helper-id-v8uev.ondigitalocean.app',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman) in dev
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
}));

// ---- Security headers ----
// Applied to every response. Suppresses stack info, blocks clickjacking,
// prevents MIME sniffing, enforces HTTPS via HSTS.
app.disable('x-powered-by');

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options',   'nosniff');
  res.setHeader('X-Frame-Options',          'DENY');
  res.setHeader('Referrer-Policy',          'no-referrer');
  res.setHeader('Permissions-Policy',       'camera=(), microphone=(), geolocation=()');
  res.setHeader('Strict-Transport-Security','max-age=31536000'); // includeSubDomains removed until SendGrid link tracking SSL is resolved via CDN
  // CSP: self + Supabase storage for headshot images.
  // Tighten script-src if inline scripts are ever removed from reader.html.
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: blob: https://*.supabase.co https://randomuser.me; " +
    "connect-src 'self' https://*.supabase.co; " +
    "style-src 'self' 'unsafe-inline'; " +
    "frame-ancestors 'none';"
  );
  next();
});

// ---- Rate limiting ----
// IP-based: 10 attempts per 15-minute window on /lookup
// Applies before any DB query so brute-force is stopped at the edge.
const lookupLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             10,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { error: 'Too many attempts. Please try again in 15 minutes.' },
});

// Code-based lockout (in-memory): after 10 failed PINs on a given code,
// lock that code for 15 minutes regardless of IP.
// This catches distributed brute-force across multiple IPs.
const CODE_MAX_FAILURES = 10;
const CODE_LOCKOUT_MS   = 15 * 60 * 1000;
const codeFailures      = new Map(); // code -> { count, lockedUntil }

function isCodeLocked(code) {
  const entry = codeFailures.get(code);
  if (!entry) return false;
  if (Date.now() < entry.lockedUntil) return true;
  codeFailures.delete(code); // lockout expired
  return false;
}

function recordCodeFailure(code) {
  const entry = codeFailures.get(code) || { count: 0, lockedUntil: 0 };
  entry.count++;
  if (entry.count >= CODE_MAX_FAILURES) {
    entry.lockedUntil = Date.now() + CODE_LOCKOUT_MS;
  }
  codeFailures.set(code, entry);
}

function clearCodeFailures(code) {
  codeFailures.delete(code);
}

// ---- Health check ----
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'helper-id-api' });
});

// ---- POST /send-email ----
// Handles three email types:
//   type: 'diy'   — DIY NFC purchase: sends profile URL + write instructions
//   type: 'pdf'   — Free PDF: sends profile HTML formatted as email
//   type: 'notify' — CODE+PIN interest: sends internal notification to you
app.post('/send-email', async (req, res) => {
  const { type, email, profileUrl, profileHtml, orderId } = req.body;

  // Basic validation
  if (!type || !email) {
    return res.status(400).json({ error: 'Missing required fields: type, email' });
  }

  if (!email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  let msg;

  try {
    switch (type) {

      // ---- DIY NFC: profile URL + write instructions ----
      case 'diy':
        if (!profileUrl) {
          return res.status(400).json({ error: 'Missing profileUrl for type: diy' });
        }

        msg = {
          to:      email,
          from:    { email: FROM_EMAIL, name: 'Helper-ID' },
          subject: 'Your Helper-ID Profile URL + NFC Writing Instructions',
          html: `
            <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1A1A1A;">

              <div style="background:#D0312D;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;">
                <span style="color:white;font-weight:700;font-size:1.1rem;letter-spacing:-0.3px;">Helper-ID</span>
                <span style="color:rgba(255,255,255,0.8);font-size:0.8rem;">Your Emergency Tag</span>
              </div>

              <div style="padding:28px 24px;">
                <h2 style="font-size:1.4rem;margin-bottom:8px;color:#1A1A1A;">Your profile is ready.</h2>
                <p style="color:#666;margin-bottom:24px;">
                  Here's your Helper-ID profile URL. Keep this email — you'll use this URL to write your NFC tag.
                </p>

                <div style="background:#F4F4F4;border:1.5px solid #E0E0E0;border-radius:8px;padding:14px 16px;margin-bottom:24px;">
                  <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#D0312D;margin-bottom:6px;">Your Profile URL</div>
                  <div style="font-family:monospace;font-size:12px;color:#444;word-break:break-all;line-height:1.5;">
                    <a href="${profileUrl}" style="color:#D0312D;">${profileUrl}</a>
                  </div>
                </div>

                <h3 style="font-size:1rem;margin-bottom:14px;border-bottom:2px solid #FDECEA;padding-bottom:8px;color:#D0312D;">
                  How to Write Your NFC Tag
                </h3>

                <ol style="padding-left:20px;color:#444;font-size:0.92rem;line-height:1.8;">
                  <li>Purchase an <strong>NTAG215 NFC tag</strong> — search "NTAG215 NFC stickers" on Amazon ($10–15 for a pack)</li>
                  <li>Download <strong>NFC Tools</strong> (free) from the Google Play Store on an Android phone</li>
                  <li>Open NFC Tools → tap <strong>Write</strong> → <strong>Add a record</strong> → <strong>URL / URI</strong></li>
                  <li>Paste your profile URL into the field</li>
                  <li>Tap <strong>Write</strong>, then hold the NTAG215 tag to the back of your phone</li>
                  <li>Test it — tap the tag again. Your emergency profile should open instantly ✅</li>
                </ol>

                <div style="background:#FDECEA;border:1px solid #FCA5A5;border-radius:8px;padding:14px 16px;margin-top:24px;font-size:0.85rem;color:#A82320;">
                  <strong>Note:</strong> NFC writing requires an Android phone. iPhones can <em>read</em> the tag but cannot write to it with NFC Tools.
                </div>

                <div style="margin-top:28px;padding-top:20px;border-top:1px solid #E0E0E0;">
                  <p style="font-size:0.85rem;color:#666;margin-bottom:8px;">
                    Want us to program the tag for you instead?
                  </p>
                  <a href="https://helper-id.com#products"
                     style="background:#D0312D;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.9rem;display:inline-block;">
                    Done With You — $25
                  </a>
                </div>

                ${orderId ? `<p style="margin-top:24px;font-size:0.75rem;color:#bbb;">Order reference: ${orderId}</p>` : ''}
              </div>

              <div style="background:#1A1A1A;padding:16px 24px;text-align:center;">
                <p style="color:#999;font-size:0.75rem;margin:0;">
                  Helper-ID &nbsp;·&nbsp;
                  <a href="https://helper-id.com" style="color:#ccc;">helper-id.com</a>
                  &nbsp;·&nbsp; Questions? Reply to this email.
                </p>
              </div>

            </div>
          `,
        };
        break;

      // ---- Free PDF: profile as formatted email ----
      case 'pdf':
        if (!profileHtml) {
          return res.status(400).json({ error: 'Missing profileHtml for type: pdf' });
        }

        msg = {
          to:      email,
          from:    { email: FROM_EMAIL, name: 'Helper-ID' },
          subject: 'Your Helper-ID Emergency Information',
          html: `
            <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1A1A1A;">

              <div style="background:#D0312D;padding:14px 24px;">
                <span style="color:white;font-weight:700;font-size:1.1rem;letter-spacing:-0.3px;">Helper-ID</span>
                <span style="color:rgba(255,255,255,0.8);font-size:0.8rem;margin-left:12px;">Emergency Information</span>
              </div>

              <div style="padding:24px;">
                <p style="margin-bottom:20px;color:#444;font-size:0.92rem;">
                  Your emergency information is below. Print this email or save it somewhere accessible.
                  You can also download a PDF from the Helper-ID website.
                </p>

                <div style="border:1.5px solid #E0E0E0;border-radius:10px;padding:24px;background:#fff;">
                  ${profileHtml}
                </div>

                <div style="margin-top:24px;padding:16px;background:#F4F4F4;border-radius:8px;text-align:center;">
                  <p style="font-size:0.85rem;color:#666;margin-bottom:12px;">
                    Want this on a physical NFC tag? Anyone can tap it to see your info — no app needed.
                  </p>
                  <a href="https://helper-id.com#products"
                     style="background:#D0312D;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.9rem;display:inline-block;">
                    Get an NFC Tag →
                  </a>
                </div>
              </div>

              <div style="background:#1A1A1A;padding:16px 24px;text-align:center;">
                <p style="color:#999;font-size:0.75rem;margin:0;">
                  Helper-ID &nbsp;·&nbsp;
                  <a href="https://helper-id.com" style="color:#ccc;">helper-id.com</a>
                </p>
              </div>

            </div>
          `,
        };
        break;

      // ---- CODE+PIN notify: internal notification to you ----
      case 'notify':
        msg = {
          to:      FROM_EMAIL, // sends to you, not the user
          from:    { email: FROM_EMAIL, name: 'Helper-ID' },
          subject: `CODE+PIN Interest: ${email}`,
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
              <div style="background:#1A1A1A;padding:12px 20px;">
                <span style="color:white;font-weight:700;">Helper-ID — Internal Notification</span>
              </div>
              <div style="padding:20px;">
                <p>A new person expressed interest in the CODE+PIN hosted profile:</p>
                <p style="font-size:1.1rem;font-weight:700;color:#D0312D;">${email}</p>
                <p style="font-size:0.85rem;color:#666;">Add to your CODE+PIN waitlist.</p>
              </div>
            </div>
          `,
        };
        break;

      default:
        return res.status(400).json({ error: `Unknown email type: ${type}` });
    }

    await sgMail.send(msg);
    res.json({ success: true, type });

  } catch (err) {
    console.error('SendGrid error:', err.response?.body || err.message);
    res.status(500).json({ error: 'Email sending failed. Please try again.' });
  }
});

// ============================================================
// ---- POST /stripe-webhook ----
// ============================================================
// Provisioning flow:
//   1. Verify Stripe signature — reject bad requests immediately
//   2. Return HTTP 200 right away — Stripe retries on non-200,
//      which would create duplicate records
//   3. Process async: generate CODE+PIN, insert member + profile,
//      send welcome email with signed setup link

// ---- Helpers ----

// CODE: 6–7 char alphanumeric, no I/O/0/1 (visual confusion)
// Collision-checked against Supabase profiles table
async function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const len   = Math.random() < 0.5 ? 6 : 7;

  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < len; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (!data) return code;
  }
  throw new Error('Failed to generate a unique CODE after 10 attempts');
}

// PIN: 6-digit numeric, formatted XXX-XXX for readability under stress
function generatePin() {
  const digits = Math.floor(Math.random() * 1_000_000).toString().padStart(6, '0');
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

// Setup link: HMAC-signed token, 48-hour expiry
// Token structure: base64url(payload).hmac_hex
// PIN is included in the payload so it can be shown on the setup screen
// without ever being stored in the database.
function generateSetupToken(memberId, pin) {
  const expiresAt = Date.now() + 48 * 60 * 60 * 1000;
  const payload   = Buffer.from(JSON.stringify({ memberId, pin, expiresAt })).toString('base64url');
  const sig       = crypto.createHmac('sha256', SETUP_LINK_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

// Validate a setup token — returns decoded payload or throws
function validateSetupToken(token) {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) throw new Error('Malformed token');
  const expected = crypto.createHmac('sha256', SETUP_LINK_SECRET).update(payload).digest('hex');
  if (sig !== expected) throw new Error('Invalid signature');
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (Date.now() > data.expiresAt) throw new Error('Token expired');
  return data;
}

// Session token: HMAC-signed, 30-day expiry
// Used for member dashboard authentication (Option B — custom session)
function generateSessionToken(memberId, email) {
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const payload   = Buffer.from(JSON.stringify({ memberId, email, expiresAt })).toString('base64url');
  const sig       = crypto.createHmac('sha256', SETUP_LINK_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

function validateSessionToken(token) {
  const [payload, sig] = token.split('.');
  if (!payload || !sig) throw new Error('Malformed token');
  const expected = crypto.createHmac('sha256', SETUP_LINK_SECRET).update(payload).digest('hex');
  if (sig !== expected) throw new Error('Invalid signature');
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (Date.now() > data.expiresAt) throw new Error('Session expired');
  return data;
}

// ---- Webhook handler ----

app.post('/stripe-webhook', async (req, res) => {
  // 1. Verify Stripe signature
  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      req.headers['stripe-signature'],
      STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Stripe signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // 2. Return 200 immediately — prevents Stripe retry duplicates
  res.json({ received: true });

  // 3. Handle event types asynchronously
  try {
    if (event.type === 'checkout.session.completed') {
      await handleCheckoutCompleted(event.data.object);
    }
    // Future: handle customer.subscription.updated for plan upgrades
  } catch (err) {
    console.error('Webhook processing error:', err.message);
  }
});

async function handleCheckoutCompleted(session) {
  const plan = session.metadata?.plan;

  // Only provision members for the $55 hosted plan.
  // $9 and $35 purchases are handled by /send-email and store no member data.
  if (plan !== 'individual' && plan !== 'household') {
    console.log('Webhook: skipping provisioning — no hosted plan metadata on session', session.id);
    return;
  }

  const email      = session.customer_details?.email || session.customer_email;
  const customerId = session.customer;

  if (!email) {
    console.error('Webhook: no email found on session', session.id);
    return;
  }

  // Duplicate prevention — idempotency check on stripe_customer_id
  const { data: existing } = await supabase
    .from('members')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (existing) {
    console.log('Webhook: duplicate event — member already exists for customer', customerId);
    return;
  }

  // Generate CODE and PIN
  const code    = await generateCode();
  const rawPin  = generatePin();
  const pinHash = await bcrypt.hash(rawPin, 10);

  // Insert member row
  const { data: member, error: memberErr } = await supabase
    .from('members')
    .insert({
      email,
      stripe_customer_id:     customerId,
      stripe_subscription_id: session.subscription || null,
      plan,
      status: 'pending',
    })
    .select('id')
    .single();

  if (memberErr) {
    console.error('Webhook: failed to insert member:', memberErr.message);
    return;
  }

  // Insert profile row (skeleton — member fills out via setup flow)
  const { error: profileErr } = await supabase
    .from('profiles')
    .insert({
      member_id:  member.id,
      code,
      pin_hash:   pinHash,
      first_name: '',   // completed in setup flow
      last_name:  '',
      access_tier: 'cp_only',
      status:     'pending',
    });

  if (profileErr) {
    console.error('Webhook: failed to insert profile:', profileErr.message);
    return;
  }

  // Generate signed setup link — PIN is embedded in the token payload
  const token    = generateSetupToken(member.id, rawPin);
  const setupUrl = `${SITE_URL}/setup.html?token=${token}`;

  // Send welcome email
  await sendWelcomeEmail({ email, code, pin: rawPin, setupUrl, plan });

  console.log(`Webhook: provisioned member ${member.id} (${plan}) — CODE: ${code}`);
}

async function sendWelcomeEmail({ email, code, pin, setupUrl, plan }) {
  const planLabel = plan === 'household' ? 'Full Membership' : 'Full Membership';

  const msg = {
    to:   email,
    from: { email: FROM_EMAIL, name: 'Helper-ID' },
    subject: 'Your Helper-ID is ready — here\'s your CODE and PIN',
    html: `
      <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1A1A1A;">

        <div style="background:#D0312D;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;">
          <span style="color:white;font-weight:700;font-size:1.1rem;letter-spacing:-0.3px;">Helper-ID</span>
          <span style="color:rgba(255,255,255,0.8);font-size:0.8rem;">${planLabel}</span>
        </div>

        <div style="padding:28px 24px;">
          <h2 style="font-size:1.4rem;margin-bottom:8px;">Your Helper-ID account is ready.</h2>
          <p style="color:#666;margin-bottom:24px;">
            Write down your CODE and PIN below — these are how first responders and
            family members access your emergency profile.
          </p>

          <div style="background:#F4F4F4;border:1.5px solid #E0E0E0;border-radius:8px;padding:20px 24px;margin-bottom:24px;">
            <div style="margin-bottom:16px;">
              <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#D0312D;margin-bottom:4px;">Your CODE</div>
              <div style="font-family:monospace;font-size:2rem;font-weight:700;letter-spacing:0.15em;color:#1A1A1A;">${code}</div>
            </div>
            <div>
              <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#D0312D;margin-bottom:4px;">Your PIN</div>
              <div style="font-family:monospace;font-size:2rem;font-weight:700;letter-spacing:0.15em;color:#1A1A1A;">${pin}</div>
            </div>
          </div>

          <div style="background:#FDECEA;border:1px solid #FCA5A5;border-radius:8px;padding:14px 16px;margin-bottom:24px;font-size:0.85rem;color:#A82320;">
            <strong>Write these down.</strong> Store your CODE and PIN somewhere physical —
            on a card in your wallet, on your fridge, or with a trusted family member.
            Do not rely on this email as your only copy.
          </div>

          <h3 style="font-size:1rem;margin-bottom:8px;">Next: build your emergency profile</h3>
          <p style="color:#666;font-size:0.9rem;margin-bottom:16px;">
            Your setup link is active for <strong>48 hours</strong>. Click below to enter your
            emergency contacts, medical information, and photo.
          </p>

          <a href="${setupUrl}"
             style="display:inline-block;background:#D0312D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.95rem;">
            Complete My Profile →
          </a>

          <p style="margin-top:24px;font-size:0.8rem;color:#999;">
            Link expired? Reply to this email and we'll send a new one.
          </p>
        </div>

        <div style="background:#1A1A1A;padding:16px 24px;text-align:center;">
          <p style="color:#999;font-size:0.75rem;margin:0;">
            Helper-ID &nbsp;·&nbsp;
            <a href="https://helper-id.com" style="color:#ccc;">helper-id.com</a>
            &nbsp;·&nbsp; Questions? Reply to this email.
          </p>
        </div>

      </div>
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (err) {
    console.error('Welcome email failed:', err.response?.body || err.message);
  }
}

// ============================================================
// ---- POST /lookup ----
// ============================================================
// Accepts CODE + PIN, verifies credentials, returns profile.
// Also writes an access_log entry on every successful lookup.
// Used by reader.html for the CODE+PIN access path.

app.post('/lookup', lookupLimiter, async (req, res) => {
  const { code, pin } = req.body;

  if (!code || !pin) {
    return res.status(400).json({ error: 'Missing code or pin' });
  }

  const normalizedCode = code.trim().toUpperCase();

  // Reject demo codes — demo profiles are client-side only and must never hit this endpoint
  if (normalizedCode.startsWith('DEMO-') || normalizedCode === 'DEMO') {
    return res.status(404).json({ error: 'Profile not found' });
  }

  // Code-based lockout check — catches distributed brute-force across IPs
  if (isCodeLocked(normalizedCode)) {
    return res.status(429).json({ error: 'Too many failed attempts for this code. Please try again in 15 minutes.' });
  }

  // Fetch only the fields needed for authentication + access logging.
  // pin_hash and profile.id are fetched here but never returned to the client.
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, pin_hash, code, first_name, last_name, preferred_name, date_of_birth, headshot_url, ec1_name, ec1_relationship, ec1_phone, ec2_name, ec2_relationship, ec2_phone, blood_type, allergies, medications, conditions, primary_physician, insurance_provider, insurance_id, advance_directives, is_minor')
    .eq('code', normalizedCode)
    .eq('status', 'active')
    .maybeSingle();

  if (error || !profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  // Verify PIN — stored hash was generated from the XXX-XXX formatted string
  const pinValid = await bcrypt.compare(pin.trim(), profile.pin_hash);
  if (!pinValid) {
    // Log failed attempt and update code-based lockout counter
    recordCodeFailure(normalizedCode);
    await supabase.from('access_logs').insert({
      profile_id:     profile.id,
      access_method:  'cp',
      ip_address:     req.headers['x-forwarded-for'] || req.ip || null,
      failed_attempt: true,
    });
    return res.status(401).json({ error: 'Invalid PIN' });
  }

  // Successful auth — clear any accumulated failure count for this code
  clearCodeFailures(normalizedCode);

  // Write access log
  await supabase.from('access_logs').insert({
    profile_id:     profile.id,
    access_method:  'cp',
    ip_address:     req.headers['x-forwarded-for'] || req.ip || null,
    failed_attempt: false,
  });

  // Return explicit allowlist — internal fields (id, pin_hash) are never sent to the client.
  // Adding new columns to the profiles table will NOT automatically expose them here.
  const { id, pin_hash, ...responseProfile } = profile;
  return res.json({ profile: responseProfile });
});

// ============================================================
// ---- GET /nfc/:token ----
// ============================================================
// Called by reader.html when a NFC tag is tapped (?token= path).
// No auth required — the token IS the credential.
// Returns the profile directly (no PIN prompt) or a revoked status.

app.get('/nfc/:token', lookupLimiter, async (req, res) => {
  const { token } = req.params;

  if (!token) return res.status(400).json({ error: 'Missing token' });

  // Look up the token
  const { data: nfcToken, error: tokenErr } = await supabase
    .from('nfc_tokens')
    .select('id, profile_id, status')
    .eq('token', token.trim())
    .maybeSingle();

  if (tokenErr || !nfcToken) {
    return res.status(404).json({ error: 'Tag not found' });
  }

  // Revoked — return status only, no profile data
  if (nfcToken.status === 'revoked') {
    return res.status(200).json({ status: 'revoked' });
  }

  // Active — fetch profile using same field allowlist as /lookup
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, code, first_name, last_name, preferred_name, date_of_birth, headshot_url, ec1_name, ec1_relationship, ec1_phone, ec2_name, ec2_relationship, ec2_phone, blood_type, allergies, medications, conditions, primary_physician, insurance_provider, insurance_id, advance_directives, is_minor')
    .eq('id', nfcToken.profile_id)
    .eq('status', 'active')
    .maybeSingle();

  if (profileErr || !profile) {
    return res.status(404).json({ error: 'Profile not found' });
  }

  // Update last_accessed_at on the token (fire and forget — don't block response)
  supabase
    .from('nfc_tokens')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', nfcToken.id)
    .then(() => {})
    .catch(err => console.error('nfc last_accessed_at update failed:', err.message));

  // Write access log
  supabase.from('access_logs').insert({
    profile_id:     profile.id,
    access_method:  'nfc',
    ip_address:     req.headers['x-forwarded-for'] || req.ip || null,
    failed_attempt: false,
  }).then(() => {}).catch(err => console.error('nfc access_log insert failed:', err.message));

  // Return profile — id excluded (internal), no pin_hash (not fetched)
  const { id, ...responseProfile } = profile;
  return res.json({ status: 'active', profile: responseProfile });
});

// ============================================================
// ---- POST /validate-token ----
// ============================================================
// Validates a setup token from the welcome email.
// Returns { code, pin, email } so setup.html can show Screen 1.

app.post('/validate-token', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  let payload;
  try {
    payload = validateSetupToken(token);
  } catch (err) {
const expired = err.message === 'Token expired';
    return res.status(expired ? 410 : 400).json({ error: err.message, expired });
  }

  const { data: member } = await supabase
    .from('members')
    .select('id, email, status')
    .eq('id', payload.memberId)
    .maybeSingle();

  if (!member) return res.status(404).json({ error: 'Member not found' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('code, status')
    .eq('member_id', member.id)
    .maybeSingle();

  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  return res.json({
    memberId: member.id,
    email:    member.email,
    code:     profile.code,
    pin:      payload.pin,
    status:   member.status,
  });
});

// ============================================================
// ---- POST /resend-setup ----
// ============================================================
// Generates a new setup token and resends the welcome email.
// Called when a member's setup link has expired.

app.post('/resend-setup', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Missing email' });

  const { data: member } = await supabase
    .from('members')
    .select('id, email, status')
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'pending')
    .maybeSingle();

  if (!member) return res.status(404).json({ error: 'No pending account found for that email' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('code, pin_hash')
    .eq('member_id', member.id)
    .maybeSingle();

  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  // Generate a new PIN, update the hash, resend with new token
  const rawPin  = generatePin();
  const pinHash = await bcrypt.hash(rawPin, 10);

  await supabase.from('profiles').update({ pin_hash: pinHash }).eq('member_id', member.id);

  const token    = generateSetupToken(member.id, rawPin);
  const setupUrl = `${SITE_URL}/setup.html?token=${token}`;

  await sendWelcomeEmail({ email: member.email, code: profile.code, pin: rawPin, setupUrl, plan: 'individual' });

  return res.json({ success: true });
});

// ============================================================
// ---- POST /save-profile ----
// ============================================================
// Saves profile fields as a draft. Profile stays pending.
// Called on each step save in setup.html.

app.post('/save-profile', async (req, res) => {
  const { token, fields } = req.body;
  if (!token || !fields) return res.status(400).json({ error: 'Missing token or fields' });

  let payload;
  try {
    payload = validateSetupToken(token);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const allowed = [
    'first_name', 'last_name', 'preferred_name', 'date_of_birth', 'blood_type',
    'ec1_name', 'ec1_relationship', 'ec1_phone',
    'ec2_name', 'ec2_relationship', 'ec2_phone',
    'allergies', 'medications', 'conditions', 'primary_physician',
    'insurance_provider', 'insurance_id',
    'advance_directives', 'headshot_url',
  ];

  const update = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) update[key] = fields[key];
  }

  const { error } = await supabase
    .from('profiles')
    .update(update)
    .eq('member_id', payload.memberId);

  if (error) return res.status(500).json({ error: 'Failed to save profile' });

  return res.json({ success: true });
});

// ============================================================
// ---- POST /activate-profile ----
// ============================================================
// Flips profile and member status to active.
// Called when member confirms their profile on the review screen.

app.post('/activate-profile', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Missing token' });

  let payload;
  try {
    payload = validateSetupToken(token);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const { error: profileErr } = await supabase
    .from('profiles')
    .update({ status: 'active' })
    .eq('member_id', payload.memberId);

  if (profileErr) return res.status(500).json({ error: 'Failed to activate profile' });

  const { error: memberErr } = await supabase
    .from('members')
    .update({ status: 'active' })
    .eq('id', payload.memberId);

  if (memberErr) return res.status(500).json({ error: 'Failed to activate member' });

  return res.json({ success: true });
});

// ============================================================
// ---- POST /upload-photo ----
// ============================================================
// Accepts a photo file upload, stores it in Supabase Storage
// (headshots bucket), and returns the signed URL.

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

app.post('/upload-photo', upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' });

  let profileId;

  if (req.body.session && req.body.profileId) {
    // Dashboard path — session auth + guardian ownership check
    let payload;
    try { payload = validateSessionToken(req.body.session); }
    catch (err) { return res.status(401).json({ error: err.message }); }

    const canEdit = await guardianCanAccess(payload.memberId, req.body.profileId);
    if (!canEdit) return res.status(403).json({ error: 'Access denied' });

    profileId = req.body.profileId;

  } else if (req.body.token) {
    // Setup flow path — setup token auth
    let payload;
    try { payload = validateSetupToken(req.body.token); }
    catch (err) { return res.status(400).json({ error: err.message }); }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('member_id', payload.memberId)
      .maybeSingle();

    profileId = profile?.id || payload.memberId;

  } else {
    return res.status(400).json({ error: 'Missing authentication' });
  }

  const ext      = req.file.mimetype.split('/')[1] || 'jpg';
  const filename = `${profileId}.${ext}`;

  const { error: uploadErr } = await supabase.storage
    .from('headshots')
    .upload(filename, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: true,
    });

  if (uploadErr) {
    console.error('Photo upload error:', uploadErr.message);
    return res.status(500).json({ error: 'Upload failed' });
  }

  // Generate a signed URL valid for 10 years (photos are semi-permanent)
  const { data: signedData, error: signErr } = await supabase.storage
    .from('headshots')
    .createSignedUrl(filename, 60 * 60 * 24 * 365 * 10);

  if (signErr) return res.status(500).json({ error: 'Could not generate photo URL' });

  return res.json({ url: signedData.signedUrl });
});

// ============================================================
// ---- POST /request-login ----
// ============================================================
// Validates member email, generates a 30-day session token,
// and sends a login link via SendGrid.

app.post('/request-login', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Missing email' });

  const { data: member } = await supabase
    .from('members')
    .select('id, email, status')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  // Always return success to prevent email enumeration
  if (!member || member.status !== 'active') {
    return res.json({ success: true });
  }

  const token    = generateSessionToken(member.id, member.email);
  const loginUrl = `${SITE_URL}/dashboard.html?session=${token}`;

  const msg = {
    to:      member.email,
    from:    { email: FROM_EMAIL, name: 'Helper-ID' },
    subject: 'Your Helper-ID login link',
    html: `
      <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1A1A1A;">
        <div style="background:#D0312D;padding:14px 24px;">
          <span style="color:white;font-weight:700;font-size:1.1rem;letter-spacing:-0.3px;">Helper-ID</span>
        </div>
        <div style="padding:28px 24px;">
          <h2 style="font-size:1.3rem;margin-bottom:8px;">Your login link</h2>
          <p style="color:#666;margin-bottom:24px;">Click below to access your Helper-ID dashboard. This link is valid for 30 days.</p>
          <a href="${loginUrl}"
             style="display:inline-block;background:#D0312D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.95rem;">
            Open My Dashboard →
          </a>
          <p style="margin-top:24px;font-size:0.8rem;color:#999;">
            Didn't request this? Ignore this email — your account is safe.
          </p>
        </div>
        <div style="background:#1A1A1A;padding:16px 24px;text-align:center;">
          <p style="color:#999;font-size:0.75rem;margin:0;">
            Helper-ID &nbsp;·&nbsp;
            <a href="https://helper-id.com" style="color:#ccc;">helper-id.com</a>
          </p>
        </div>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
  } catch (err) {
    console.error('Login email failed:', err.response?.body || err.message);
  }

  return res.json({ success: true });
});

// ============================================================
// ---- POST /member-data ----
// ============================================================
// Returns member + profile data for the authenticated member.
// If the member is a household admin, also returns all profiles
// under that household (dependent profiles they can manage).

app.post('/member-data', async (req, res) => {
  const { session } = req.body;
  if (!session) return res.status(401).json({ error: 'Missing session' });

  let payload;
  try { payload = validateSessionToken(session); }
  catch (err) { return res.status(401).json({ error: err.message }); }

  const { data: member } = await supabase
    .from('members')
    .select('id, email, plan, status, is_admin, created_at')
    .eq('id', payload.memberId)
    .maybeSingle();

  if (!member) return res.status(404).json({ error: 'Member not found' });

  // Own profiles
  const { data: ownProfiles } = await supabase
    .from('profiles')
    .select('*')
    .eq('member_id', payload.memberId);

  // Household profiles — if this member is a household admin
  const { data: household } = await supabase
    .from('households')
    .select('id, name')
    .eq('admin_member_id', payload.memberId)
    .maybeSingle();

  let householdProfiles = [];
  if (household) {
    const { data: hProfiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('household_id', household.id)
      .neq('member_id', payload.memberId); // exclude own profile (already in ownProfiles)
    householdProfiles = hProfiles || [];
  }

  // Merge and deduplicate by id
  const allProfiles = [...(ownProfiles || []), ...householdProfiles];
  const seen = new Set();
  const profiles = allProfiles.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  const { data: logs } = await supabase
    .from('access_logs')
    .select('access_method, ip_address, accessed_at, profile_id, failed_attempt')
    .in('profile_id', profiles.map(p => p.id))
    .order('accessed_at', { ascending: false })
    .limit(10);

  const sanitized = profiles.map(({ pin_hash, ...p }) => p);

  return res.json({
    member,
    profiles: sanitized,
    logs:     logs || [],
    household: household || null,
  });
});

// ============================================================
// ---- POST /update-profile ----
// ============================================================
// Updates profile fields for an authenticated member.

app.post('/update-profile', async (req, res) => {
  const { session, profileId, fields } = req.body;
  if (!session || !profileId || !fields) return res.status(400).json({ error: 'Missing required fields' });

  let payload;
  try { payload = validateSessionToken(session); }
  catch (err) { return res.status(401).json({ error: err.message }); }

  // Confirm access — own profile OR guardian of the profile's household
  const canEdit = await guardianCanAccess(payload.memberId, profileId);
  if (!canEdit) return res.status(403).json({ error: 'Profile not found or access denied' });

  const allowed = [
    'first_name', 'last_name', 'preferred_name', 'date_of_birth', 'blood_type',
    'ec1_name', 'ec1_relationship', 'ec1_phone',
    'ec2_name', 'ec2_relationship', 'ec2_phone',
    'allergies', 'medications', 'conditions', 'primary_physician',
    'insurance_provider', 'insurance_id',
    'advance_directives', 'headshot_url',
  ];

  const update = {};
  for (const key of allowed) {
    if (fields[key] !== undefined) update[key] = fields[key];
  }

  const { error } = await supabase.from('profiles').update(update).eq('id', profileId);
  if (error) return res.status(500).json({ error: 'Update failed' });

  return res.json({ success: true });
});

// ============================================================
// ---- POST /regenerate-pin ----
// ============================================================
// Generates a new PIN for a profile, updates the hash.
// Returns the raw PIN once — member must write it down.

app.post('/regenerate-pin', async (req, res) => {
  const { session, profileId } = req.body;
  if (!session || !profileId) return res.status(400).json({ error: 'Missing required fields' });

  let payload;
  try { payload = validateSessionToken(session); }
  catch (err) { return res.status(401).json({ error: err.message }); }

  const canEdit = await guardianCanAccess(payload.memberId, profileId);
  if (!canEdit) return res.status(403).json({ error: 'Profile not found or access denied' });

  const rawPin  = generatePin();
  const pinHash = await bcrypt.hash(rawPin, 10);

  const { error } = await supabase.from('profiles').update({ pin_hash: pinHash }).eq('id', profileId);
  if (error) return res.status(500).json({ error: 'PIN regeneration failed' });

  return res.json({ pin: rawPin });
});

// ============================================================
// ---- Helper: guardianCanAccess(memberId, profileId) ----
// ============================================================
// Returns true if:
//   (a) the profile belongs directly to this member, OR
//   (b) this member is the admin of the household the profile is in

async function guardianCanAccess(memberId, profileId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, member_id, household_id')
    .eq('id', profileId)
    .maybeSingle();

  if (!profile) return false;
  if (profile.member_id === memberId) return true;

  if (profile.household_id) {
    const { data: household } = await supabase
      .from('households')
      .select('id')
      .eq('id', profile.household_id)
      .eq('admin_member_id', memberId)
      .maybeSingle();
    if (household) return true;
  }

  return false;
}

// ============================================================
// ---- POST /admin/create-household ----
// ============================================================
// Creates a household record and sets the admin member.
// Call this once per household, then use /admin/link-household
// to attach profiles to it.
//
// Body: { adminMemberId, name }
// Returns: { householdId }

app.post('/admin/create-household', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { adminMemberId, name } = req.body;
  if (!adminMemberId || !name) return res.status(400).json({ error: 'Missing adminMemberId or name' });

  // Verify member exists
  const { data: member } = await supabase
    .from('members')
    .select('id')
    .eq('id', adminMemberId)
    .maybeSingle();

  if (!member) return res.status(404).json({ error: 'Member not found' });

  const { data: household, error } = await supabase
    .from('households')
    .insert({ admin_member_id: adminMemberId, name })
    .select('id')
    .single();

  if (error) {
    console.error('/admin/create-household error:', error.message);
    return res.status(500).json({ error: 'Failed to create household' });
  }

  // Update admin member's plan to household
  await supabase.from('members').update({ plan: 'household' }).eq('id', adminMemberId);

  console.log(`/admin/create-household: created "${name}" — id: ${household.id}`);
  return res.json({ householdId: household.id });
});

// ============================================================
// ---- POST /admin/link-household ----
// ============================================================
// Links one or more profiles to a household.
// Safe to call multiple times — just updates household_id.
//
// Body: { householdId, profileIds: [uuid, uuid, ...] }
// Returns: { updated: N }

app.post('/admin/link-household', async (req, res) => {
  const secret = req.headers['x-admin-secret'];
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { householdId, profileIds } = req.body;
  if (!householdId || !Array.isArray(profileIds) || !profileIds.length) {
    return res.status(400).json({ error: 'Missing householdId or profileIds' });
  }

  // Verify household exists
  const { data: household } = await supabase
    .from('households')
    .select('id')
    .eq('id', householdId)
    .maybeSingle();

  if (!household) return res.status(404).json({ error: 'Household not found' });

  const { error, count } = await supabase
    .from('profiles')
    .update({ household_id: householdId })
    .in('id', profileIds);

  if (error) {
    console.error('/admin/link-household error:', error.message);
    return res.status(500).json({ error: 'Failed to link profiles' });
  }

  console.log(`/admin/link-household: linked ${profileIds.length} profile(s) to household ${householdId}`);
  return res.json({ updated: profileIds.length });
});

// ============================================================
// ---- POST /admin/provision ----
// ============================================================
// Manually provisions a member + profile without a Stripe webhook.
// Used for: Bubble member migration, demo/test profiles, comped accounts.
//
// Protected by x-admin-secret header (must match ADMIN_SECRET env var).
//
// Body:
//   email       {string}  required
//   code        {string}  optional — uses provided CODE (Bubble migration) or generates one
//   pin         {string}  optional — hashes provided PIN or generates one
//   profile     {object}  optional — pre-populates profile fields, sets status: active
//   skipEmail   {boolean} optional — if true, no email is sent (demo/test profiles)
//   plan        {string}  optional — defaults to 'individual'
//
// Returns: { memberId, profileId, code, pin }
// The raw pin is returned once for record-keeping. Never log it.

const ADMIN_SECRET = process.env.ADMIN_SECRET;

app.post('/admin/provision', async (req, res) => {
  // Auth check
  const secret = req.headers['x-admin-secret'];
  if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { email, code: providedCode, pin: providedPin, profile = {}, skipEmail = false, plan = 'individual' } = req.body;
  if (!email) return res.status(400).json({ error: 'Missing email' });

  // Duplicate check by email
  const { data: existing } = await supabase
    .from('members')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: `Member already exists for ${email}` });
  }

  // CODE — use provided or generate
  let code;
  if (providedCode) {
    // Verify uniqueness
    const { data: taken } = await supabase
      .from('profiles')
      .select('id')
      .eq('code', providedCode.toUpperCase().trim())
      .maybeSingle();
    if (taken) return res.status(409).json({ error: `CODE ${providedCode} is already in use` });
    code = providedCode.toUpperCase().trim();
  } else {
    code = await generateCode();
  }

  // PIN — use provided or generate
  const rawPin  = providedPin ? String(providedPin).trim() : generatePin();
  const pinHash = await bcrypt.hash(rawPin, 10);

  // Profile data provided → provision as active immediately
  const hasProfileData = Object.keys(profile).length > 0;
  const memberStatus   = hasProfileData ? 'active'  : 'pending';
  const profileStatus  = hasProfileData ? 'active'  : 'pending';

  // Insert member
  const { data: member, error: memberErr } = await supabase
    .from('members')
    .insert({
      email:  email.toLowerCase().trim(),
      plan,
      status: memberStatus,
    })
    .select('id')
    .single();

  if (memberErr) {
    console.error('/admin/provision: member insert failed:', memberErr.message);
    return res.status(500).json({ error: 'Failed to create member' });
  }

  // Insert profile — merge provided data with required fields
  const profileRow = {
    member_id:   member.id,
    code,
    pin_hash:    pinHash,
    access_tier: 'cp_only',
    status:      profileStatus,
    first_name:  profile.first_name  || '',
    last_name:   profile.last_name   || '',
    ...(profile.preferred_name    && { preferred_name:    profile.preferred_name    }),
    ...(profile.date_of_birth     && { date_of_birth:     profile.date_of_birth     }),
    ...(profile.blood_type        && { blood_type:        profile.blood_type        }),
    ...(profile.ec1_name          && { ec1_name:          profile.ec1_name          }),
    ...(profile.ec1_relationship  && { ec1_relationship:  profile.ec1_relationship  }),
    ...(profile.ec1_phone         && { ec1_phone:         profile.ec1_phone         }),
    ...(profile.ec2_name          && { ec2_name:          profile.ec2_name          }),
    ...(profile.ec2_relationship  && { ec2_relationship:  profile.ec2_relationship  }),
    ...(profile.ec2_phone         && { ec2_phone:         profile.ec2_phone         }),
    ...(profile.allergies         && { allergies:         profile.allergies         }),
    ...(profile.medications       && { medications:       profile.medications       }),
    ...(profile.conditions        && { conditions:        profile.conditions        }),
    ...(profile.primary_physician && { primary_physician: profile.primary_physician }),
    ...(profile.advance_directives && { advance_directives: profile.advance_directives }),
  };

  const { data: newProfile, error: profileErr } = await supabase
    .from('profiles')
    .insert(profileRow)
    .select('id')
    .single();

  if (profileErr) {
    console.error('/admin/provision: profile insert failed:', profileErr.message);
    // Clean up the member row to avoid orphans
    await supabase.from('members').delete().eq('id', member.id);
    return res.status(500).json({ error: 'Failed to create profile' });
  }

  console.log(`/admin/provision: provisioned ${email} — CODE: ${code} — status: ${memberStatus}`);

  // Email
  if (!skipEmail) {
    if (hasProfileData) {
      // Migration path — member already knows their CODE+PIN
      // Send a dashboard login link so they can review and update their profile
      const token    = generateSessionToken(member.id, email.toLowerCase().trim());
      const loginUrl = `${SITE_URL}/dashboard.html?session=${token}`;
      const msg = {
        to:      email,
        from:    { email: FROM_EMAIL, name: 'Helper-ID' },
        subject: 'Your Helper-ID profile is ready',
        html: `
          <div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1A1A1A;">
            <div style="background:#D0312D;padding:14px 24px;">
              <span style="color:white;font-weight:700;font-size:1.1rem;letter-spacing:-0.3px;">Helper-ID</span>
            </div>
            <div style="padding:28px 24px;">
              <h2 style="font-size:1.3rem;margin-bottom:8px;">Your profile has been moved over.</h2>
              <p style="color:#666;margin-bottom:16px;">
                Your Helper-ID profile is live on our new platform. Your CODE and PIN are unchanged —
                first responders can still access your profile the same way.
              </p>
              <div style="background:#F4F4F4;border:1.5px solid #E0E0E0;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                <div style="margin-bottom:12px;">
                  <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#D0312D;margin-bottom:4px;">Your CODE</div>
                  <div style="font-family:monospace;font-size:1.8rem;font-weight:700;letter-spacing:0.15em;">${code}</div>
                </div>
                <div>
                  <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#D0312D;margin-bottom:4px;">Your PIN</div>
                  <div style="font-family:monospace;font-size:1.8rem;font-weight:700;letter-spacing:0.15em;">${rawPin}</div>
                </div>
              </div>
              <p style="color:#666;font-size:0.9rem;margin-bottom:16px;">
                Click below to open your dashboard — review your profile, update any information, and see who has accessed it.
              </p>
              <a href="${loginUrl}"
                 style="display:inline-block;background:#D0312D;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:0.95rem;">
                Open My Dashboard →
              </a>
              <p style="margin-top:24px;font-size:0.8rem;color:#999;">
                This login link is valid for 30 days. Questions? Reply to this email.
              </p>
            </div>
            <div style="background:#1A1A1A;padding:16px 24px;text-align:center;">
              <p style="color:#999;font-size:0.75rem;margin:0;">
                Helper-ID &nbsp;·&nbsp;
                <a href="https://helper-id.com" style="color:#ccc;">helper-id.com</a>
              </p>
            </div>
          </div>
        `,
      };
      try { await sgMail.send(msg); }
      catch (err) { console.error('Migration email failed:', err.response?.body || err.message); }
    } else {
      // Fresh provision — send standard setup email
      const token    = generateSetupToken(member.id, rawPin);
      const setupUrl = `${SITE_URL}/setup.html?token=${token}`;
      await sendWelcomeEmail({ email, code, pin: rawPin, setupUrl, plan });
    }
  }

  return res.json({ memberId: member.id, profileId: newProfile.id, code, pin: rawPin });
});

// ============================================================
// ---- POST /nfc/revoke ----
// ============================================================
// Member-authenticated. Member can only revoke tokens belonging
// to their own profiles. Idempotent — revoking an already-revoked
// token returns success.

app.post('/nfc/revoke', async (req, res) => {
  const { session, token } = req.body;
  if (!session || !token) return res.status(400).json({ error: 'Missing session or token' });

  let payload;
  try { payload = validateSessionToken(session); }
  catch (err) { return res.status(401).json({ error: err.message }); }

  // Look up token + verify it belongs to this member via profile ownership
  const { data: nfcToken, error: tokenErr } = await supabase
    .from('nfc_tokens')
    .select('id, status, profile_id')
    .eq('token', token.trim())
    .maybeSingle();

  if (tokenErr || !nfcToken) return res.status(404).json({ error: 'Token not found' });

  // Confirm the profile belongs to the requesting member
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, member_id')
    .eq('id', nfcToken.profile_id)
    .eq('member_id', payload.memberId)
    .maybeSingle();

  if (!profile) return res.status(403).json({ error: 'Access denied' });

  // Already revoked — idempotent success
  if (nfcToken.status === 'revoked') return res.json({ success: true });

  // Revoke it
  const { error: revokeErr } = await supabase
    .from('nfc_tokens')
    .update({ status: 'revoked', revoked_at: new Date().toISOString() })
    .eq('id', nfcToken.id);

  if (revokeErr) return res.status(500).json({ error: 'Revocation failed' });

  return res.json({ success: true });
});

// ============================================================
// ---- ADMIN ROUTES ----
// ============================================================
// All admin routes require a valid session token for a member
// with is_admin = true. Auth is checked via requireAdmin middleware.

async function requireAdmin(req, res, next) {
  const { session } = req.body;
  if (!session) return res.status(401).json({ error: 'Missing session' });

  let payload;
  try { payload = validateSessionToken(session); }
  catch (err) { return res.status(401).json({ error: err.message }); }

  const { data: member } = await supabase
    .from('members')
    .select('id, email, is_admin')
    .eq('id', payload.memberId)
    .maybeSingle();

  if (!member || !member.is_admin) {
    return res.status(403).json({ error: 'Access denied' });
  }

  req.adminMember = member;
  next();
}

// ---- POST /admin/nfc/provision ----
// Generates a token for a profile and returns the NFC-ready URL.
// Admin only. A profile can have multiple tokens (one per physical tag).
app.post('/admin/nfc/provision', requireAdmin, async (req, res) => {
  const { profileId, label } = req.body;
  if (!profileId) return res.status(400).json({ error: 'Missing profileId' });

  // Verify profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', profileId)
    .maybeSingle();

  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  // Generate unique 12-char alphanumeric token
  let token;
  let attempts = 0;
  while (attempts < 10) {
    const raw = crypto.randomBytes(9).toString('base64url').slice(0, 12).toUpperCase();
    const { data: existing } = await supabase
      .from('nfc_tokens')
      .select('id')
      .eq('token', raw)
      .maybeSingle();
    if (!existing) { token = raw; break; }
    attempts++;
  }

  if (!token) return res.status(500).json({ error: 'Failed to generate unique token' });

  const { error: insertErr } = await supabase
    .from('nfc_tokens')
    .insert({
      profile_id: profileId,
      token,
      label:  label || null,
      status: 'active',
    });

  if (insertErr) {
    console.error('/admin/nfc/provision insert failed:', insertErr.message);
    return res.status(500).json({ error: 'Failed to provision token' });
  }

  const url = `https://helper-id.com/reader.html?token=${token}`;
  console.log(`/admin/nfc/provision: token ${token} provisioned for profile ${profileId}`);
  return res.json({ token, url, label: label || null });
});

// ---- POST /admin/stats ----
// Platform overview: member counts, profile counts, lookup activity, revenue breakdown.
app.post('/admin/stats', requireAdmin, async (req, res) => {
  const [
    { count: totalMembers },
    { count: activeMembers },
    { count: pendingMembers },
    { count: activeProfiles },
    { count: lookups7d },
    { count: lookups30d },
    { count: failedAttempts7d },
  ] = await Promise.all([
    supabase.from('members').select('*', { count: 'exact', head: true }),
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('members').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('access_logs').select('*', { count: 'exact', head: true })
      .eq('failed_attempt', false)
      .gte('accessed_at', new Date(Date.now() - 7  * 86400000).toISOString()),
    supabase.from('access_logs').select('*', { count: 'exact', head: true })
      .eq('failed_attempt', false)
      .gte('accessed_at', new Date(Date.now() - 30 * 86400000).toISOString()),
    supabase.from('access_logs').select('*', { count: 'exact', head: true })
      .eq('failed_attempt', true)
      .gte('accessed_at', new Date(Date.now() - 7  * 86400000).toISOString()),
  ]);

  return res.json({
    members: { total: totalMembers, active: activeMembers, pending: pendingMembers },
    profiles: { active: activeProfiles },
    lookups:  { last7d: lookups7d, last30d: lookups30d },
    security: { failedAttempts7d },
  });
});

// ---- POST /admin/members ----
// Full member list with profile status and flags.
app.post('/admin/members', requireAdmin, async (req, res) => {
  const { data: members } = await supabase
    .from('members')
    .select('id, email, plan, status, is_admin, created_at')
    .order('created_at', { ascending: false });

  const { data: profiles } = await supabase
    .from('profiles')
    .select('member_id, first_name, last_name, code, status, headshot_url');

  const profileMap = {};
  (profiles || []).forEach(p => { profileMap[p.member_id] = p; });

  const result = (members || []).map(m => ({
    ...m,
    profile:         profileMap[m.id] || null,
    hasHeadshot:     !!(profileMap[m.id]?.headshot_url),
    isTempEmail:     m.email.startsWith('shelton+'),
    profileStatus:   profileMap[m.id]?.status || 'none',
  }));

  return res.json({ members: result });
});

// ---- POST /admin/update-email ----
// Update a member's email address.
app.post('/admin/update-email', requireAdmin, async (req, res) => {
  const { memberId, newEmail } = req.body;
  if (!memberId || !newEmail) return res.status(400).json({ error: 'Missing memberId or newEmail' });

  const { error } = await supabase
    .from('members')
    .update({ email: newEmail.toLowerCase().trim() })
    .eq('id', memberId);

  if (error) return res.status(500).json({ error: 'Update failed' });
  return res.json({ success: true });
});

// ---- POST /admin/resend-setup ----
// Resend setup link to a pending member.
app.post('/admin/resend-setup', requireAdmin, async (req, res) => {
  const { memberId } = req.body;
  if (!memberId) return res.status(400).json({ error: 'Missing memberId' });

  const { data: member } = await supabase
    .from('members')
    .select('id, email, status')
    .eq('id', memberId)
    .maybeSingle();

  if (!member) return res.status(404).json({ error: 'Member not found' });

  const { data: profile } = await supabase
    .from('profiles')
    .select('code, pin_hash')
    .eq('member_id', memberId)
    .maybeSingle();

  if (!profile) return res.status(404).json({ error: 'Profile not found' });

  const token    = generateSetupToken(member.id, '000-000'); // placeholder — member sets PIN on setup
  const setupUrl = `${SITE_URL}/setup.html?token=${token}`;

  await sendWelcomeEmail({ email: member.email, code: profile.code, pin: '—', setupUrl, plan: 'individual' });
  return res.json({ success: true });
});

// ---- POST /admin/logs ----
// Recent access logs across all profiles.
app.post('/admin/logs', requireAdmin, async (req, res) => {
  const { data: logs } = await supabase
    .from('access_logs')
    .select('id, profile_id, access_method, ip_address, failed_attempt, accessed_at')
    .order('accessed_at', { ascending: false })
    .limit(50);

  // Enrich with profile name
  const profileIds = [...new Set((logs || []).map(l => l.profile_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, code')
    .in('id', profileIds);

  const profileMap = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p; });

  const enriched = (logs || []).map(l => ({
    ...l,
    profile: profileMap[l.profile_id] || null,
  }));

  return res.json({ logs: enriched });
});

// ---- 404 catch-all ----
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`Helper-ID API running on port ${PORT}`);
});
