export function applyMissionTipEffects({ events, mission, isTouch, tipEl }) {
  if (!tipEl) return;

  for (const ev of events) {
    if (ev.type === 'mission-started') {
      tipEl.textContent = isTouch
        ? '¡Ventana táctica abierta! Stick al máximo = sprint táctico.'
        : '¡Ventana táctica abierta! Shift = sprint táctico.';
      tipEl.style.display = 'block';
      if (isTouch) setTimeout(() => { if (mission.phase === 'playing') tipEl.style.display = 'none'; }, 1000);
    }

    if (ev.type === 'warn-threat-2') {
      tipEl.textContent = 'Amenaza II: drones más agresivos.';
      tipEl.style.display = 'block';
      if (isTouch) setTimeout(() => { if (mission.phase === 'playing') tipEl.style.display = 'none'; }, 850);
    }

    if (ev.type === 'warn-threat-3') {
      tipEl.textContent = 'Amenaza III: máxima presión.';
      tipEl.style.display = 'block';
      if (isTouch) setTimeout(() => { if (mission.phase === 'playing') tipEl.style.display = 'none'; }, 1000);
    }

    if (ev.type === 'extraction-ready') {
      tipEl.textContent = 'Objetivo actualizado: volvé al faro para extraer.';
      tipEl.style.display = 'block';
      if (isTouch) setTimeout(() => { if (mission.phase === 'playing' && mission.extractionReady) tipEl.style.display = 'none'; }, 1100);
    }

    if (ev.type === 'extraction-grace-expired') {
      tipEl.textContent = 'Se perdió la cobertura del faro: la extracción cae.';
      tipEl.style.display = 'block';
      if (isTouch) setTimeout(() => { if (mission.phase === 'playing') tipEl.style.display = 'none'; }, 900);
    }

    if (ev.type === 'mission-win') {
      tipEl.textContent = 'Extracción confirmada. R para reiniciar.';
      tipEl.style.display = 'block';
    }

    if (ev.type === 'mission-lose') {
      tipEl.textContent = 'Misión fallida. R para reintentar.';
      tipEl.style.display = 'block';
    }
  }
}
