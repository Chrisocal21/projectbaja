import test from 'node:test';
import assert from 'node:assert/strict';
import { driveHudHtml } from './driveHud.js';
test('the drive HUD shows speed, gear, fuel and warning chips; red near the redline; low fuel flagged', () => {
  const h = driveHudHtml({ mph: 41.6, topMph: 80, gear: 3, rpm: 5400, redline: 5600, fuel: 3, tank: 30, fuelWord: 'LOW', surface: 'sand', flags: [['SLIDING', 'warn']], foot: 'Iron Flats' });
  assert.match(h, /<b><s>0<\/s>42<\/b>/); assert.match(h, /dg-gear[^>]*>3</); assert.match(h, /dg-rev red/); assert.match(h, /dg-fuel low/); assert.match(h, /dg-chip warn">SLIDING/); assert.match(h, /Iron Flats/);
  assert.doesNotMatch(driveHudHtml({ mph: 0, topMph: 80, gear: 0, rpm: 0, redline: 5600, fuel: 30, tank: 30, surface: '' }), /dg-rev/);
});

test('the instrument cluster shows real wear readings and warning states', () => {
  const h = driveHudHtml({ mph: 28, topMph: 90, gear: 2, rpm: 3200, redline: 5600, fuel: 15, tank: 30, cond: [
    { label: 'TEMP', frac: .8, note: '118°C', level: 'warn' },
    { label: 'TIRES', frac: .2, note: '1 FLAT · 22 PSI', level: 'bad' },
  ] });
  assert.match(h, /dg-health-item warn/);
  assert.match(h, /dg-health-item bad/);
  assert.match(h, /TIRES: 1 FLAT · 22 PSI/);
});
