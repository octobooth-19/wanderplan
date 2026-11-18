const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('./planner.js');

const plan = (o) => P.generateItinerary({ destination: 'japan', days: '5', travelers: '2', budget: '100000', ...o });

test('every destination fills 1–14 days without repeating attractions, with transport for each move', () => {
  for (const destination of Object.keys(P.DESTINATIONS)) {
    for (let days = 1; days <= 14; days++) {
      const r = plan({ destination, days: String(days) });
      assert.equal(r.days_plan.length, days);
      const names = r.days_plan.flatMap((d) => d.items).filter((i) => i.type !== 'logistics').map((i) => i.name);
      assert.equal(new Set(names).size, names.length, `${destination} ${days}d repeats`);
      let city = null;
      for (const d of r.days_plan) {
        for (const it of d.items.filter((i) => i.type === 'attraction')) {
          if (city && it.city !== city) assert.ok(d.legs.some((l) => l.from === city && l.to === it.city), `${destination} ${days}d: no leg ${city}→${it.city}`);
          city = it.city;
        }
        for (const leg of d.legs) {
          assert.ok(leg.options.length >= 2, `${destination} leg ${leg.id} needs transport options`);
          assert.ok(leg.options.some((o) => o.key === leg.selected));
        }
      }
    }
  }
});

test('validation rejects out-of-range, fractional and non-finite inputs', () => {
  for (const [field, value] of [['days', '0'], ['days', '15'], ['days', '2.5'], ['travelers', '0'], ['travelers', '21'],
    ['budget', '0'], ['budget', '-5'], ['budget', 'Infinity'], ['budget', 'abc'], ['destination', 'mars']]) {
    const r = plan({ [field]: value });
    assert.equal(r.ok, false, `${field}=${value}`);
    assert.ok(r.errors[field]);
  }
  assert.equal(plan({ days: '1', travelers: '1' }).ok, true);
  assert.equal(plan({ days: '14', travelers: '20' }).ok, true);
});

test('budget exactly at the minimum is feasible; one dollar less reports the shortfall', () => {
  const min = plan({ budget: '1' }).minimumTotal;
  const at = plan({ budget: String(min) });
  assert.equal(at.feasible, true);
  assert.equal(at.cost.total, min);
  const under = plan({ budget: String(min - 1) });
  assert.equal(under.feasible, false);
  assert.equal(under.shortfall, 1);
  assert.equal(under.cost, null);
});

test('chosen transport changes the inter-city cost and group total scales with travelers', () => {
  const base = plan({ days: '4', travelers: '3' });
  const leg = base.days_plan.flatMap((d) => d.legs)[0];
  const pricier = leg.options.reduce((m, o) => (o.cost > m.cost ? o : m));
  const changed = plan({ days: '4', travelers: '3', transport: { [leg.id]: pricier.key } });
  assert.ok(changed.cost.breakdown.intercity > base.cost.breakdown.intercity);
  const b = changed.cost.breakdown;
  assert.equal(changed.cost.total, b.accommodation + b.food + b.transport + b.intercity + b.activities);
  assert.ok(changed.cost.total <= changed.budget);
});
