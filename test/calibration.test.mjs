import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveCalibrationResult } from '../src/input/calibration.js';

test('calibración detecta inversión Y cuando "arriba" llega positiva', () => {
  const r = resolveCalibrationResult({
    avgX: 0.4,
    avgY: 0.6,
    countX: 8,
    countY: 8,
    prev: { invertX: false, invertY: false },
  });

  assert.equal(r.invertX, false);
  assert.equal(r.invertY, true);
});

test('calibración conserva previo si no hay muestras suficientes', () => {
  const r = resolveCalibrationResult({
    avgX: 0,
    avgY: 0,
    countX: 1,
    countY: 1,
    prev: { invertX: true, invertY: false },
  });

  assert.deepEqual(r, { invertX: true, invertY: false });
});
