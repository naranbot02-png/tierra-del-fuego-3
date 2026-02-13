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

test('hold/grace: alerta crítica antes de expirar y luego decae progreso', () => {
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

  const criticalStep = stepMissionCore({
    mission,
    feedbackFlags,
    dt: 0.11,
    playerHp: 100,
    insideExtractionZone: false,
  });

  assert.ok(criticalStep.events.some((e) => e.type === 'extraction-grace-critical'));
  assert.ok(!criticalStep.events.some((e) => e.type === 'extraction-grace-expired'));

  const reenterStep = stepMissionCore({
    mission,
    feedbackFlags,
    dt: 0.01,
    playerHp: 100,
    insideExtractionZone: true,
  });
  assert.ok(reenterStep.events.some((e) => e.type === 'extraction-entered'));

  const criticalAgain = stepMissionCore({
    mission,
    feedbackFlags,
    dt: 0.45,
    playerHp: 100,
    insideExtractionZone: false,
  });
  assert.ok(criticalAgain.events.some((e) => e.type === 'extraction-grace-critical'));

  const expiredStep = stepMissionCore({
    mission,
    feedbackFlags,
    dt: 0.3,
    playerHp: 100,
    insideExtractionZone: false,
  });

  assert.equal(mission.extractionOutGraceLeft, 0);
  assert.ok(mission.extractionProgress < 1);
  assert.ok(expiredStep.events.some((e) => e.type === 'extraction-grace-expired'));
});

test('emite warn-threat-2 y warn-threat-3 en sus umbrales', () => {
  const mission = createMissionState({ targetKills: 3, extractionRadius: 6.5 });
  const feedbackFlags = createFeedbackFlags();
  mission.phase = 'playing';

  mission.timeLeft = 50;
  const threat2Step = stepMissionCore({
    mission,
    feedbackFlags,
    dt: 1,
    playerHp: 100,
    insideExtractionZone: false,
  });
  assert.ok(threat2Step.events.some((e) => e.type === 'warn-threat-2'));

  mission.timeLeft = 25;
  const threat3Step = stepMissionCore({
    mission,
    feedbackFlags,
    dt: 1,
    playerHp: 100,
    insideExtractionZone: false,
  });
  assert.ok(threat3Step.events.some((e) => e.type === 'warn-threat-3'));
});

test('ramas terminales: mission-win y mission-lose', () => {
  const missionWin = createMissionState({ targetKills: 3, extractionRadius: 6.5 });
  const flagsWin = createFeedbackFlags();
  missionWin.phase = 'playing';
  missionWin.extractionReady = true;
  missionWin.extractionProgress = 2.55;

  const winStep = stepMissionCore({
    mission: missionWin,
    feedbackFlags: flagsWin,
    dt: 0.1,
    playerHp: 100,
    insideExtractionZone: true,
  });
  assert.equal(missionWin.phase, 'result');
  assert.equal(missionWin.result, 'win');
  assert.ok(winStep.events.some((e) => e.type === 'mission-win'));

  const missionLose = createMissionState({ targetKills: 3, extractionRadius: 6.5 });
  const flagsLose = createFeedbackFlags();
  missionLose.phase = 'playing';
  missionLose.timeLeft = 0.05;

  const loseStep = stepMissionCore({
    mission: missionLose,
    feedbackFlags: flagsLose,
    dt: 0.1,
    playerHp: 100,
    insideExtractionZone: false,
  });
  assert.equal(missionLose.phase, 'result');
  assert.equal(missionLose.result, 'lose');
  assert.equal(missionLose.lastLoseReason, 'time');
  const loseEvent = loseStep.events.find((e) => e.type === 'mission-lose');
  assert.ok(loseEvent);
  assert.equal(loseEvent.reason, 'time');

  const missionLoseHp = createMissionState({ targetKills: 3, extractionRadius: 6.5 });
  const flagsLoseHp = createFeedbackFlags();
  missionLoseHp.phase = 'playing';

  const loseHpStep = stepMissionCore({
    mission: missionLoseHp,
    feedbackFlags: flagsLoseHp,
    dt: 0.1,
    playerHp: 0,
    insideExtractionZone: false,
  });
  const loseHpEvent = loseHpStep.events.find((e) => e.type === 'mission-lose');
  assert.ok(loseHpEvent);
  assert.equal(loseHpEvent.reason, 'hp');
  assert.equal(missionLoseHp.lastLoseReason, 'hp');
});
