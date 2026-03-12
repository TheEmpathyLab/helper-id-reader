// ============================================================
// HID SHARED FORM LOGIC
// Used by: generator.html, pdf.html, admin/generator.html
// ============================================================

// ---- Render the shared form HTML into a target element ----
function renderForm(targetId) {
  document.getElementById(targetId).innerHTML = `

    <!-- PERSONAL INFO -->
    <div class="hid-card">
      <div class="hid-card-title">Personal Information</div>
      <h2 class="section-title">Who are you?</h2>
      <div class="hid-input-row">
        <div class="hid-form-group">
          <label class="hid-label" for="firstName">First Name</label>
          <input class="hid-input" type="text" id="firstName" placeholder="Margaret" autocomplete="given-name" />
        </div>
        <div class="hid-form-group">
          <label class="hid-label" for="lastName">Last Name</label>
          <input class="hid-input" type="text" id="lastName" placeholder="Johnson" autocomplete="family-name" />
        </div>
      </div>
      <div class="hid-input-row">
        <div class="hid-form-group">
          <label class="hid-label" for="dob">Date of Birth <span class="hid-hint">(used to display age only)</span></label>
          <input class="hid-input" type="date" id="dob" />
        </div>
        <div class="hid-form-group">
          <label class="hid-label" for="bloodType">Blood Type <span class="hid-hint">(optional)</span></label>
          <select class="hid-select" id="bloodType">
            <option value="">Unknown</option>
            <option>A+</option><option>A-</option>
            <option>B+</option><option>B-</option>
            <option>AB+</option><option>AB-</option>
            <option>O+</option><option>O-</option>
          </select>
        </div>
      </div>
    </div>

    <!-- EMERGENCY CONTACTS -->
    <div class="hid-card">
      <div class="hid-card-title">Emergency Contacts</div>
      <h2 class="section-title">Who should be called?</h2>
      <div class="contact-block" data-contact="0">
        <div class="contact-block-header">
          <span class="contact-label">Contact 1</span>
        </div>
        <div class="hid-input-row">
          <div class="hid-form-group">
            <label class="hid-label">Name</label>
            <input class="hid-input contact-name" type="text" placeholder="Sarah Johnson" />
          </div>
          <div class="hid-form-group">
            <label class="hid-label">Relationship</label>
            <input class="hid-input contact-rel" type="text" placeholder="Daughter" />
          </div>
        </div>
        <div class="hid-form-group">
          <label class="hid-label">Phone Number</label>
          <input class="hid-input contact-phone" type="tel" placeholder="(404) 555-0192" />
        </div>
      </div>
      <div class="contact-block" data-contact="1">
        <div class="contact-block-header">
          <span class="contact-label">Contact 2 <span style="font-weight:400;color:var(--gray-mid)">(optional)</span></span>
          <button class="remove-btn" type="button" onclick="clearContact(this)">Clear</button>
        </div>
        <div class="hid-input-row">
          <div class="hid-form-group">
            <label class="hid-label">Name</label>
            <input class="hid-input contact-name" type="text" placeholder="Robert Johnson" />
          </div>
          <div class="hid-form-group">
            <label class="hid-label">Relationship</label>
            <input class="hid-input contact-rel" type="text" placeholder="Son" />
          </div>
        </div>
        <div class="hid-form-group">
          <label class="hid-label">Phone Number</label>
          <input class="hid-input contact-phone" type="tel" placeholder="(770) 555-0138" />
        </div>
      </div>
    </div>

    <!-- MEDICAL -->
    <div class="hid-card">
      <div class="hid-card-title">Medical Information</div>
      <h2 class="section-title">What should responders know?</h2>
      <div class="hid-form-group">
        <label class="hid-label" for="allergies">Allergies <span class="hid-hint">— separate with commas</span></label>
        <textarea class="hid-textarea" id="allergies" placeholder="Penicillin, shellfish"></textarea>
        <div class="char-count" id="allergies-count">0 / 200</div>
      </div>
      <div class="hid-form-group">
        <label class="hid-label" for="medications">Current Medications <span class="hid-hint">— name and dosage if known</span></label>
        <textarea class="hid-textarea" id="medications" placeholder="Lisinopril 10mg, Metformin 500mg"></textarea>
        <div class="char-count" id="medications-count">0 / 200</div>
      </div>
      <div class="hid-form-group">
        <label class="hid-label" for="conditions">Medical Conditions <span class="hid-hint">— diabetes, heart condition, pacemaker…</span></label>
        <textarea class="hid-textarea" id="conditions" placeholder="Type 2 diabetes, hypertension"></textarea>
        <div class="char-count" id="conditions-count">0 / 200</div>
      </div>
      <div class="hid-form-group">
        <label class="hid-label" for="physician">Primary Physician <span class="hid-hint">(optional)</span></label>
        <input class="hid-input" type="text" id="physician" placeholder="Dr. Patricia Moore — (404) 555-0177" />
      </div>
      <div class="hid-form-group">
        <label class="hid-label" for="notes">Additional Notes <span class="hid-hint">(optional)</span></label>
        <textarea class="hid-textarea" id="notes" placeholder="Has a pacemaker. Do not use MRI."></textarea>
      </div>
    </div>

    <!-- HEALTH INSURANCE (collapsible) -->
    <div class="hid-card">
      <div class="insurance-toggle" onclick="toggleInsurance()">
        <div>
          <div class="hid-card-title" style="margin-bottom:2px;">Health Insurance</div>
          <div style="font-size:0.82rem;color:var(--gray-mid);">Medicare, Medicaid, or private insurance</div>
        </div>
        <span class="toggle-icon" id="ins-toggle-icon">＋ Add</span>
      </div>
      <div id="insurance-fields" style="display:none; margin-top:16px;">
        <div class="hid-input-row">
          <div class="hid-form-group">
            <label class="hid-label" for="insProvider">Provider Name</label>
            <input class="hid-input" type="text" id="insProvider" placeholder="Medicare / Blue Cross" />
          </div>
          <div class="hid-form-group">
            <label class="hid-label" for="insMemberId">Member / Policy ID</label>
            <input class="hid-input" type="text" id="insMemberId" placeholder="1EG4-TE5-MK72" />
          </div>
        </div>
        <div class="hid-input-row">
          <div class="hid-form-group">
            <label class="hid-label" for="insGroup">Group Number <span class="hid-hint">(optional)</span></label>
            <input class="hid-input" type="text" id="insGroup" placeholder="GRP-00123" />
          </div>
          <div class="hid-form-group">
            <label class="hid-label" for="insPhone">Insurance Phone</label>
            <input class="hid-input" type="tel" id="insPhone" placeholder="1-800-555-0100" />
          </div>
        </div>
      </div>
    </div>

  `;

  // Wire up char counters after render
  ['allergies', 'medications', 'conditions'].forEach(id => {
    const el = document.getElementById(id);
    const counter = document.getElementById(id + '-count');
    if (el && counter) {
      el.addEventListener('input', () => {
        const len = el.value.length;
        counter.textContent = `${len} / 200`;
        counter.className = 'char-count' + (len > 170 ? (len > 200 ? ' danger' : ' warning') : '');
      });
    }
  });

  // Unsaved data warning
  document.querySelectorAll('.hid-input, .hid-textarea, .hid-select').forEach(el => {
    el.addEventListener('input', () => { window._formDirty = true; });
  });

  window.addEventListener('beforeunload', (e) => {
    if (window._formDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

// ---- Toggle insurance section ----
function toggleInsurance() {
  const fields = document.getElementById('insurance-fields');
  const icon   = document.getElementById('ins-toggle-icon');
  const open   = fields.style.display === 'none';
  fields.style.display = open ? 'block' : 'none';
  icon.textContent = open ? '－ Hide' : '＋ Add';
}

// ---- Clear a contact block ----
function clearContact(btn) {
  btn.closest('.contact-block').querySelectorAll('input').forEach(i => i.value = '');
}

// ---- Build profile object from form ----
function buildProfile() {
  const contacts = [];
  document.querySelectorAll('.contact-block').forEach(block => {
    const name = block.querySelector('.contact-name').value.trim();
    const rel  = block.querySelector('.contact-rel').value.trim();
    const ph   = block.querySelector('.contact-phone').value.trim();
    if (name || ph) contacts.push({ n: name, r: rel, p: ph });
  });

  const ins = {
    prov:  (document.getElementById('insProvider')  || {}).value?.trim() || '',
    mid:   (document.getElementById('insMemberId')  || {}).value?.trim() || '',
    grp:   (document.getElementById('insGroup')     || {}).value?.trim() || '',
    ph:    (document.getElementById('insPhone')     || {}).value?.trim() || '',
  };

  return {
    fn:       document.getElementById('firstName').value.trim(),
    ln:       document.getElementById('lastName').value.trim(),
    dob:      document.getElementById('dob').value.trim(),
    bt:       document.getElementById('bloodType').value.trim(),
    contacts,
    al:       document.getElementById('allergies').value.trim(),
    med:      document.getElementById('medications').value.trim(),
    cond:     document.getElementById('conditions').value.trim(),
    doc:      document.getElementById('physician').value.trim(),
    notes:    document.getElementById('notes').value.trim(),
    ins:      (ins.prov || ins.mid) ? ins : null,
  };
}

// ---- Calculate age from DOB string (YYYY-MM-DD) ----
function calcAge(dob) {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age > 0 ? age : null;
}

// ---- Encode profile to Base64 URL ----
function encodeProfile(profile, baseReaderUrl) {
  const json    = JSON.stringify(profile);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return `${baseReaderUrl}#${encoded}`;
}

// ---- Escape HTML ----
function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
