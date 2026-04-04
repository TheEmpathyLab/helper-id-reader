// ============================================================
// Helper-ID — Member email update script
// ============================================================
// Updates a member's email in Supabase. Use this when a member
// is ready to claim their account from a temporary shelton+X email.
//
// Usage:
//   cd api
//   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
//     node scripts/update-member-email.js <old-email> <new-email>
//
// Example:
//   node scripts/update-member-email.js \
//     shelton+dan@helper-id.com \
//     danhaber@realemail.com
//
// Members currently on temp emails (as of 2026-04-04):
//   shelton+dan@helper-id.com     → Dan Haber
//   shelton+kristin@helper-id.com → Kristin Bodiford
//   shelton+anara@helper-id.com   → Anara Bodiford
// ============================================================

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const oldEmail = (process.argv[2] || '').toLowerCase().trim();
  const newEmail = (process.argv[3] || '').toLowerCase().trim();

  if (!oldEmail || !newEmail) {
    console.error('Usage: node scripts/update-member-email.js <old-email> <new-email>');
    process.exit(1);
  }

  // Verify member exists
  const { data: existing, error: lookupError } = await supabase
    .from('members')
    .select('id, email, status')
    .eq('email', oldEmail)
    .single();

  if (lookupError || !existing) {
    console.error(`No member found with email: ${oldEmail}`);
    process.exit(1);
  }

  console.log(`Found: ${existing.email} (status: ${existing.status})`);

  // Update email
  const { error: updateError } = await supabase
    .from('members')
    .update({ email: newEmail })
    .eq('id', existing.id);

  if (updateError) {
    console.error(`Failed to update email: ${updateError.message}`);
    process.exit(1);
  }

  console.log(`OK — updated ${oldEmail} → ${newEmail}`);
  console.log(`Member can now sign in at helper-id.com using ${newEmail}`);
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
