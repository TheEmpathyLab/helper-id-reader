// Remembers where a visitor came from so a PDF Kit purchase can be traced
// back to it. The source travels to Stripe as client_reference_id and lands
// on one_time_orders.source via the webhook.
(function () {
  const KEY = 'hid_src';
  const TTL = 30 * 86400000;
  const clean = v => String(v || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

  const params = new URLSearchParams(location.search);
  const utm = ['utm_source', 'utm_medium', 'utm_campaign'].map(k => clean(params.get(k)));
  let ref = '';
  try { ref = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, '') : ''; } catch (_) {}
  const external = ref && ref !== location.hostname.replace(/^www\./, '') && !ref.endsWith('stripe.com');

  if (utm[0]) {
    localStorage.setItem(KEY, JSON.stringify({ src: utm.filter(Boolean).join('_'), t: Date.now() }));
  } else if (external) {
    localStorage.setItem(KEY, JSON.stringify({ src: 'ref_' + clean(ref), t: Date.now() }));
  }

  const via = clean(params.get('via'));
  if (via) sessionStorage.setItem('hid_via', via);

  function source() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(KEY)); } catch (_) {}
    const src = s && Date.now() - s.t < TTL ? s.src : 'direct';
    const page = sessionStorage.getItem('hid_via') || clean(location.pathname.replace(/^\/|\.html$/g, '')) || 'index';
    return (src + '--' + page).slice(0, 200);
  }

  document.addEventListener('click', e => {
    const a = e.target.closest('[data-stripe="kitPdf"]');
    if (!a || !a.href || a.href.endsWith('#')) return;
    const url = new URL(a.href);
    url.searchParams.set('client_reference_id', source());
    a.href = url.toString();
    if (window.gtag) gtag('event', 'begin_checkout', {
      currency: 'USD', value: 5,
      items: [{ item_id: 'kit', item_name: 'Emergency PDF Kit', price: 5, quantity: 1 }],
    });
  });
})();
