export const THREAT_LEVELS = [
  { id: 1, label: 'I', minTimeRatio: 0.66, moveMul: 1.0, damage: 8, hitCooldown: 0.8 },
  { id: 2, label: 'II', minTimeRatio: 0.33, moveMul: 1.22, damage: 10, hitCooldown: 0.68 },
  { id: 3, label: 'III', minTimeRatio: 0.0, moveMul: 1.4, damage: 12, hitCooldown: 0.56 },
];

export function createMissionState({ targetKills = 3, extractionRadius }) {
  return {
    targetKills,
    kills: 0,
    timeLimit: 75,
    timeLeft: 75,
    phase: 'prep', // prep | playing | result
    result: null, // win | lose | null
    lastLoseReason: null, // hp | time | null
    prepDuration: 2.8,
    prepLeft: 2.8,
    extractionRadius,
    extractionDuration: 2.6,
    extractionProgress: 0,
    extractionReady: false,
    extractionInside: false,
    extractionOutGraceDuration: 0.6,
    extractionOutGraceLeft: 0.6,
  };
}

export function createFeedbackFlags() {
  return {
    warned30: false,
    warned15: false,
    warnedLowHp: false,
    warnedThreat2: false,
    warnedThreat3: false,
  };
}

export function resetFeedbackFlags(flags) {
  flags.warned30 = false;
  flags.warned15 = false;
  flags.warnedLowHp = false;
  flags.warnedThreat2 = false;
  flags.warnedThreat3 = false;
}

export function resetMissionState(mission) {
  mission.kills = 0;
  mission.timeLeft = mission.timeLimit;
  mission.phase = 'prep';
  mission.result = null;
  mission.lastLoseReason = null;
  mission.prepLeft = mission.prepDuration;
  mission.extractionProgress = 0;
  mission.extractionReady = false;
  mission.extractionInside = false;
  mission.extractionOutGraceLeft = mission.extractionOutGraceDuration;
}

export function getThreatLevel(mission) {
  if (mission.phase !== 'playing') return THREAT_LEVELS[0];
  const ratio = mission.timeLeft / mission.timeLimit;
  if (ratio > THREAT_LEVELS[0].minTimeRatio) return THREAT_LEVELS[0];
  if (ratio > THREAT_LEVELS[1].minTimeRatio) return THREAT_LEVELS[1];
  return THREAT_LEVELS[2];
}
