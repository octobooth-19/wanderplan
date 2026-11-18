const test = require('node:test');
const assert = require('node:assert/strict');
const FX = require('./fx.js');
const { DESTINATIONS } = require('./planner.js');

const response = (body, ok = true, status = 200) => async () => ({ ok, status, json: async () => body });

test('every destination maps to its local currency', () => {
  assert.deepEqual(
    Object.fromEntries(Object.keys(DESTINATIONS).map((k) => [k, FX.DEST_CURRENCY[k]])),
    { japan: 'JPY', italy: 'EUR', france: 'EUR', thailand: 'THB', greece: 'EUR', indonesia: 'IDR' }
  );
});

test('amount parsing accepts dollar formatting and rejects invalid or huge values', () => {
  assert.deepEqual(FX.parseAmount(' $1,500.50 '), { ok: true, amount: 1500.5 });
  assert.deepEqual(FX.parseAmount('.5'), { ok: true, amount: 0.5 });
  for (const bad of ['', 'abc', '-5', '1e3', 'Infinity', '1.2.3', '1000000001']) {
    assert.equal(FX.parseAmount(bad).ok, false, bad);
  }
});

test('converts from USD and CAD using the supplied rates', () => {
  for (const base of FX.BASES) {
    const rates = FX.FALLBACK.rates[base];
    const rows = FX.convertAll(250, base, rates);
    assert.deepEqual(rows.map((r) => r.code), ['JPY', 'EUR', 'THB', 'IDR']);
    for (const r of rows) assert.equal(r.value, 250 * rates[r.code]);
  }
  assert.throws(() => FX.convertAll(1, 'GBP', {}), /Unsupported/);
});

test('uses valid live rates and falls back on network, HTTP or incomplete data errors', async () => {
  const live = { date: '2026-11-19', rates: { JPY: 160, EUR: 0.9, THB: 34, IDR: 18000 } };
  let url;
  const ok = await FX.getRates('CAD', async (u) => { url = u; return response(live)(); });
  assert.match(url, /base=CAD&symbols=JPY,EUR,THB,IDR/);
  assert.deepEqual(ok, { rates: live.rates, date: live.date, live: true });

  for (const fetchFn of [
    async () => { throw new Error('offline'); },
    response({}, false, 503),
    response({ date: 'x', rates: { JPY: 160 } })
  ]) {
    const r = await FX.getRates('USD', fetchFn);
    assert.equal(r.live, false);
    assert.deepEqual(r.rates, FX.FALLBACK.rates.USD);
    assert.ok(r.error);
  }
});
