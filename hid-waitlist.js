(function () {
  const PLAN_NAMES = { individual: 'Individual Membership', family: 'Family Membership' };

  const modal = document.createElement('div');
  modal.className = 'hid-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="hid-modal-card" role="dialog" aria-modal="true" aria-labelledby="waitlist-title">
      <button class="hid-modal-close" type="button" aria-label="Close">&times;</button>
      <div id="waitlist-form-state">
        <span class="hid-section-label">Coming Soon</span>
        <h3 id="waitlist-title">Get on the list</h3>
        <p class="hid-modal-text">We'll email you when <strong id="waitlist-plan"></strong> opens. No spam — just the one note.</p>
        <form id="waitlist-form" novalidate>
          <input class="hid-input" type="email" id="waitlist-email" placeholder="you@example.com" autocomplete="email" required />
          <div class="hid-alert hid-alert-error" id="waitlist-error" hidden></div>
          <button class="hid-btn hid-btn-primary hid-btn-full" type="submit" id="waitlist-submit">Notify Me</button>
        </form>
      </div>
      <div id="waitlist-done-state" hidden>
        <h3>You're on the list.</h3>
        <p class="hid-modal-text">We'll let you know as soon as memberships open. In the meantime, the Emergency PDF Kit gets you covered today.</p>
        <button class="hid-btn hid-btn-outline hid-btn-full" type="button" data-close>Close</button>
      </div>
    </div>`;
  document.body.appendChild(modal);

  const form    = modal.querySelector('#waitlist-form');
  const emailEl = modal.querySelector('#waitlist-email');
  const errEl   = modal.querySelector('#waitlist-error');
  const btn     = modal.querySelector('#waitlist-submit');
  let plan = null;

  function open(p) {
    plan = p;
    modal.querySelector('#waitlist-plan').textContent = PLAN_NAMES[p];
    modal.querySelector('#waitlist-form-state').hidden = false;
    modal.querySelector('#waitlist-done-state').hidden = true;
    errEl.hidden = true;
    modal.hidden = false;
    emailEl.focus();
  }

  function close() { modal.hidden = true; }

  document.querySelectorAll('[data-waitlist]').forEach(el =>
    el.addEventListener('click', () => open(el.dataset.waitlist)));
  modal.querySelector('.hid-modal-close').addEventListener('click', close);
  modal.querySelector('[data-close]').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    errEl.hidden = true;
    const email = emailEl.value.trim();
    if (!email.includes('@')) {
      errEl.textContent = 'Please enter a valid email address.';
      errEl.hidden = false;
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Sending…';
    const source = location.pathname.replace(/^\//, '') || 'index.html';
    const res  = await fetch('/api/waitlist', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ email, plan, source }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    btn.disabled = false;
    btn.textContent = 'Notify Me';

    if (!res || !res.ok) {
      errEl.textContent = data.error || 'Something went wrong. Please try again.';
      errEl.hidden = false;
      return;
    }
    if (window.gtag) gtag('event', 'waitlist_signup', { plan });
    modal.querySelector('#waitlist-form-state').hidden = true;
    modal.querySelector('#waitlist-done-state').hidden = false;
  });
})();
