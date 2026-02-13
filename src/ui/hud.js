function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

export function setHudPhaseVisuals({ mission, missionStatusEl }) {
  if (!missionStatusEl) return;
  const phase = mission.phase;
  missionStatusEl.classList.remove('mission-prep', 'mission-live', 'mission-win', 'mission-lose');
  if (phase === 'prep') missionStatusEl.classList.add('mission-prep');
  if (phase === 'playing') missionStatusEl.classList.add('mission-live');
  if (phase === 'result' && mission.result === 'win') missionStatusEl.classList.add('mission-win');
  if (phase === 'result' && mission.result === 'lose') missionStatusEl.classList.add('mission-lose');
}

export function updateMissionMini({ mission, refs }) {
  const { missionMiniEl, missionMiniLabelEl, missionMiniFillEl } = refs;
  if (!missionMiniEl || !missionMiniLabelEl || !missionMiniFillEl) return;

  let label = 'Objetivo';
  let progress = 0;
  let tone = 'neutral';

  if (mission.phase === 'prep') {
    label = `Inicio en ${Math.ceil(mission.prepLeft)}s`;
    progress = 1 - (mission.prepLeft / mission.prepDuration);
  } else if (mission.phase === 'playing' && !mission.extractionReady) {
    label = `Drones ${mission.kills}/${mission.targetKills}`;
    progress = mission.targetKills > 0 ? (mission.kills / mission.targetKills) : 0;
    tone = 'combat';
  } else if (mission.phase === 'playing' && mission.extractionReady) {
    const extractionPct = Math.round((mission.extractionProgress / mission.extractionDuration) * 100);
    label = mission.extractionInside ? `Extracción ${extractionPct}%` : `Faro ${extractionPct}%`;
    progress = mission.extractionProgress / mission.extractionDuration;
    tone = 'extract';
  } else if (mission.result === 'win') {
    label = 'Misión completada';
    progress = 1;
    tone = 'win';
  } else {
    label = 'Misión fallida';
    progress = 0.04;
    tone = 'danger';
  }

  missionMiniEl.dataset.tone = tone;
  missionMiniLabelEl.textContent = label;
  missionMiniFillEl.style.width = `${Math.round(clamp01(progress) * 100)}%`;
}

export function renderHudText({ mission, hp, isTouch, threat, refs }) {
  const { missionStatusEl, missionObjectiveEl, missionTimerEl, hpEl } = refs;
  const extractionPct = Math.round((mission.extractionProgress / mission.extractionDuration) * 100);
  const mobileCopy = isTouch;
  const threatLabel = threat.label;
  const threatShort = `A-${threatLabel}`;

  if (missionStatusEl) {
    if (mission.phase === 'prep') {
      missionStatusEl.textContent = `Preparación ${Math.ceil(mission.prepLeft)}s`;
    } else if (mission.phase === 'playing') {
      missionStatusEl.textContent = mission.extractionReady
        ? (mission.extractionInside ? 'Extrayendo' : 'Evacuación')
        : 'En curso';
    } else {
      missionStatusEl.textContent = mission.result === 'win' ? 'Completada' : 'Fallida';
    }
  }

  if (missionObjectiveEl) {
    if (mission.phase === 'prep') {
      missionObjectiveEl.textContent = mobileCopy
        ? `Drones ${mission.targetKills} + faro`
        : `Objetivo: derribar ${mission.targetKills} drones y extraer en el faro`;
    } else if (mission.phase === 'playing' && mission.extractionReady) {
      const graceLeft = Math.max(0, mission.extractionOutGraceLeft);
      const inGrace = !mission.extractionInside && mission.extractionProgress > 0 && graceLeft > 0;
      const graceText = `${graceLeft.toFixed(1)}s`;

      if (mission.extractionInside) {
        missionObjectiveEl.textContent = mobileCopy
          ? `Extracción ${extractionPct}%`
          : `Sostené posición en el faro: ${extractionPct}%`;
      } else if (inGrace) {
        missionObjectiveEl.textContent = mobileCopy
          ? `Fuera de zona · mantiene ${graceText}`
          : `Fuera del faro: progreso protegido por ${graceText}`;
      } else {
        missionObjectiveEl.textContent = mobileCopy
          ? `Volvé al faro ${extractionPct}%`
          : `Volvé al faro para extraer: ${extractionPct}%`;
      }
    } else if (mission.phase === 'playing') {
      missionObjectiveEl.textContent = mobileCopy
        ? `Drones ${mission.kills}/${mission.targetKills} · ${threatShort}`
        : `Drones derribados: ${mission.kills}/${mission.targetKills} · Amenaza ${threatLabel}`;
    } else {
      missionObjectiveEl.textContent = mission.result === 'win'
        ? (mobileCopy ? 'Zona asegurada' : 'Resultado: zona asegurada')
        : (mobileCopy ? 'Sin tiempo/energía' : 'Resultado: sin tiempo o sin energía');
    }
  }

  if (missionTimerEl) {
    if (mission.phase === 'prep') {
      missionTimerEl.textContent = mobileCopy
        ? `T-${Math.ceil(mission.prepLeft)}s`
        : `Inicio en: ${Math.ceil(mission.prepLeft)}s`;
    } else if (mission.phase === 'playing') {
      const timeCompact = `${Math.ceil(mission.timeLeft)}s`;
      if (mission.extractionReady) {
        const graceLeft = Math.max(0, mission.extractionOutGraceLeft);
        const inGrace = !mission.extractionInside && mission.extractionProgress > 0 && graceLeft > 0;
        const graceTag = inGrace ? ` · hold ${graceLeft.toFixed(1)}s` : '';
        missionTimerEl.textContent = mobileCopy
          ? `${timeCompact} · ${threatShort}${inGrace ? ` · ${graceLeft.toFixed(1)}s` : ''}`
          : `Tiempo: ${timeCompact} · Amenaza ${threatLabel}${graceTag}`;
      } else {
        missionTimerEl.textContent = mobileCopy ? timeCompact : `Tiempo: ${timeCompact}`;
      }
    } else {
      missionTimerEl.textContent = mobileCopy ? '↻ Reiniciar' : 'Reiniciar: tecla R / botón ↻';
    }

    const criticalTime = mission.phase === 'playing' && mission.timeLeft <= 15;
    missionTimerEl.classList.toggle('timer-critical', criticalTime);
  }

  if (hpEl) {
    hpEl.textContent = String(hp);
    hpEl.classList.toggle('hp-critical', hp <= 25);
  }
}
