import test from 'node:test';
import assert from 'node:assert/strict';
import { stepExtractionProgress } from '../src/extraction.js';

test('inside extraction zone fills progress and restores grace timer', () => {
  const result = stepExtractionProgress({
    progress: 1.2,
    inside: true,
    dt: 0.4,
    duration: 2.6,
    decayRate: 0.72,
    outGraceLeft: 0.2,
    outGraceDuration: 0.6,
  });

  assert.equal(result.progress, 1.6);
  assert.equal(result.outGraceLeft, 0.6);
  assert.equal(result.inside, true);
});

test('outside zone keeps progress during grace window, then decays', () => {
  const stillGrace = stepExtractionProgress({
    progress: 1,
    inside: false,
    dt: 0.3,
    duration: 2.6,
    decayRate: 0.72,
    outGraceLeft: 0.6,
    outGraceDuration: 0.6,
  });

  assert.equal(stillGrace.progress, 1);
  assert.equal(stillGrace.outGraceLeft, 0.3);

  const decaying = stepExtractionProgress({
    progress: stillGrace.progress,
    inside: false,
    dt: 0.4,
    duration: 2.6,
    decayRate: 0.72,
    outGraceLeft: stillGrace.outGraceLeft,
    outGraceDuration: 0.6,
  });

  assert.equal(decaying.outGraceLeft, 0);
  assert.ok(decaying.progress < stillGrace.progress);
});
