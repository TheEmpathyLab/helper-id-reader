# Helper-ID Session Log — March 13, 2026

**Topic:** Repo Cleanup + config.js Deployment Debug

---

## What We Accomplished

### 1. Repo Cleanup
- Added `.gitignore` with `.DS_Store`, `node_modules/`, `.env`, and `*.log`
- Removed `/mnt` folder that had leaked from the Claude build environment
- Repo root is now clean

### 2. config.js Confirmed in Repo
- `config.js` committed to repo root alongside `index.html`
- Contains Stripe payment links, API URL, pricing, and site URLs
- `index.html` and `pdf.html` wired to load it and apply links via `data-stripe` attributes

### 3. API Structure Confirmed
- `server.js` and `package.json` confirmed inside `/api/` subfolder
- Matches the source directory setting in the DO web service component

### 4. Session Log System Started
- Session logs being stored as markdown files in the repo
- Naming convention: `SESSION_LOG_YYYY-MM-DD.md`

---

## Deployment Status

| Component | Detail | Status |
|-----------|--------|--------|
| Static Site | `helper-id-v8uev.ondigitalocean.app` serving all HTML | ✅ Live |
| API Service | `/api/health` confirmed responding | ✅ Live |
| config.js | In repo — awaiting DO redeploy to confirm 200 | ⚠️ Verify after next deploy |
| Stripe Buttons | Wired via `data-stripe` attributes, pulling from `config.js` | ⚠️ Pending config.js 200 |
| CORS Fix | `server.js` updated with DO app URL in `allowedOrigins` | ⚠️ Needs push + redeploy |
| .gitignore | Added to repo root | ✅ Done |

---

## Pending Items

### Immediate
- [ ] Confirm `config.js` returns 200 after next DO deploy — check `helper-id-v8uev.ondigitalocean.app/config.js`
- [ ] Force redeploy in DO dashboard if config.js still 404 after push
- [ ] End-to-end test: click DIY and Done With You buttons → confirm Stripe checkout loads
- [ ] End-to-end test: `pdf.html` → fill form → Email to me → confirm delivery
- [ ] End-to-end test: CODE+PIN Notify Me → confirm internal notification email received

### Near-Term
- [ ] Point `helper-id.com` custom domain to DO app
- [ ] End-to-end test: full DIY flow — Stripe → `generator?order=XXX` → NFC write → tap test
- [ ] Validate NTAG215 URL length with real profile data (max ~492 bytes)
- [ ] Test `admin/generator.html` NFC write workflow

---

## Architecture Reference

### Key URLs

| Label | URL |
|-------|-----|
| Production Site | `https://helper-id-v8uev.ondigitalocean.app` |
| API Health Check | `https://helper-id-v8uev.ondigitalocean.app/api/health` |
| GitHub Repo | `https://github.com/TheEmpathyLab/helper-id-reader` |

### Repo Root Structure

```
helper-id-reader/
├── .gitignore
├── config.js               ← Stripe links, API URL, pricing — edit here only
├── hid-style.css
├── hid-form-fields.js
├── index.html
├── pdf.html
├── reader.html
├── generator.html
├── writer.html
├── api/
│   ├── server.js
│   └── package.json
└── admin/
    └── generator.html
```

### config.js Quick Reference

```javascript
const HID_CONFIG = {
  stripe: {
    diy: 'https://buy.stripe.com/...',        // $9 one-time
    doneWithYou: 'https://buy.stripe.com/...', // $25 one-time
  },
  apiUrl: '/api/send-email',
  siteUrl: 'https://helper-id.com',
  appUrl:  'https://helper-id-v8uev.ondigitalocean.app',
  pricing: {
    diy: '$9',
    doneWithYou: '$25',
    subscription: '$35/yr',
  },
};
```

---

*Helper-ID · helper-id.com · Logged March 13, 2026*
