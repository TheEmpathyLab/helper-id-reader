// ============================================================
// Helper-ID — Central Configuration
// Update this file only. All pages pull from here.
// ============================================================

const HID_CONFIG = {

  // ---- Stripe Payment Links ----
  // Get these from: https://dashboard.stripe.com/payment-links
  stripe: {
    digitalDownload:      'https://buy.stripe.com/cNi6oHbIB7c37R67XccIE02',
    nfcPack:              'https://buy.stripe.com/14AcN5cMF0NF4EUdhwcIE01',
    fullMembership:       'https://buy.stripe.com/5kQeVdeUN67Z4EUelAcIE00',
    individualMembership: 'https://buy.stripe.com/5kQeVdeUN67Z4EUelAcIE00',
    familyMembership:     'https://buy.stripe.com/aFa3cvh2Vcwnc7mdhwcIE03',
  },

  // ---- API Endpoint ----
  // Points to the Express service on Digital Ocean
  // In production this is relative (/api/send-email)
  // For local dev, change to: http://localhost:3000/send-email
  apiUrl: '/api/send-email',

  // ---- Site URLs ----
  siteUrl: 'https://helper-id.com',
  appUrl:  'https://helper-id-v8uev.ondigitalocean.app',

  // ---- Pricing (update here if prices change) ----
  pricing: {
    digitalDownload:      '$9',
    nfcPack:              '$35',
    fullMembership:       '$55/yr',
    individualMembership: '$55/yr',
    familyMembership:     '$99/yr',
  },

};
