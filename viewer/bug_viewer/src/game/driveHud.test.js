import test from 'node:test';
import assert from 'node:assert/strict';
import { driveHudHtml } from './driveHud.js';
test('the drive HUD shows speed, gear, fuel and warning chips; red near the redline; low fuel flagged', () => {
  const h = driveHudHtml({ mph: 41.6, topMph: 80, gear: 3, rpm: 5400, redline: 5600, fuel: 3, tank: 30, fuelWord: 'LOW', surface: 'sand', flags: [['SLIDING', 'warn']], foot: 'Iron Flats' });
  assert.match(h, /<b>42<\/b>/); assert.match(h, /dg-gear[^>]*>3</); assert.match(h, /dg-rev red/); assert.match(h, /dg-fuel low/); assert.match(h, /dg-chip warn">SLIDING/); assert.match(h, /Iron Flats/);
  assert.doesNotMatch(driveHudHtml({ mph: 0, topMph: 80, gear: 0, rpm: 0, redline: 5600, fuel: 30, tank: 30, surface: '' }), /dg-rev/);
});
