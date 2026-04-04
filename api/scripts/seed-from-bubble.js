// ============================================================
// Helper-ID — Bubble → Supabase migration seed script
// ============================================================
// Hardcoded from Bubble v3 export. Safe to re-run — upserts on
// email (members) and code (profiles).
//
// Usage:
//   cd api
//   SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx \
//     node scripts/seed-from-bubble.js
//
// After this runs:
//   1. node scripts/patch-stripe-members.js  (2 paying members)
//   2. node scripts/update-member-email.js   (when test-email members claim real emails)
//
// NOTE: Height and Weight fields from Bubble not migrated —
//       no schema columns yet. Add columns before importing.
//
// NOTE: 3 members have temporary shelton+X@helper-id.com emails
//       (originally @test.com from Bubble v2 build transfer).
//       Use update-member-email.js to swap in real emails.
// ============================================================

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const SUPABASE_URL              = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================================
// Member data — from Bubble v3 export, 2026-04-03
// ============================================================
const MEMBERS = [
  {
    // Temp email — was danhaber@test.com (v2 build transfer artifact)
    // Update with: node scripts/update-member-email.js
    email:      'shelton+dan@helper-id.com',
    first_name: 'Dan',
    last_name:  'Haber',
    code:       'k4rzdz',
    pin:        '5s6dtz',
    blood_type: null,       // Source: "I don't know, the red type!!" — unknown, needs update
    allergies:  null,
    ec1_name:   'Jodee Haber',
    ec1_phone:  '330.224.5663',
    ec2_name:   'Barb Spera',
    ec2_phone:  null,
    insurance_provider: null,
    status:     'active',
  },
  {
    // Temp email — was kristinbodiford@test.com (v2 build transfer artifact)
    email:      'shelton+kristin@helper-id.com',
    first_name: 'Kristin',
    last_name:  'Bodiford',
    code:       'kry5tn',
    pin:        'ggdtst',
    blood_type: null,
    allergies:  null,
    ec1_name:   null,
    ec1_phone:  null,
    ec2_name:   null,
    ec2_phone:  null,
    insurance_provider: null,
    status:     'active',
  },
  {
    // Temp email — was anarabodiford@test.com (v2 build transfer artifact)
    email:      'shelton+anara@helper-id.com',
    first_name: 'Anara',
    last_name:  'Bodiford',
    code:       'anara5',
    pin:        'qkk05s',
    blood_type: null,       // Source: "I don't know, the red type!!" — unknown, needs update
    allergies:  null,
    ec1_name:   'Kristin Bodiford',
    ec1_phone:  '9259151195',
    ec2_name:   'Erik Lawrence',
    ec2_phone:  '5037184905',
    insurance_provider: null,
    status:     'active',
  },
  {
    email:      'shelton+dylan@helper-id.com',
    first_name: 'Dylan',
    last_name:  'Blazevic',
    code:       'dylan5',
    pin:        '5ufs5m',
    blood_type: null,       // Source: "I don't know, the red type!!" — unknown, needs update
    allergies:  null,
    ec1_name:   'Nikki Elkins',
    ec1_phone:  '5035779906',
    ec2_name:   'Margie Long',
    ec2_phone:  '9717060636',
    insurance_provider: null,
    status:     'active',
  },
  {
    email:      'shelton+jamaal@helper-id.com',
    first_name: 'Jamaal',
    last_name:  'Robinson',
    code:       'jamaal',
    pin:        'vccb6a',
    blood_type: null,
    allergies:  null,
    ec1_name:   'Nayanna Cooper',
    ec1_phone:  null,       // Source was "0" — not a valid phone
    ec2_name:   'Shelton Davis (brother)',
    ec2_phone:  '7144202715',
    // Additional EC dropped: Elton Robinson (dad) 9097318946 — no third EC slot in schema
    insurance_provider: null,
    status:     'active',
  },
  {
    email:      'shelton+julenna@helper-id.com',
    first_name: 'Julenna',
    last_name:  'Newbanks Shirley',
    code:       '168RWP',
    pin:        'PYDWH3',
    blood_type: null,
    allergies:  null,
    ec1_name:   null,
    ec1_phone:  null,
    ec2_name:   null,
    ec2_phone:  null,
    insurance_provider: null,
    status:     'active',
  },
  {
    email:      'shelton+matt@helper-id.com',
    first_name: 'Matt',
    last_name:  'Shirley',
    code:       'ROA2UK',
    pin:        'YCS1VT',
    blood_type: null,
    allergies:  null,
    ec1_name:   'Julenna Newbanks-Shirley',
    ec1_phone:  '7406835458',
    ec2_name:   null,
    ec2_phone:  null,
    insurance_provider: null,
    status:     'active',
  },
  {
    email:      'shelton+karen@helper-id.com',
    first_name: 'Karen',
    last_name:  'MacKay',
    code:       'NFF8NF',
    pin:        '9QI80X',
    blood_type: null,
    allergies:  null,
    ec1_name:   null,
    ec1_phone:  null,
    ec2_name:   null,
    ec2_phone:  null,
    insurance_provider: null,
    status:     'active',
  },
  {
    email:      'eman2551@gmail.com',
    first_name: 'Elton',
    last_name:  'Robinson',
    code:       'Y7M34R',
    pin:        'I3O5YP',
    blood_type: null,
    allergies:  null,
    ec1_name:   'Connie Robinson',
    ec1_phone:  '9099998387',
    ec2_name:   'Jamaal T. Robinson',
    ec2_phone:  '9162478044',
    // Bubble stored a record ID — believed to be Medicare. Confirm + update manually.
    insurance_provider: '1771536981711x113668728750604290',
    // Additional EC dropped: Priscilla Robinson 4713557438 — no third EC slot in schema
    status:     'active',
  },
];

// ============================================================
// Main
// ============================================================
async function run() {
  console.log(`Seeding ${MEMBERS.length} members...\n`);
  let ok = 0, failed = 0;

  for (const m of MEMBERS) {
    // ---- Insert member (skip if already exists) ----
    let memberId;
    const { data: existing } = await supabase
      .from('members')
      .select('id')
      .eq('email', m.email)
      .single();

    if (existing) {
      memberId = existing.id;
    } else {
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .insert({ email: m.email, status: 'active', plan: 'individual' })
        .select('id')
        .single();

      if (memberError) {
        console.error(`FAIL  — member ${m.email}: ${memberError.message}`);
        failed++;
        continue;
      }
      memberId = memberData.id;
    }

    // ---- Hash PIN ----
    const pinHash = await bcrypt.hash(m.pin, 12);

    // ---- Insert profile (skip if code already exists) ----
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          member_id:          memberId,
          code:               m.code,
          pin_hash:           pinHash,
          first_name:         m.first_name,
          last_name:          m.last_name,
          blood_type:         m.blood_type,
          allergies:          m.allergies,
          ec1_name:           m.ec1_name,
          ec1_phone:          m.ec1_phone,
          ec2_name:           m.ec2_name,
          ec2_phone:          m.ec2_phone,
          insurance_provider: m.insurance_provider,
          access_tier:        'cp_only',
          status:             m.status,
        },
        { onConflict: 'code' }
      );

    if (profileError) {
      console.error(`FAIL  — profile ${m.email} (code: ${m.code}): ${profileError.message}`);
      failed++;
      continue;
    }

    console.log(`OK    — ${m.first_name} ${m.last_name}  <${m.email}>  code: ${m.code}`);
    ok++;
  }

  console.log(`\n────────────────────────`);
  console.log(`Done.  OK: ${ok}  Failed: ${failed}`);
  console.log(`\nNext steps:`);
  console.log(`  1. node scripts/patch-stripe-members.js`);
  console.log(`  2. node scripts/update-member-email.js <old> <new>  (for the 3 temp emails)`);
  console.log(`  3. Manually update Elton Robinson's insurance_provider to "Medicare" once confirmed`);
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
