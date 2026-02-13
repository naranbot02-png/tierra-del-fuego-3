import { MISSION_EFFECTS_CATALOG } from './catalog.js';

export function applyMissionHapticsEffects({ events, isTouch, vibrate }) {
  if (!isTouch || !vibrate) return;

  const hapticsCatalog = MISSION_EFFECTS_CATALOG.haptics;
  for (const ev of events) {
    const pattern = hapticsCatalog[ev.type];
    if (pattern != null) vibrate(pattern);
  }
}
