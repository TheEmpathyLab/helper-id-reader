// ============================================================
// Helper-ID — Stripe member patch script
// ============================================================
// Patches stripe_customer_id and stripe_subscription_id for
// members who were gifted memberships outside the webhook flow.
// Run this AFTER seed-from-bubble.js.
//
// Usage:
//   cd api
//   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
//     node scripts/patch-stripe-members.js
//
// Steps:
//   1. Fill in the two members below with data from Stripe dashboard:
//      Stripe → Customers → find by email → copy customer ID
//      Stripe → Subscriptions → find by customer → copy subscription ID
//   2. Run the script.
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---- Fill these in from the Stripe dashboard ----
const STRIPE_MEMBERS = [
  {
    email:                  'member1@example.com',    // replace
    stripe_customer_id:     'cus_XXXXXXXXXXXX',       // replace
    stripe_subscription_id: 'sub_XXXXXXXXXXXX',       // replace
    plan:                   'individual',              // or 'household'
  },
  {
    email:                  'member2@example.com',    // replace
    stripe_customer_id:     'cus_XXXXXXXXXXXX',       // replace
    stripe_subscription_id: 'sub_XXXXXXXXXXXX',       // replace
    plan:                   'individual',
  },
];

async function run() {
  for (const m of STRIPE_MEMBERS) {
    if (m.email.includes('example.com')) {
      console.warn(`SKIP — placeholder email not replaced: ${m.email}`);
      continue;
    }

    const { error } = await supabase
      .from('members')
      .update({
        stripe_customer_id:     m.stripe_customer_id,
        stripe_subscription_id: m.stripe_subscription_id,
        plan:                   m.plan,
      })
      .eq('email', m.email);

    if (error) {
      console.error(`FAIL  — ${m.email}: ${error.message}`);
    } else {
      console.log(`OK    — ${m.email}  customer: ${m.stripe_customer_id}`);
    }
  }

  console.log('\nDone.');
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
