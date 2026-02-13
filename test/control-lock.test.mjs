import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldAutoRunCalibration } from '../src/input/control-lock.js';

test('no auto wizard when lock stable is on', () => {
  assert.equal(shouldAutoRunCalibration({ isTouch: true, calibrated: false, lockStable: true }), false);
});

test('auto wizard only when touch + uncalibrated + unlocked', () => {
  assert.equal(shouldAutoRunCalibration({ isTouch: true, calibrated: false, lockStable: false }), true);
  assert.equal(shouldAutoRunCalibration({ isTouch: false, calibrated: false, lockStable: false }), false);
  assert.equal(shouldAutoRunCalibration({ isTouch: true, calibrated: true, lockStable: false }), false);
});
