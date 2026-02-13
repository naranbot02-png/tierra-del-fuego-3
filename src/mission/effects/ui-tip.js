import { MISSION_EFFECTS_CATALOG, MISSION_TIP_PRIORITY } from './catalog.js';

let mobileTipLockUntil = 0;

function shouldHideTip(mission, tipDef) {
  if (!tipDef.hideWhen) return false;
  return tipDef.hideWhen(mission);
}

export function applyMissionTipEffects({ events, mission, isTouch, tipEl }) {
  if (!tipEl || events.length === 0) return;

  const tipCatalog = MISSION_EFFECTS_CATALOG.tips;
  const tipCandidates = events
    .map((ev) => ({ eventType: ev.type, tip: tipCatalog[ev.type] }))
    .filter((entry) => !!entry.tip)
    .sort((a, b) => (b.tip.priority ?? 0) - (a.tip.priority ?? 0));

  if (tipCandidates.length === 0) return;

  const chosen = tipCandidates[0];
  const tipDef = chosen.tip;
  const now = Date.now();

  // RC tuning: en mobile, suprimir tips de baja prioridad si uno reciente sigue vigente.
  if (isTouch && now < mobileTipLockUntil && (tipDef.priority ?? 0) < MISSION_TIP_PRIORITY.HIGH) {
    return;
  }

  let text = isTouch
    ? (tipDef.mobile || tipDef.text || tipDef.desktop)
    : (tipDef.desktop || tipDef.text || tipDef.mobile);

  if (chosen.eventType === 'mission-lose') {
    const loseEvent = events.find((ev) => ev.type === 'mission-lose');
    if (loseEvent?.reason === 'hp') text = 'Misión fallida: sin energía. R para reintentar.';
    if (loseEvent?.reason === 'time') text = 'Misión fallida: sin tiempo. R para reintentar.';
  }

  if (!text) return;

  tipEl.textContent = text;
  tipEl.style.display = 'block';

  if (tipDef.persistent) return;

  if (isTouch) {
    const duration = tipDef.durationMobileMs ?? 900;
    mobileTipLockUntil = now + duration;
    setTimeout(() => {
      if (!shouldHideTip(mission, tipDef)) tipEl.style.display = 'none';
    }, duration);
  }
}
