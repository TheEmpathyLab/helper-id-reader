# Helper-ID Session Log — March 12, 2026

**Topic:** Digital Ocean Deployment + API Service + Config System

---

## What We Accomplished

### 1. Live Site Deployed
- Homepage live at `https://helper-id-v8uev.ondigitalocean.app`
- All three product paths rendering correctly: Free PDF, DIY NFC Tag ($9), Done With You ($25)
- CODE+PIN coming soon strip with email capture visible
- Branding, pricing, and feature lists confirmed correct

### 2. API Service Added
- Express web service component added to the DO app (`helper-id-reader-api`)
- Source directory: `/api` | Build: `npm install` | Run: `npm start` | Port: `3000`
- Health check confirmed live: `/api/health` returns `{"status":"ok","service":"helper-id-api"}`
- `SENDGRID_API_KEY` and `FROM_EMAIL` added as encrypted environment variables in DO dashboard

### 3. CORS Fix
- Production DO app URL added to `allowedOrigins` in `server.js`
- Required for browser → API calls to work from the DO domain

### 4. Centralized Config System
- New `config.js` created at repo root — single source of truth for all URLs and settings
- `index.html` and `pdf.html` updated to load `config.js` and wire buttons via `data-stripe` attributes
- No more hardcoded Stripe URLs — update `config.js` only when links change

---

## Deployment Status

| Component | Detail | Status |
|-----------|--------|--------|
| Static Site | `helper-id-v8uev.ondigitalocean.app` serving all HTML | ✅ Live |
| API Service | `/api/health` confirmed responding | ✅ Live |
| Email CORS | `server.js` updated with DO app URL | ⚠️ Push pending |
| Stripe Buttons | `config.js` wired via `data-stripe` attributes | ⚠️ `config.js` 404 — confirm root upload |
| Environment Vars | `SENDGRID_API_KEY` + `FROM_EMAIL` encrypted in DO | ✅ Done |
| Auto-deploy | Pushes to `main` trigger redeploy | ✅ Enabled |

---

## Pending Items

### Immediate — Before Fully Live
- [ ] Confirm `config.js` is in the GitHub repo root (currently returning 404)
- [ ] Push updated `server.js` with CORS fix (auto-deploy will handle the rest)
- [ ] Confirm real Stripe links are set in `config.js` under `stripe: { diy, doneWithYou }`
- [ ] Remove `/mnt` folder from repo (leaked from Claude build environment)
- [ ] End-to-end test: Stripe payment → `generator?order=XXX` → email delivery
- [ ] End-to-end test: `pdf.html` form → PDF download → Email to me
- [ ] End-to-end test: CODE+PIN Notify Me → internal notification email received

### Near-Term
- [ ] Confirm `api/` folder structure in GitHub (server.js + package.json should be inside `/api`, not root)
- [ ] Validate NTAG215 URL length with real profile data (max ~492 bytes)
- [ ] Test `admin/generator.html` NFC write workflow end-to-end
- [ ] Set up `helper-id.com` custom domain in DO dashboard

---

## Architecture Reference

### File Structure

| File | Purpose |
|------|---------|
| `index.html` | Homepage — 3 product paths + CODE+PIN notify |
| `config.js` | Central config — Stripe links, API URL, pricing |
| `hid-style.css` | Shared styles — red `#D0312D`, DM Sans, DM Serif Display |
| `hid-form-fields.js` | Shared form logic used by all pages |
| `pdf.html` | Free PDF path — jsPDF, public |
| `generator.html` | Member DIY tag writer — requires `?order=XXX` |
| `reader.html` | NFC tag reader — split screen |
| `admin/generator.html` | Internal tag writer — Shelton only |
| `api/server.js` | Express API — email endpoint, CORS, health check |
| `api/package.json` | API dependencies: express, @sendgrid/mail, cors |

### Key URLs

| Label | URL |
|-------|-----|
| Production Site | `https://helper-id-v8uev.ondigitalocean.app` |
| API Health Check | `https://helper-id-v8uev.ondigitalocean.app/api/health` |
| GitHub Repo | `https://github.com/TheEmpathyLab/helper-id-reader` |

### config.js Structure

```javascript
const HID_CONFIG = {
  stripe: {
    diy: 'https://buy.stripe.com/...',
    doneWithYou: 'https://buy.stripe.com/...',
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

*Helper-ID · helper-id.com · Logged March 12, 2026*
