import { stepExtractionProgress } from '../extraction.js';
import { getThreatLevel } from './state.js';

const EXTRACTION_DECAY_RATE = 0.72;

export function stepMissionCore({ mission, feedbackFlags, dt, playerHp, insideExtractionZone }) {
  const events = [];

  if (mission.phase === 'prep') {
    mission.prepLeft = Math.max(0, mission.prepLeft - dt);
    if (mission.prepLeft <= 0) {
      mission.phase = 'playing';
      events.push({ type: 'mission-started' });
    }
    return { events };
  }

  if (mission.phase !== 'playing') {
    return { events };
  }

  mission.timeLeft = Math.max(0, mission.timeLeft - dt);
  const threat = getThreatLevel(mission);

  if (!feedbackFlags.warnedThreat2 && threat.id >= 2) {
    feedbackFlags.warnedThreat2 = true;
    events.push({ type: 'warn-threat-2' });
  }
  if (!feedbackFlags.warnedThreat3 && threat.id >= 3) {
    feedbackFlags.warnedThreat3 = true;
    events.push({ type: 'warn-threat-3' });
  }
  if (!feedbackFlags.warned30 && mission.timeLeft <= 30) {
    feedbackFlags.warned30 = true;
    events.push({ type: 'warn-30' });
  }
  if (!feedbackFlags.warned15 && mission.timeLeft <= 15) {
    feedbackFlags.warned15 = true;
    events.push({ type: 'warn-15' });
  }
  if (!feedbackFlags.warnedLowHp && playerHp <= 25) {
    feedbackFlags.warnedLowHp = true;
    events.push({ type: 'warn-low-hp' });
  }

  if (!mission.extractionReady && mission.kills >= mission.targetKills) {
    mission.extractionReady = true;
    mission.extractionProgress = 0;
    mission.extractionInside = false;
    mission.extractionOutGraceLeft = mission.extractionOutGraceDuration;
    events.push({ type: 'extraction-ready' });
  }

  if (mission.extractionReady) {
    const wasInside = mission.extractionInside;
    const prevGraceLeft = mission.extractionOutGraceLeft;
    const hadProgress = mission.extractionProgress > 0;
    const extractionStep = stepExtractionProgress({
      progress: mission.extractionProgress,
      inside: insideExtractionZone,
      dt,
      duration: mission.extractionDuration,
      decayRate: EXTRACTION_DECAY_RATE,
      outGraceLeft: mission.extractionOutGraceLeft,
      outGraceDuration: mission.extractionOutGraceDuration,
    });

    mission.extractionProgress = extractionStep.progress;
    mission.extractionInside = extractionStep.inside;
    mission.extractionOutGraceLeft = extractionStep.outGraceLeft;

    const graceCriticalNow = !mission.extractionInside
      && hadProgress
      && mission.extractionOutGraceLeft > 0
      && mission.extractionOutGraceLeft <= 0.2
      && !feedbackFlags.warnedGraceCritical;
    if (graceCriticalNow) {
      feedbackFlags.warnedGraceCritical = true;
      events.push({ type: 'extraction-grace-critical' });
    }

    const graceExpiredNow = prevGraceLeft > 0 && mission.extractionOutGraceLeft <= 0;
    if (graceExpiredNow && hadProgress && !mission.extractionInside) {
      events.push({ type: 'extraction-grace-expired' });
    }

    const extractionProgressLostNow = hadProgress && mission.extractionProgress <= 0;
    if (extractionProgressLostNow) {
      events.push({ type: 'extraction-progress-lost' });
    }

    if (!wasInside && mission.extractionInside) {
      // Al reingresar, rearmamos la alerta para una próxima salida crítica.
      feedbackFlags.warnedGraceCritical = false;
      events.push({ type: 'extraction-entered' });
    }

    if (mission.extractionProgress >= mission.extractionDuration) {
      mission.phase = 'result';
      mission.result = 'win';
      events.push({ type: 'mission-win' });
      return { events };
    }
  }

  if (mission.timeLeft <= 0 || playerHp <= 0) {
    mission.phase = 'result';
    mission.result = 'lose';
    const reason = playerHp <= 0 ? 'hp' : 'time';
    mission.lastLoseReason = reason;
    events.push({ type: 'mission-lose', reason });
  }

  return { events };
}
