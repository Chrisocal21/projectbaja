import test from 'node:test';
import assert from 'node:assert/strict';
import { pickWork, toLocal } from './workTarget.js';

const car = (id, x, z, h = 0) => ({ id, pose: { x, z, h }, width: 1.6, length: 4.1 });

test('standing beside a car picks it; far away picks nothing', () => {
  assert.equal(pickWork({ x: 1.5, z: 0 }, [car('bug', 0, 0)])?.id, 'bug');
  assert.equal(pickWork({ x: 20, z: 0 }, [car('bug', 0, 0)]), null);
});
test('with two cars the nearer one wins', () => {
  const list = [car('bug', 0, 0), car('wreck', 3.4, 0)];
  assert.equal(pickWork({ x: 2.7, z: 0 }, list)?.id, 'wreck');
  assert.equal(pickWork({ x: 0.9, z: 0 }, list)?.id, 'bug');
});
test('a rotated car uses its own frame (left is +lx)', () => {
  const l = toLocal({ x: 0, z: 0, h: Math.PI / 2 }, 0, 2);   // 2 m along world +z of a car turned a quarter: that is sideways for it
  assert.ok(Math.abs(Math.abs(l.lx) - 2) < 1e-9 && Math.abs(l.lz) < 1e-9);
  assert.equal(pickWork({ x: 0, z: 1.8 }, [car('bug', 0, 0, Math.PI / 2)])?.id, 'bug');
});
test('vehicles without a pose (not in the world) are ignored', () => {
  assert.equal(pickWork({ x: 0, z: 0 }, [{ id: 'x', pose: null, width: 2, length: 4 }]), null);
});
