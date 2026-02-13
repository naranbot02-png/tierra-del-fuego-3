export function applyMissionHapticsEffects({ events, isTouch, vibrate }) {
  if (!isTouch || !vibrate) return;

  for (const ev of events) {
    if (ev.type === 'warn-threat-3') vibrate([16, 44, 16]);
    if (ev.type === 'warn-low-hp') vibrate([20, 60, 20]);
    if (ev.type === 'extraction-ready') vibrate(18);
    if (ev.type === 'extraction-entered') vibrate(12);
  }
}
