export function applyMissionEffects({ events, mission, isTouch, tipEl, beep, sfxStart, sfxWin, sfxLose, vibrate }) {
  for (const ev of events) {
    if (ev.type === 'mission-started') {
      sfxStart();
      if (tipEl) {
        tipEl.textContent = isTouch
          ? '¡Ventana táctica abierta! Stick al máximo = sprint táctico.'
          : '¡Ventana táctica abierta! Shift = sprint táctico.';
        tipEl.style.display = 'block';
        if (isTouch) setTimeout(() => { if (mission.phase === 'playing') tipEl.style.display = 'none'; }, 1000);
      }
    }

    if (ev.type === 'warn-threat-2') {
      beep({ freq: 560, duration: 0.06, type: 'triangle', gain: 0.024 });
      if (tipEl) {
        tipEl.textContent = 'Amenaza II: drones más agresivos.';
        tipEl.style.display = 'block';
        if (isTouch) setTimeout(() => { if (mission.phase === 'playing') tipEl.style.display = 'none'; }, 850);
      }
    }

    if (ev.type === 'warn-threat-3') {
      beep({ freq: 300, duration: 0.08, type: 'sawtooth', gain: 0.03 });
      setTimeout(() => beep({ freq: 250, duration: 0.1, type: 'sawtooth', gain: 0.028 }), 80);
      if (isTouch) vibrate?.([16, 44, 16]);
      if (tipEl) {
        tipEl.textContent = 'Amenaza III: máxima presión.';
        tipEl.style.display = 'block';
        if (isTouch) setTimeout(() => { if (mission.phase === 'playing') tipEl.style.display = 'none'; }, 1000);
      }
    }

    if (ev.type === 'warn-30') beep({ freq: 520, duration: 0.06, type: 'triangle', gain: 0.026 });
    if (ev.type === 'warn-15') {
      beep({ freq: 360, duration: 0.08, type: 'sawtooth', gain: 0.03 });
      setTimeout(() => beep({ freq: 280, duration: 0.1, type: 'sawtooth', gain: 0.028 }), 90);
    }
    if (ev.type === 'warn-low-hp') {
      beep({ freq: 200, duration: 0.08, type: 'square', gain: 0.03 });
      if (isTouch) vibrate?.([20, 60, 20]);
    }

    if (ev.type === 'extraction-ready') {
      beep({ freq: 660, duration: 0.06, type: 'triangle', gain: 0.028 });
      setTimeout(() => beep({ freq: 920, duration: 0.07, type: 'triangle', gain: 0.028 }), 65);
      if (isTouch) vibrate?.(18);
      if (tipEl) {
        tipEl.textContent = 'Objetivo actualizado: volvé al faro para extraer.';
        tipEl.style.display = 'block';
        if (isTouch) setTimeout(() => { if (mission.phase === 'playing' && mission.extractionReady) tipEl.style.display = 'none'; }, 1100);
      }
    }

    if (ev.type === 'extraction-entered') {
      beep({ freq: 740, duration: 0.05, type: 'triangle', gain: 0.024 });
      if (isTouch) vibrate?.(12);
    }

    if (ev.type === 'extraction-grace-expired') {
      beep({ freq: 240, duration: 0.08, type: 'sawtooth', gain: 0.028 });
      if (tipEl) {
        tipEl.textContent = 'Se perdió la cobertura del faro: la extracción cae.';
        tipEl.style.display = 'block';
        if (isTouch) setTimeout(() => { if (mission.phase === 'playing') tipEl.style.display = 'none'; }, 900);
      }
    }

    if (ev.type === 'mission-win') {
      sfxWin();
      if (tipEl) {
        tipEl.textContent = 'Extracción confirmada. R para reiniciar.';
        tipEl.style.display = 'block';
      }
    }

    if (ev.type === 'mission-lose') {
      sfxLose();
      if (tipEl) {
        tipEl.textContent = 'Misión fallida. R para reintentar.';
        tipEl.style.display = 'block';
      }
    }
  }
}
