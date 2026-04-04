// ============================================================
// Helper-ID — Headshot upload script
// ============================================================
// Reads images from scripts/headshots/, looks up each profile
// by code, uploads to Supabase Storage (headshots bucket),
// generates a signed URL, and updates profiles.headshot_url.
//
// File naming: {CODE}.jpeg or {CODE}.jpg (case-insensitive)
//
// Usage:
//   cd api
//   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
//     node scripts/upload-headshots.js
// ============================================================

const fs      = require('fs');
const path    = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase   = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const IMAGES_DIR = path.join(__dirname, 'headshots');

// Signed URL valid for 10 years — matches server pattern
const SIGNED_URL_EXPIRY = 60 * 60 * 24 * 365 * 10;

async function run() {
  const files = fs.readdirSync(IMAGES_DIR)
    .filter(f => /\.(jpg|jpeg)$/i.test(f));

  console.log(`Found ${files.length} image(s).\n`);
  let ok = 0, failed = 0;

  for (const file of files) {
    const code = path.basename(file, path.extname(file)).toUpperCase();
    const filePath = path.join(IMAGES_DIR, file);
    const buffer   = fs.readFileSync(filePath);
    const mimeType = 'image/jpeg';

    // Look up profile by code
    const { data: profile, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('code', code)
      .single();

    if (lookupError || !profile) {
      console.error(`FAIL  — no profile found for code: ${code}`);
      failed++;
      continue;
    }

    const filename = `${profile.id}.jpeg`;

    // Upload to headshots bucket
    const { error: uploadError } = await supabase.storage
      .from('headshots')
      .upload(filename, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error(`FAIL  — upload for ${code}: ${uploadError.message}`);
      failed++;
      continue;
    }

    // Generate signed URL
    const { data: signedData, error: signError } = await supabase.storage
      .from('headshots')
      .createSignedUrl(filename, SIGNED_URL_EXPIRY);

    if (signError || !signedData) {
      console.error(`FAIL  — signed URL for ${code}: ${signError?.message}`);
      failed++;
      continue;
    }

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ headshot_url: signedData.signedUrl })
      .eq('id', profile.id);

    if (updateError) {
      console.error(`FAIL  — profile update for ${code}: ${updateError.message}`);
      failed++;
      continue;
    }

    console.log(`OK    — ${code}  (${file})`);
    ok++;
  }

  console.log(`\n────────────────────────`);
  console.log(`Done.  OK: ${ok}  Failed: ${failed}`);
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
