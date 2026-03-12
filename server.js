// ============================================================
// Helper-ID API Server
// Handles all outbound email via SendGrid
// Never exposes API keys to the browser
// ============================================================

const express = require('express');
const cors    = require('cors');
const sgMail  = require('@sendgrid/mail');

const app  = express();
const PORT = process.env.PORT || 3000;

// ---- Config ----
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL       = process.env.FROM_EMAIL || 'hello@helper-id.com';

if (!SENDGRID_API_KEY) {
  console.error('ERROR: SENDGRID_API_KEY environment variable is not set.');
  process.exit(1);
}

sgMail.setApiKey(SENDGRID_API_KEY);

// ---- Middleware ----
app.use(express.json({ limit: '1mb' }));

// CORS — restrict to your own domain in production
const allowedOrigins = [
  'https://helper-id.com',
  'https://www.helper-id.com',
  // Add your DO app URL here once you have it, e.g.:
  // 'https://helper-id-xxxxx.ondigitalocean.app',
  'http://localhost:3000', // local dev
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

// ---- 404 catch-all ----
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ---- Start ----
app.listen(PORT, () => {
  console.log(`Helper-ID API running on port ${PORT}`);
});
