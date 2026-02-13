import { applyMissionAudioEffects } from './effects/audio.js';
import { applyMissionTipEffects } from './effects/ui-tip.js';
import { applyMissionHapticsEffects } from './effects/haptics.js';

export function createMissionEffectsOrchestrator({
  audioAdapter = applyMissionAudioEffects,
  tipAdapter = applyMissionTipEffects,
  hapticsAdapter = applyMissionHapticsEffects,
} = {}) {
  return function applyMissionEffects({ events, mission, isTouch, tipEl, beep, sfxStart, sfxWin, sfxLose, vibrate }) {
    audioAdapter({ events, beep, sfxStart, sfxWin, sfxLose });
    tipAdapter({ events, mission, isTouch, tipEl });
    hapticsAdapter({ events, isTouch, vibrate });
  };
}

export const applyMissionEffects = createMissionEffectsOrchestrator();
