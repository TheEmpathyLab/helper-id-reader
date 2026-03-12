// ============================================================
// Helper-ID — Central Configuration
// Update this file only. All pages pull from here.
// ============================================================

const HID_CONFIG = {

  // ---- Stripe Payment Links ----
  // Get these from: https://dashboard.stripe.com/payment-links
  stripe: {
    diy: 'https://buy.stripe.com/00w14n6kZe7G15q8mT9MY04',
    doneWithYou: 'https://buy.stripe.com/8x200jbFj2oYbK4gTp9MY03',
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
    diy:        '$9',
    doneWithYou: '$25',
    subscription: '$35/yr',
  },

};
