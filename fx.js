/* Currency conversion for destination currencies. Works in the browser (window.FX) and Node (require). */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FX = api;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const BASES = ['USD', 'CAD'];
  const CURRENCIES = {
    JPY: { name: 'Japanese yen', destinations: ['japan'] },
    EUR: { name: 'Euro', destinations: ['italy', 'france', 'greece'] },
    THB: { name: 'Thai baht', destinations: ['thailand'] },
    IDR: { name: 'Indonesian rupiah', destinations: ['indonesia'] }
  };
  const DEST_CURRENCY = Object.fromEntries(Object.entries(CURRENCIES)
    .flatMap(([code, c]) => c.destinations.map((d) => [d, code])));

  // ECB reference rates (via Frankfurter) used when live rates can't be fetched.
  const FALLBACK = {
    date: '2026-11-18',
    rates: {
      USD: { JPY: 159.42, EUR: 0.91174, THB: 33.975, IDR: 18254 },
      CAD: { JPY: 111.44, EUR: 0.63735, THB: 23.75, IDR: 12760 }
    }
  };
  const MAX_AMOUNT = 1e9;

  function parseAmount(value) {
    const text = String(value ?? '').trim().replace(/[$,\s]/g, '');
    if (!/^\d+(\.\d+)?$|^\.\d+$/.test(text)) return { ok: false, error: 'Enter an amount, e.g. 250 or 1,500.50.' };
    const amount = Number(text);
    if (amount > MAX_AMOUNT) return { ok: false, error: 'Enter an amount up to 1,000,000,000.' };
    return { ok: true, amount };
  }

  function convertAll(amount, base, rates) {
    if (!BASES.includes(base)) throw new Error(`Unsupported base currency: ${base}`);
    return Object.keys(CURRENCIES).map((code) => ({
      code,
      name: CURRENCIES[code].name,
      destinations: CURRENCIES[code].destinations,
      rate: rates[code],
      value: amount * rates[code]
    }));
  }

  async function fetchRates(base, fetchFn = fetch) {
    if (!BASES.includes(base)) throw new Error(`Unsupported base currency: ${base}`);
    const symbols = Object.keys(CURRENCIES).join(',');
    const res = await fetchFn(`https://api.frankfurter.dev/v1/latest?base=${base}&symbols=${symbols}`);
    if (!res.ok) throw new Error(`Rate service returned ${res.status}`);
    const json = await res.json();
    const valid = json && json.rates && Object.keys(CURRENCIES)
      .every((c) => Number.isFinite(json.rates[c]) && json.rates[c] > 0);
    if (!valid) throw new Error('Rate service returned incomplete rates');
    return { rates: json.rates, date: json.date, live: true };
  }

  async function getRates(base, fetchFn) {
    try {
      return await fetchRates(base, fetchFn);
    } catch (error) {
      return { rates: FALLBACK.rates[base], date: FALLBACK.date, live: false, error: error.message };
    }
  }

  return { BASES, CURRENCIES, DEST_CURRENCY, FALLBACK, parseAmount, convertAll, fetchRates, getRates };
});
