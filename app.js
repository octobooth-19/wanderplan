(function () {
  'use strict';
  const { DESTINATIONS, LIMITS, generateItinerary, validateInput } = window.Planner;

  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const usd = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const HERO = { japan: 'Mount Fuji', italy: 'Colosseum', france: ['Eiffel Tower', 'Champ de Mars', 'Pont Alexandre III'], thailand: 'Wat Arun', greece: 'Oia, Greece', indonesia: ['Borobudur', 'Tanah Lot'] };
  const heroName = (k) => [].concat(HERO[k])[0];
  const CATEGORY_ICON = { culture: '⛩️', city: '🏙️', food: '🍜', art: '🎨', nature: '🏞️', stroll: '🚶', arrival: '🛬', departure: '🛫', travel: '🧭' };

  const state = { result: null, friends: new Set(), transport: {}, stale: false, draft: null, booking: null };

  /* ---------------- Ad banner ---------------- */
  const ADS = [
    { emoji: '🧳', title: 'SkyHop Air — Fly 2, 3rd flies free', text: 'Sample promo for demo purposes only.', cta: 'View deal' },
    { emoji: '🏨', title: 'StayWell Hotels: 20% off 5+ nights', text: 'Sample promo — not a real offer.', cta: 'Explore' },
    { emoji: '📶', title: 'GlobeSIM eSIM — data in 120 countries', text: 'Sample promo for demo purposes only.', cta: 'Learn more' },
    { emoji: '🛡️', title: 'TripSafe travel insurance from $4/day', text: 'Sample promo — not a real offer.', cta: 'Get a quote' },
    { emoji: '🚗', title: 'RoamCars: free upgrade on weekly rentals', text: 'Sample promo for demo purposes only.', cta: 'Book now' }
  ];
  const adView = $('#ad-viewport');
  const pauseBtn = $('#ad-pause');
  let adIndex = 0, adTimer = null, adPaused = reducedMotion, adHover = false;

  adView.innerHTML = ADS.map((ad, i) => `
    <div class="ad-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} of ${ADS.length}" ${i ? 'hidden' : ''}>
      <span class="ad-emoji" aria-hidden="true">${ad.emoji}</span>
      <div class="ad-text"><strong>${esc(ad.title)}</strong><span>${esc(ad.text)}</span></div>
      <button type="button" class="ad-cta" data-ad="${i}">${esc(ad.cta)}</button>
    </div>`).join('');
  const slides = [...adView.querySelectorAll('.ad-slide')];

  function showAd(i) {
    adIndex = (i + ADS.length) % ADS.length;
    slides.forEach((s, j) => { s.hidden = j !== adIndex; });
  }
  function syncPause() {
    pauseBtn.textContent = adPaused ? '▶' : '❚❚';
    pauseBtn.setAttribute('aria-label', adPaused ? 'Resume ad rotation' : 'Pause ad rotation');
    pauseBtn.setAttribute('aria-pressed', String(adPaused));
    clearInterval(adTimer);
    if (!adPaused) adTimer = setInterval(() => { if (!adHover) showAd(adIndex + 1); }, 6000);
  }
  $('#ad-prev').addEventListener('click', () => showAd(adIndex - 1));
  $('#ad-next').addEventListener('click', () => showAd(adIndex + 1));
  pauseBtn.addEventListener('click', () => { adPaused = !adPaused; syncPause(); });
  const banner = $('.ad-banner');
  banner.addEventListener('mouseenter', () => { adHover = true; });
  banner.addEventListener('mouseleave', () => { adHover = false; });
  banner.addEventListener('focusin', () => { adHover = true; });
  banner.addEventListener('focusout', () => { adHover = false; });
  adView.addEventListener('click', (e) => {
    const b = e.target.closest('.ad-cta');
    if (!b) return;
    const note = b.parentElement.querySelector('.ad-note') || b.insertAdjacentElement('afterend', Object.assign(document.createElement('span'), { className: 'ad-note' }));
    note.textContent = 'Demo ad — no external link.';
  });
  syncPause();

  /* ---------------- Photos (Wikipedia) ---------------- */
  // Skip thumbnails that aren't photos of the place (maps, flags, logos, signs, satellite views).
  const NOT_A_PHOTO = /\.svg|map|locat|flag|logo|coat_of_arms|seal|sign|aster|satellite|dimos|diagram|plan_/i;
  const photoCache = new Map();
  const queue = [];
  let active = 0;
  function throttled(fn) {
    return new Promise((resolve) => {
      queue.push(() => fn().then(resolve, () => resolve(null)).finally(() => { active--; next(); }));
      next();
    });
  }
  function next() { while (active < 3 && queue.length) { active++; queue.shift()(); } }
  function fetchOne(title) {
    if (!photoCache.has(title)) {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`;
      photoCache.set(title, throttled(() => fetch(url)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          const t = j && j.thumbnail;
          if (!t || NOT_A_PHOTO.test(decodeURIComponent(t.source.split('/').pop()))) return null;
          return { src: t.source, page: j.content_urls && j.content_urls.desktop.page };
        })));
    }
    return photoCache.get(title);
  }
  async function fetchPhoto(titles) {
    for (const t of titles) { const p = await fetchOne(t); if (p) return p; }
    return null;
  }
  function photoHTML({ title, icon, alt, colors }) {
    const [c1, c2] = colors || ['#0b6e8a', '#9ad1d4'];
    return `<div class="photo" style="--c1:${c1};--c2:${c2}" ${title ? `data-wiki="${esc([].concat(title).join('|'))}"` : ''} data-alt="${esc(alt)}">
      <div class="fallback" aria-hidden="true">${icon || '📍'}</div>
      ${title ? '' : `<span class="unavailable">Illustration</span>`}
    </div>`;
  }
  function hydratePhotos(root) {
    root.querySelectorAll('.photo[data-wiki]:not([data-done])').forEach((el) => {
      el.dataset.done = '1';
      fetchPhoto(el.dataset.wiki.split('|')).then((p) => {
        if (!p) { el.insertAdjacentHTML('beforeend', '<span class="unavailable">Photo unavailable — illustration shown</span>'); return; }
        const img = new Image();
        img.alt = el.dataset.alt;
        img.loading = 'lazy';
        img.onload = () => { img.classList.add('loaded'); el.classList.add('has-img'); };
        img.onerror = () => { img.remove(); el.insertAdjacentHTML('beforeend', '<span class="unavailable">Photo unavailable — illustration shown</span>'); };
        img.src = p.src;
        el.prepend(img);
        if (p.page) el.insertAdjacentHTML('beforeend', `<a class="credit" href="${esc(p.page)}" target="_blank" rel="noopener">Photo: Wikipedia</a>`);
      });
    });
  }

  /* ---------------- Form ---------------- */
  const form = $('#trip-form');
  const destSel = $('#destination');
  destSel.insertAdjacentHTML('beforeend', Object.entries(DESTINATIONS)
    .map(([k, d]) => `<option value="${k}">${d.flag} ${esc(d.name)} — ${esc(d.route.join(', '))}</option>`).join(''));

  function readForm() {
    return { destination: destSel.value, days: $('#days').value, travelers: $('#travelers').value, budget: $('#budget').value };
  }
  function showErrors(errors) {
    ['destination', 'days', 'travelers', 'budget'].forEach((f) => {
      $(`#${f}-error`).textContent = errors[f] || '';
      $(`#${f}`).setAttribute('aria-invalid', errors[f] ? 'true' : 'false');
    });
  }
  function validateWithFriends(input) {
    const v = validateInput(input);
    const needed = state.friends.size + 1;
    if (!v.errors.travelers && v.values.travelers < needed) {
      v.errors.travelers = `You've added ${state.friends.size} friend(s) — travelers must be at least ${needed} (you + friends).`;
      v.valid = false;
    }
    return v;
  }

  function generate({ focusResults } = {}) {
    const input = readForm();
    const v = validateWithFriends(input);
    showErrors(v.errors);
    if (!v.valid) {
      const first = ['destination', 'days', 'travelers', 'budget'].find((f) => v.errors[f]);
      $(`#${first}`).focus();
      return false;
    }
    const res = generateItinerary({ ...input, transport: state.transport });
    state.result = res;
    state.stale = false;
    state.draft = state.draft ? { ...state.draft, ack: false } : null;
    renderResults();
    renderFriends();
    if (focusResults) $('#results h2').focus();
    return true;
  }

  form.addEventListener('submit', (e) => { e.preventDefault(); state.transport = {}; generate({ focusResults: true }); });
  form.addEventListener('input', () => {
    if (!state.result) return;
    state.stale = true;
    renderStaleNote();
    const btn = $('#to-checkout');
    if (btn) btn.disabled = true;
  });
  destSel.addEventListener('change', renderOverview);

  /* ---------------- Destination overview ---------------- */
  function renderOverview() {
    const key = destSel.value;
    const el = $('#overview');
    if (!key) {
      el.innerHTML = `<p class="placeholder">Choose a destination to see photos and the route we'll plan. Covered: ${Object.values(DESTINATIONS).map((d) => `${d.flag} ${esc(d.name)}`).join(' · ')}</p>`;
      return;
    }
    const d = DESTINATIONS[key];
    const gallery = d.activities.filter((_, i) => i % 4 === 0).slice(0, 4);
    el.innerHTML = `
      <div class="overview-hero">
        ${photoHTML({ title: HERO[key], icon: d.flag, alt: `${heroName(key)}, ${d.name}`, colors: d.colors })}
        <div>
          <h2><span class="flag" aria-hidden="true">${d.flag}</span> ${esc(d.name)}</h2>
          <p>${esc(d.tagline)}</p>
          <p class="hint">Our planned route (we cover these areas, not the whole country):</p>
          <ul class="route">${d.route.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
        </div>
      </div>
      <div class="gallery">
        ${gallery.map((a) => `<figure>${photoHTML({ title: a[4], icon: CATEGORY_ICON[a[2]], alt: a[0], colors: d.colors })}<figcaption>${esc(a[0])} · ${esc(a[1])}</figcaption></figure>`).join('')}
      </div>`;
    hydratePhotos(el);
  }

  /* ---------------- Results ---------------- */
  function renderStaleNote() {
    const n = $('#stale-note');
    if (n) n.hidden = !state.stale;
  }

  function partyHTML() {
    if (!state.friends.size) return '<p class="hint">Just you so far — invite friends from the panel.</p>';
    return `<ul class="party" aria-label="Friends on this trip">${[...state.friends].map((id) => {
      const f = FRIENDS.find((x) => x.id === id);
      return `<li>${avatar(f)} ${esc(f.name)} <button type="button" data-remove-friend="${f.id}" aria-label="Remove ${esc(f.name)} from trip">×</button></li>`;
    }).join('')}</ul>`;
  }

  function legHTML(leg) {
    return `<fieldset class="leg">
      <legend>🧭 Transportation: ${esc(leg.from)} → ${esc(leg.to)}</legend>
      <div class="leg-options">
        ${leg.options.map((o) => `
          <div class="leg-option">
            <input type="radio" id="leg-${leg.id}-${o.key}" name="leg-${leg.id}" value="${o.key}" data-leg="${leg.id}" ${o.key === leg.selected ? 'checked' : ''} />
            <label for="leg-${leg.id}-${o.key}">
              <span class="leg-icon" aria-hidden="true">${o.icon}</span>
              <span class="leg-main"><strong>${esc(o.label)}</strong>${o.note ? `<small>${esc(o.note)}</small>` : ''}</span>
              <span class="leg-meta">~${o.hours} h<br><strong>${usd(o.cost)}</strong>/person</span>
            </label>
          </div>`).join('')}
      </div>
    </fieldset>`;
  }

  function renderResults() {
    const r = state.result;
    const el = $('#results');
    if (!r) { el.innerHTML = ''; return; }
    const d = DESTINATIONS[r.destination.key];
    const c = r.cost;
    const legsCount = r.days_plan.reduce((n, x) => n + x.legs.length, 0);
    const summary = r.feasible ? `
      <span class="badge ok">Within budget · ${esc(c.tierName)} tier</span>
      <table class="cost-table" aria-label="Estimated cost breakdown">
        <tr><td>Accommodation (${c.rooms} room${c.rooms > 1 ? 's' : ''} × ${r.days} night${r.days > 1 ? 's' : ''})</td><td>${usd(c.breakdown.accommodation)}</td></tr>
        <tr><td>Food</td><td>${usd(c.breakdown.food)}</td></tr>
        <tr><td>Local transport</td><td>${usd(c.breakdown.transport)}</td></tr>
        <tr><td>Inter-city transportation (${legsCount} journey${legsCount === 1 ? '' : 's'})</td><td>${usd(c.breakdown.intercity)}</td></tr>
        <tr><td>Activities & entry fees</td><td>${usd(c.breakdown.activities)}</td></tr>
        <tr class="total"><td>Estimated group total</td><td>${usd(c.total)}</td></tr>
        <tr><td>Your budget · remaining</td><td>${usd(r.budget)} · ${usd(r.remaining)}</td></tr>
      </table>` : `
      <div class="alert" role="alert">
        <strong>Budget too low for this trip.</strong>
        <p>With your selected transportation, the lowest-cost (Budget tier) estimate is <strong>${usd(r.selectionMinimumTotal)}</strong> — you're short by <strong>${usd(r.shortfall)}</strong>.
        ${r.minimumTotal < r.selectionMinimumTotal ? `Choosing the cheapest transport lowers the minimum to ${usd(r.minimumTotal)}.` : ''}
        Increase the budget, shorten the trip, or reduce travelers. Checkout is unavailable until the trip fits the budget.</p>
      </div>`;

    el.innerHTML = `
      <div class="card">
        <p id="stale-note" class="alert" ${state.stale ? '' : 'hidden'}>Trip details changed — click <strong>Generate itinerary</strong> to update.</p>
        <div class="summary">
          <div>
            <h2 tabindex="-1">${r.destination.flag} ${r.days}-day ${esc(r.destination.name)} itinerary</h2>
            <p class="hint">${r.travelers} traveler${r.travelers > 1 ? 's' : ''} · Route: ${esc(r.destination.route.join(' → '))}</p>
            <p class="hint">🚇 Getting around locally: ${esc(r.localTransport)}</p>
            ${partyHTML()}
          </div>
        </div>
        ${summary}
        <p class="hint">Estimates are illustrative (USD, excluding international flights). Accommodation assumes 2 travelers per room. Transport prices are per person.</p>
        ${r.feasible ? `<button type="button" class="primary" id="to-checkout" ${state.stale ? 'disabled' : ''}>Continue to checkout →</button>` : ''}
      </div>
      ${r.days_plan.map((day) => `
        <article class="card day" aria-labelledby="day-${day.day}">
          <div class="day-head">
            <h3 id="day-${day.day}">Day ${day.day} · ${esc(day.city)}</h3>
            ${day.legs.length ? `<span class="travel-note">🧭 ${day.legs.length} journey${day.legs.length > 1 ? 's' : ''} today</span>` : ''}
          </div>
          ${day.legs.map(legHTML).join('')}
          <div class="items">
            ${day.items.map((it) => it.type === 'logistics' ? `
              <div class="item logistics"><span class="ico" aria-hidden="true">${CATEGORY_ICON[it.category]}</span><div><h4>${esc(it.name)}</h4><p>${esc(it.description)}</p></div></div>` : `
              <div class="item">
                ${photoHTML({ title: it.wiki, icon: CATEGORY_ICON[it.category], alt: it.name, colors: d.colors })}
                <div class="item-body">
                  <h4>${esc(it.name)}</h4>
                  <p>${esc(it.description)}</p>
                  <div class="item-meta"><span>${esc(it.city)}</span><span>${it.cost ? `${usd(it.cost)}/person` : 'Free'}</span></div>
                </div>
              </div>`).join('')}
          </div>
        </article>`).join('')}`;
    hydratePhotos(el);
  }

  $('#results').addEventListener('change', (e) => {
    const radio = e.target.closest('input[type="radio"][data-leg]');
    if (!radio) return;
    state.transport[radio.dataset.leg] = radio.value;
    const id = radio.id;
    if (generate()) { const again = document.getElementById(id); if (again) again.focus(); }
  });
  $('#results').addEventListener('click', (e) => {
    const b = e.target.closest('[data-remove-friend]');
    if (b) toggleFriend(b.dataset.removeFriend);
  });

  /* ---------------- Friends ---------------- */
  const FRIENDS = [
    { id: 'f1', name: 'Maya Chen', from: 'Seattle', color: '#d9480f' },
    { id: 'f2', name: 'Liam O\'Connor', from: 'Dublin', color: '#2b8a3e' },
    { id: 'f3', name: 'Priya Natarajan', from: 'Austin', color: '#5f3dc4' },
    { id: 'f4', name: 'Diego Ramírez', from: 'Mexico City', color: '#1971c2' },
    { id: 'f5', name: 'Sofia Rossi', from: 'Chicago', color: '#c2255c' },
    { id: 'f6', name: 'Kenji Watanabe', from: 'Vancouver', color: '#0b7285' },
    { id: 'f7', name: 'Amara Okafor', from: 'London', color: '#e67700' },
    { id: 'f8', name: 'Noah Fischer', from: 'Denver', color: '#495057' },
    { id: 'f9', name: 'Zoe Martin', from: 'Toronto', color: '#862e9c' },
    { id: 'f10', name: 'Omar Haddad', from: 'Boston', color: '#087f5b' }
  ];
  const initials = (n) => n.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const avatar = (f) => `<span class="avatar" style="background:${f.color}" aria-hidden="true">${esc(initials(f.name))}</span>`;
  const friendStatus = $('#friend-status');

  function renderFriends() {
    const q = $('#friend-search').value.trim().toLowerCase();
    const list = FRIENDS.filter((f) => !q || f.name.toLowerCase().includes(q) || f.from.toLowerCase().includes(q));
    const hasTrip = !!state.result && !state.stale;
    const travelers = Number($('#travelers').value) || 0;
    const full = travelers >= LIMITS.maxTravelers;
    $('#friend-list').innerHTML = list.length ? list.map((f) => {
      const added = state.friends.has(f.id);
      const disabled = !added && (!hasTrip || full);
      return `<li>${avatar(f)}<div class="friend-info"><strong>${esc(f.name)}</strong><span>${esc(f.from)}${added ? ' · On this trip' : ''}</span></div>
        <button type="button" data-friend="${f.id}" class="${added ? 'added' : ''}" aria-pressed="${added}" ${disabled ? 'disabled' : ''}
          aria-label="${added ? `Remove ${esc(f.name)} from trip` : `Add ${esc(f.name)} to trip`}">${added ? '✓ Added' : '+ Add'}</button></li>`;
    }).join('') : '<li class="hint">No friends match your search.</li>';
    if (!state.result) friendStatus.textContent = 'Generate an itinerary first, then add friends to it.';
    else if (state.stale) friendStatus.textContent = 'Regenerate your itinerary to add or remove friends.';
    else if (full) friendStatus.textContent = `Group is at the ${LIMITS.maxTravelers}-traveler maximum.`;
  }

  function toggleFriend(id) {
    if (!state.result || state.stale) return;
    const f = FRIENDS.find((x) => x.id === id);
    const travelersEl = $('#travelers');
    const n = Number(travelersEl.value);
    if (state.friends.has(id)) {
      state.friends.delete(id);
      travelersEl.value = String(Math.max(1, n - 1));
      generate();
      friendStatus.textContent = `${f.name} removed. Trip now has ${travelersEl.value} traveler(s); costs updated.`;
    } else {
      if (n >= LIMITS.maxTravelers) return;
      state.friends.add(id);
      travelersEl.value = String(n + 1);
      generate();
      friendStatus.textContent = `${f.name} added to your ${state.result.destination.name} trip (demo — no invitation sent). Now ${travelersEl.value} travelers; costs updated.`;
    }
    const btn = document.querySelector(`[data-friend="${id}"]`);
    if (btn) btn.focus();
  }

  $('#friend-list').addEventListener('click', (e) => {
    const b = e.target.closest('[data-friend]');
    if (b && !b.disabled) toggleFriend(b.dataset.friend);
  });
  $('#friend-search').addEventListener('input', renderFriends);
  form.addEventListener('input', renderFriends);

  /* ---------------- Checkout & confirmation pages ---------------- */
  const PAY = [
    { key: 'card', label: 'Credit / debit card', icon: '💳' },
    { key: 'paypal', label: 'PayPal', icon: '🅿️' },
    { key: 'applepay', label: 'Apple Pay', icon: '' }
  ];
  const pages = { planner: $('#main'), checkout: $('#checkout-page'), confirmation: $('#confirmation-page') };
  const fmtDate = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = () => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; };

  function showPage(name) {
    Object.entries(pages).forEach(([k, el]) => { el.hidden = k !== name; });
    window.scrollTo(0, 0);
    const h = pages[name].querySelector('h1, h2');
    if (h) { h.setAttribute('tabindex', '-1'); h.focus(); }
  }
  const steps = (current) => `<ol class="steps" aria-label="Booking progress">
    ${['Plan', 'Checkout', 'Confirmation'].map((s, i) => `<li ${i === current ? 'aria-current="step"' : ''} class="${i < current ? 'done' : ''}">${i + 1}. ${s}</li>`).join('')}
  </ol>`;

  function costRows(r) {
    const c = r.cost.breakdown;
    return `<table class="cost-table">
      <tr><td>Accommodation</td><td>${usd(c.accommodation)}</td></tr>
      <tr><td>Food</td><td>${usd(c.food)}</td></tr>
      <tr><td>Local transport</td><td>${usd(c.transport)}</td></tr>
      <tr><td>Inter-city transportation</td><td>${usd(c.intercity)}</td></tr>
      <tr><td>Activities & entry fees</td><td>${usd(c.activities)}</td></tr>
      <tr class="total"><td>Total (USD)</td><td>${usd(r.cost.total)}</td></tr>
    </table>`;
  }
  function partyNames() {
    return [...state.friends].map((id) => FRIENDS.find((f) => f.id === id).name);
  }

  function openCheckout() {
    const r = state.result;
    if (!r || !r.feasible || state.stale) return;
    const el = pages.checkout;
    const minDate = isoDate(addDays(today(), 1));
    const draft = state.draft || { lead: '', start: isoDate(addDays(today(), 30)), payment: 'card', ack: false };
    state.draft = draft;
    const friends = partyNames();
    el.innerHTML = `
      ${steps(1)}
      <h1 id="checkout-title">Checkout — book your trip</h1>
      <div class="checkout-grid">
        <form id="checkout-form" class="card" novalidate>
          <p class="demo-flag">⚠️ Demo booking. No card numbers or payment credentials are collected, no payment provider is contacted, no money is charged and no real reservations are made.</p>
          <div class="field">
            <label for="lead">Lead traveler name</label>
            <input id="lead" name="lead" autocomplete="name" value="${esc(draft.lead)}" aria-describedby="lead-error" />
            <p class="error" id="lead-error"></p>
          </div>
          <div class="field">
            <label for="start">Trip start date</label>
            <input id="start" name="start" type="date" min="${minDate}" value="${esc(draft.start)}" aria-describedby="start-error" />
            <p class="error" id="start-error"></p>
          </div>
          <fieldset class="pay-options">
            <legend>Payment option</legend>
            ${PAY.map((p) => `<div class="pay-option">
              <input type="radio" name="pay" id="pay-${p.key}" value="${p.key}" ${p.key === draft.payment ? 'checked' : ''} />
              <label for="pay-${p.key}"><span aria-hidden="true">${p.icon}</span>${esc(p.label)}</label></div>`).join('')}
          </fieldset>
          <label class="check" for="ack"><input type="checkbox" id="ack" ${draft.ack ? 'checked' : ''} aria-describedby="ack-error" /> I understand this is a simulated booking and no money will be charged.</label>
          <p class="error" id="ack-error"></p>
          <div class="checkout-actions">
            <button type="button" class="secondary" id="back-to-plan">← Back to itinerary</button>
            <button type="submit" class="primary" id="book-btn">Book trip — ${usd(r.cost.total)}</button>
          </div>
        </form>
        <aside class="card" aria-labelledby="order-title">
          <h2 id="order-title">${r.destination.flag} Trip summary</h2>
          <p><strong>${r.days}-day ${esc(r.destination.name)}</strong> · ${esc(r.cost.tierName)} tier<br>
          <span class="hint">${esc(r.destination.route.join(' → '))}</span></p>
          <p>${r.travelers} traveler${r.travelers > 1 ? 's' : ''}${friends.length ? ` — you + ${friends.map(esc).join(', ')}` : ''}</p>
          ${costRows(r)}
          <p class="hint">${usd(r.cost.total / r.travelers)} per person · excludes international flights · illustrative estimate</p>
        </aside>
      </div>`;
    showPage('checkout');
  }

  function readDraft() {
    state.draft = {
      lead: $('#lead').value,
      start: $('#start').value,
      payment: (document.querySelector('input[name="pay"]:checked') || {}).value || 'card',
      ack: $('#ack').checked
    };
    return state.draft;
  }

  document.addEventListener('click', (e) => {
    if (e.target.closest('#to-checkout')) openCheckout();
    if (e.target.closest('#back-to-plan')) { if ($('#lead')) readDraft(); showPage('planner'); }
    if (e.target.closest('#new-trip')) resetAll();
    if (e.target.closest('#print-booking')) window.print();
  });

  pages.checkout.addEventListener('change', (e) => {
    if (e.target.name === 'pay') {
      readDraft();
      $('#book-btn').textContent = `Book trip with ${PAY.find((p) => p.key === state.draft.payment).label} — ${usd(state.result.cost.total)}`;
    }
  });

  pages.checkout.addEventListener('submit', (e) => {
    e.preventDefault();
    const d = readDraft();
    const errors = {};
    if (!d.lead.trim()) errors.lead = 'Enter the lead traveler\'s name.';
    else if (d.lead.trim().length > 80) errors.lead = 'Use 80 characters or fewer.';
    const start = d.start ? new Date(`${d.start}T00:00:00`) : null;
    if (!start || Number.isNaN(start.getTime())) errors.start = 'Choose a start date.';
    else if (start <= today()) errors.start = 'Choose a date after today.';
    if (!d.ack) errors.ack = 'Please confirm you understand this is a simulated booking.';
    ['lead', 'start', 'ack'].forEach((f) => {
      $(`#${f}-error`).textContent = errors[f] || '';
      $(`#${f}`).setAttribute('aria-invalid', errors[f] ? 'true' : 'false');
    });
    const first = ['lead', 'start', 'ack'].find((f) => errors[f]);
    if (first) { $(`#${first}`).focus(); return; }

    const r = state.result;
    state.booking = {
      ref: 'WP-' + Math.random().toString(36).slice(2, 8).toUpperCase(),
      bookedAt: new Date(),
      lead: d.lead.trim(),
      start,
      end: addDays(start, r.days - 1),
      payment: PAY.find((p) => p.key === d.payment),
      friends: partyNames(),
      trip: r
    };
    renderConfirmation();
    showPage('confirmation');
  });

  function renderConfirmation() {
    const b = state.booking;
    const r = b.trip;
    const d = DESTINATIONS[r.destination.key];
    pages.confirmation.innerHTML = `
      ${steps(2)}
      <div class="card">
        <div class="confirm-hero">
          ${photoHTML({ title: HERO[r.destination.key], icon: r.destination.flag, alt: `${heroName(r.destination.key)}, ${r.destination.name}`, colors: d.colors })}
          <div>
            <p class="badge ok">✅ Booking confirmed (demo)</p>
            <h1 id="confirm-title">You're going to ${esc(r.destination.name)}! ${r.destination.flag}</h1>
            <p>Booking reference</p>
            <p class="ref">${esc(b.ref)}</p>
            <p class="hint">This is a simulated booking: no money was charged and no reservations were made with any provider.</p>
          </div>
        </div>
      </div>

      <div class="checkout-grid" style="margin-top:20px">
        <section class="card" aria-labelledby="booking-details-title">
          <h2 id="booking-details-title">Booking details</h2>
          <dl class="details">
            <dt>Lead traveler</dt><dd>${esc(b.lead)}</dd>
            <dt>Travelers</dt><dd>${r.travelers}${b.friends.length ? ` (incl. ${b.friends.map(esc).join(', ')})` : ''}</dd>
            <dt>Dates</dt><dd>${fmtDate(b.start)} – ${fmtDate(b.end)} (${r.days} day${r.days > 1 ? 's' : ''})</dd>
            <dt>Route</dt><dd>${esc(r.destination.route.join(' → '))}</dd>
            <dt>Comfort level</dt><dd>${esc(r.cost.tierName)} (${r.cost.rooms} room${r.cost.rooms > 1 ? 's' : ''})</dd>
            <dt>Payment option</dt><dd>${b.payment.icon} ${esc(b.payment.label)} (simulated)</dd>
            <dt>Booked on</dt><dd>${fmtDate(b.bookedAt)}</dd>
          </dl>
          ${costRows(r)}
        </section>
        <section class="card" aria-labelledby="overview-title">
          <h2 id="overview-title">Itinerary at a glance</h2>
          <ol class="timeline">
            ${r.days_plan.map((day) => {
              const sights = day.items.filter((i) => i.type !== 'logistics').map((i) => i.name.replace(/^Stroll: /, ''));
              const moves = day.legs.map((l) => {
                const o = l.options.find((x) => x.key === l.selected);
                return `<small>${o.icon} ${esc(l.from)} → ${esc(l.to)} by ${esc(o.label)} (~${o.hours} h)</small>`;
              }).join('');
              return `<li><span class="when">Day ${day.day}<br><small>${fmtDate(addDays(b.start, day.day - 1))}</small></span>
                <span class="what"><strong>${esc(day.city)}</strong>${moves}
                <small>${esc(sights.join(' · '))}</small></span></li>`;
            }).join('')}
          </ol>
        </section>
      </div>
      <div class="checkout-actions no-print">
        <button type="button" class="secondary" id="print-booking">🖨️ Print confirmation</button>
        <button type="button" class="primary" id="new-trip">Plan another trip</button>
      </div>`;
    hydratePhotos(pages.confirmation);
  }

  function resetAll() {
    state.result = null; state.friends.clear(); state.transport = {}; state.stale = false; state.draft = null; state.booking = null;
    form.reset();
    showErrors({});
    renderOverview();
    renderResults();
    renderFriends();
    showPage('planner');
  }

  renderOverview();
  renderFriends();
})();
