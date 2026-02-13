import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldAutoRunCalibration } from '../src/input/control-lock.js';

function computeDamagePerMinute(totalDamage, playingSeconds) {
  return Math.round((totalDamage / Math.max(1, playingSeconds)) * 60);
}

test('no auto wizard when lock stable is on', () => {
  assert.equal(shouldAutoRunCalibration({ isTouch: true, calibrated: false, lockStable: true }), false);
});

test('auto wizard only when touch + uncalibrated + unlocked', () => {
  assert.equal(shouldAutoRunCalibration({ isTouch: true, calibrated: false, lockStable: false }), true);
  assert.equal(shouldAutoRunCalibration({ isTouch: false, calibrated: false, lockStable: false }), false);
  assert.equal(shouldAutoRunCalibration({ isTouch: true, calibrated: true, lockStable: false }), false);
});

test('damage per minute metric is stable with short runs', () => {
  assert.equal(computeDamagePerMinute(120, 60), 120);
  assert.equal(computeDamagePerMinute(30, 0), 1800); // evita división por cero
});
