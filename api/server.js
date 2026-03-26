// ============================================================
// Helper-ID API Server
// Handles outbound email (SendGrid) and Stripe webhook provisioning
// Never exposes API keys to the browser
// ============================================================

const express          = require('express');
const cors             = require('cors');
const sgMail           = require('@sendgrid/mail');
const { createClient } = require('@supabase/supabase-js');
const bcrypt           = require('bcryptjs');
const crypto           = require('crypto');
const Stripe           = require('stripe');

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

if (!SENDGRID_API_KEY) {
  console.error('ERROR: SENDGRID_API_KEY environment variable is not set.');
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
function generateSetupToken(memberId) {
  const expiresAt = Date.now() + 48 * 60 * 60 * 1000;
  const payload   = Buffer.from(JSON.stringify({ memberId, expiresAt })).toString('base64url');
  const sig       = crypto.createHmac('sha256', SETUP_LINK_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
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
  const email      = session.customer_details?.email || session.customer_email;
  const customerId = session.customer;
  const plan       = session.metadata?.plan || 'individual';

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

  // Generate signed setup link
  const token    = generateSetupToken(member.id);
  const setupUrl = `${SITE_URL}/setup?token=${token}`;

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

// ---- 404 catch-all ----
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`Helper-ID API running on port ${PORT}`);
});
