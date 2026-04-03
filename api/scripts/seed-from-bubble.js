// ============================================================
// Helper-ID — Bubble → Supabase migration seed script
// ============================================================
// Reads a Bubble CSV/TSV export and upserts members + profiles
// into Supabase. Safe to re-run — uses upsert on email and code.
//
// Usage:
//   cd api
//   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
//     node scripts/seed-from-bubble.js path/to/bubble-export.csv
//
// After this runs, patch the two Stripe members:
//   node scripts/patch-stripe-members.js
//
// NOTE: Height and Weight fields from Bubble are intentionally
// not migrated — no columns exist in the schema yet.
// Track addition of these fields as a separate schema update.
// ============================================================

const fs   = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// ---- Supabase client ----
const SUPABASE_URL             = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ---- CSV/TSV parser ----
// Handles both tab-separated (Bubble default) and comma-separated exports.
function parseFlatFile(raw) {
  const lines = raw.trim().split('\n');
  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));
  return lines.slice(1).map(line => {
    const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
}

// ---- Allergy concatenation ----
// Drops empty fields, labels each present field.
function buildAllergies(row) {
  const parts = [];
  if (row['Allergy Animal'])        parts.push(`Animal: ${row['Allergy Animal']}`);
  if (row['Allergy Environmental']) parts.push(`Environmental: ${row['Allergy Environmental']}`);
  if (row['Allergy Food'])          parts.push(`Food: ${row['Allergy Food']}`);
  if (row['Allergy Medicines'])     parts.push(`Medicines: ${row['Allergy Medicines']}`);
  return parts.length ? parts.join(', ') : null;
}

// ---- Main ----
async function run() {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error('Usage: node scripts/seed-from-bubble.js path/to/export.csv');
    process.exit(1);
  }

  const raw  = fs.readFileSync(path.resolve(csvPath), 'utf8');
  const rows = parseFlatFile(raw);
  console.log(`Found ${rows.length} row(s) to process.\n`);

  let ok = 0, skipped = 0, failed = 0;

  for (const row of rows) {
    const email = (row['Owner'] || '').toLowerCase().trim();
    if (!email) {
      console.warn(`SKIP — no Owner/email (unique id: ${row['unique id']})`);
      skipped++;
      continue;
    }

    const pin = (row['Pin'] || '').trim();
    if (!pin) {
      console.warn(`SKIP — no PIN for ${email}`);
      skipped++;
      continue;
    }

    const code = (row['Code'] || '').trim();
    if (!code) {
      console.warn(`SKIP — no Code for ${email}`);
      skipped++;
      continue;
    }

    // ---- Upsert member ----
    const { data: memberData, error: memberError } = await supabase
      .from('members')
      .upsert(
        { email, status: 'active', plan: 'individual' },
        { onConflict: 'email' }
      )
      .select('id')
      .single();

    if (memberError) {
      console.error(`FAIL  — member upsert for ${email}: ${memberError.message}`);
      failed++;
      continue;
    }

    // ---- Build profile ----
    const pinHash  = await bcrypt.hash(pin, 12);
    const allergies = buildAllergies(row);

    const hasInsurance      = ['true', 'yes', '1'].includes((row['Has Insurance'] || '').toLowerCase());
    const insuranceProvider = hasInsurance ? (row['Health Insurance'] || null) : null;

    const isPublished = ['true', 'yes', '1'].includes((row['Published'] || '').toLowerCase());

    const profile = {
      member_id:          memberData.id,
      code,
      pin_hash:           pinHash,
      first_name:         (row['first name'] || row['First Name'] || '').trim(),
      last_name:          (row['last name']  || row['Last Name']  || '').trim(),
      blood_type:         row['Blood Group']  || null,
      allergies,
      ec1_name:           row['Primary Emergency Contact Name']   || null,
      ec1_phone:          row['Primary Emergency Contact Phone']  || null,
      ec2_name:           row['Secondary Emergency Contact Name'] || null,
      ec2_phone:          row['Secondary Emergency Contact Phone']|| null,
      insurance_provider: insuranceProvider,
      access_tier:        'cp_only',
      status:             isPublished ? 'active' : 'pending',
    };

    // ---- Upsert profile ----
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profile, { onConflict: 'code' });

    if (profileError) {
      console.error(`FAIL  — profile upsert for ${email} (code: ${code}): ${profileError.message}`);
      failed++;
      continue;
    }

    console.log(`OK    — ${email}  code: ${code}`);
    ok++;
  }

  console.log(`\n────────────────────────`);
  console.log(`Done.  OK: ${ok}  Skipped: ${skipped}  Failed: ${failed}`);
  if (ok > 0) {
    console.log(`\nNext: run scripts/patch-stripe-members.js for the two Stripe members.`);
  }
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
