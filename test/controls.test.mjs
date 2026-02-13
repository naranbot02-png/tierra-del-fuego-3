import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeIntentAxes, getTouchIntentAxes } from '../src/input/intent.js';
import { intentToWorldDelta } from '../src/movement/transform.js';

test('normalizeIntentAxes clampa diagonal a magnitud <= 1', () => {
  const result = normalizeIntentAxes({ x: 1, y: 1 });
  const len = Math.hypot(result.x, result.y);

  assert.ok(len <= 1);
  assert.ok(Math.abs(len - 1) < 1e-12);
});

test('getTouchIntentAxes invierte Y (arriba UI = avanzar +Y intención)', () => {
  const result = getTouchIntentAxes({ moveX: 0.25, moveY: -0.8 });
  assert.equal(result.x, 0.25);
  assert.equal(result.y, 0.8);
});

test('intentToWorldDelta respeta yaw 0 y yaw 90', () => {
  const forwardYaw0 = intentToWorldDelta({
    state: { yaw: 0 },
    intentX: 0,
    intentY: 1,
    dt: 1,
    speed: 1,
  });
  assert.equal(forwardYaw0.worldX, 0);
  assert.equal(forwardYaw0.worldZ, -1);

  const forwardYaw90 = intentToWorldDelta({
    state: { yaw: Math.PI / 2 },
    intentX: 0,
    intentY: 1,
    dt: 1,
    speed: 1,
  });
  assert.ok(Math.abs(forwardYaw90.worldX - 1) < 1e-12);
  assert.ok(Math.abs(forwardYaw90.worldZ - 0) < 1e-12);
});
