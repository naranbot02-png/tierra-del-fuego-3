import test from 'node:test';
import assert from 'node:assert/strict';
import { createMissionState, createFeedbackFlags } from '../src/mission/state.js';
import { stepMissionCore } from '../src/mission/core.js';

test('transición a extracción cuando kills alcanzan target', () => {
  const mission = createMissionState({ targetKills: 3, extractionRadius: 6.5 });
  const feedbackFlags = createFeedbackFlags();

  mission.phase = 'playing';
  mission.kills = 3;

  const { events } = stepMissionCore({
    mission,
    feedbackFlags,
    dt: 0.016,
    playerHp: 100,
    insideExtractionZone: false,
  });

  assert.equal(mission.extractionReady, true);
  assert.equal(mission.extractionProgress, 0);
  assert.ok(events.some((e) => e.type === 'extraction-ready'));
});

test('hold/grace: fuera del faro mantiene y luego decae progreso', () => {
  const mission = createMissionState({ targetKills: 3, extractionRadius: 6.5 });
  const feedbackFlags = createFeedbackFlags();

  mission.phase = 'playing';
  mission.extractionReady = true;
  mission.extractionProgress = 1;
  mission.extractionOutGraceLeft = 0.6;

  stepMissionCore({
    mission,
    feedbackFlags,
    dt: 0.3,
    playerHp: 100,
    insideExtractionZone: false,
  });

  assert.equal(mission.extractionProgress, 1);
  assert.equal(mission.extractionOutGraceLeft, 0.3);

  const { events } = stepMissionCore({
    mission,
    feedbackFlags,
    dt: 0.4,
    playerHp: 100,
    insideExtractionZone: false,
  });

  assert.equal(mission.extractionOutGraceLeft, 0);
  assert.ok(mission.extractionProgress < 1);
  assert.ok(events.some((e) => e.type === 'extraction-grace-expired'));
});
