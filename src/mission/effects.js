import { applyMissionAudioEffects } from './effects/audio.js';
import { applyMissionTipEffects } from './effects/ui-tip.js';
import { applyMissionHapticsEffects } from './effects/haptics.js';

export function applyMissionEffects({ events, mission, isTouch, tipEl, beep, sfxStart, sfxWin, sfxLose, vibrate }) {
  applyMissionAudioEffects({ events, beep, sfxStart, sfxWin, sfxLose });
  applyMissionTipEffects({ events, mission, isTouch, tipEl });
  applyMissionHapticsEffects({ events, isTouch, vibrate });
}
