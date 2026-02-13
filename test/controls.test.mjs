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

test('getTouchIntentAxes mapea up/down/left/right correctamente', () => {
  const up = getTouchIntentAxes({ moveX: 0, moveY: -1 });
  const down = getTouchIntentAxes({ moveX: 0, moveY: 1 });
  const left = getTouchIntentAxes({ moveX: -1, moveY: 0 });
  const right = getTouchIntentAxes({ moveX: 1, moveY: 0 });

  assert.deepEqual(up, { x: 0, y: 1 });
  assert.deepEqual(down, { x: 0, y: -1 });
  assert.equal(left.x, -1);
  assert.equal(Math.abs(left.y), 0);
  assert.equal(right.x, 1);
  assert.equal(Math.abs(right.y), 0);
});

test('intentToWorldDelta respeta yaw 0/90/180/270 para forward/back/strafe', () => {
  const EPS = 1e-12;
  const cases = [
    { yaw: 0, fwd: [0, -1], back: [0, 1], left: [-1, 0], right: [1, 0] },
    { yaw: Math.PI / 2, fwd: [1, 0], back: [-1, 0], left: [0, -1], right: [0, 1] },
    { yaw: Math.PI, fwd: [0, 1], back: [0, -1], left: [1, 0], right: [-1, 0] },
    { yaw: Math.PI * 1.5, fwd: [-1, 0], back: [1, 0], left: [0, 1], right: [0, -1] },
  ];

  for (const c of cases) {
    const fwd = intentToWorldDelta({ state: { yaw: c.yaw }, intentX: 0, intentY: 1, dt: 1, speed: 1 });
    const back = intentToWorldDelta({ state: { yaw: c.yaw }, intentX: 0, intentY: -1, dt: 1, speed: 1 });
    const left = intentToWorldDelta({ state: { yaw: c.yaw }, intentX: -1, intentY: 0, dt: 1, speed: 1 });
    const right = intentToWorldDelta({ state: { yaw: c.yaw }, intentX: 1, intentY: 0, dt: 1, speed: 1 });

    assert.ok(Math.abs(fwd.worldX - c.fwd[0]) < EPS && Math.abs(fwd.worldZ - c.fwd[1]) < EPS);
    assert.ok(Math.abs(back.worldX - c.back[0]) < EPS && Math.abs(back.worldZ - c.back[1]) < EPS);
    assert.ok(Math.abs(left.worldX - c.left[0]) < EPS && Math.abs(left.worldZ - c.left[1]) < EPS);
    assert.ok(Math.abs(right.worldX - c.right[0]) < EPS && Math.abs(right.worldZ - c.right[1]) < EPS);
  }
});
