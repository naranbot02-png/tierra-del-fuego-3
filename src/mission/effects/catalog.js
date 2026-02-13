export const MISSION_TIP_PRIORITY = {
  LOW: 10,
  MEDIUM: 50,
  HIGH: 75,
  CRITICAL: 100,
};

export const MISSION_EFFECTS_CATALOG = {
  tips: {
    'mission-started': {
      mobile: '¡Ventana táctica abierta! Stick al máximo = sprint táctico.',
      desktop: '¡Ventana táctica abierta! Shift = sprint táctico.',
      durationMobileMs: 800,
      priority: MISSION_TIP_PRIORITY.MEDIUM,
    },
    'warn-threat-2': {
      text: 'Amenaza II: drones más agresivos.',
      durationMobileMs: 700,
      priority: MISSION_TIP_PRIORITY.MEDIUM,
    },
    'warn-threat-3': {
      text: 'Amenaza III: máxima presión.',
      durationMobileMs: 850,
      priority: MISSION_TIP_PRIORITY.HIGH,
    },
    'extraction-ready': {
      text: 'Objetivo actualizado: volvé al faro para extraer.',
      durationMobileMs: 950,
      priority: MISSION_TIP_PRIORITY.HIGH,
      hideWhen: (mission) => mission.phase !== 'playing' || !mission.extractionReady,
    },
    'extraction-grace-critical': {
      text: '¡Volvé al faro ya! Cobertura casi agotada.',
      durationMobileMs: 950,
      priority: MISSION_TIP_PRIORITY.CRITICAL,
    },
    'extraction-grace-expired': {
      text: 'Se perdió la cobertura del faro: la extracción cae.',
      durationMobileMs: 1100,
      priority: MISSION_TIP_PRIORITY.CRITICAL,
    },
    'mission-win': {
      text: 'Extracción confirmada. R para reiniciar.',
      persistent: true,
      priority: MISSION_TIP_PRIORITY.CRITICAL,
    },
    'mission-lose': {
      text: 'Misión fallida. R para reintentar.',
      persistent: true,
      priority: MISSION_TIP_PRIORITY.CRITICAL,
    },
  },
  audio: {
    'mission-started': [{ kind: 'sfx', name: 'start' }],
    'warn-threat-2': [{ kind: 'beep', params: { freq: 560, duration: 0.06, type: 'triangle', gain: 0.024 } }],
    'warn-threat-3': [
      { kind: 'beep', params: { freq: 300, duration: 0.08, type: 'sawtooth', gain: 0.03 } },
      { kind: 'beep', delayMs: 80, params: { freq: 250, duration: 0.1, type: 'sawtooth', gain: 0.028 } },
    ],
    'warn-30': [{ kind: 'beep', params: { freq: 520, duration: 0.06, type: 'triangle', gain: 0.026 } }],
    'warn-15': [
      { kind: 'beep', params: { freq: 360, duration: 0.08, type: 'sawtooth', gain: 0.03 } },
      { kind: 'beep', delayMs: 90, params: { freq: 280, duration: 0.1, type: 'sawtooth', gain: 0.028 } },
    ],
    'warn-low-hp': [{ kind: 'beep', params: { freq: 200, duration: 0.08, type: 'square', gain: 0.03 } }],
    'extraction-ready': [
      { kind: 'beep', params: { freq: 660, duration: 0.06, type: 'triangle', gain: 0.028 } },
      { kind: 'beep', delayMs: 65, params: { freq: 920, duration: 0.07, type: 'triangle', gain: 0.028 } },
    ],
    'extraction-entered': [{ kind: 'beep', params: { freq: 740, duration: 0.05, type: 'triangle', gain: 0.024 } }],
    'extraction-grace-critical': [{ kind: 'beep', params: { freq: 300, duration: 0.06, type: 'sawtooth', gain: 0.03 } }],
    'extraction-grace-expired': [{ kind: 'beep', params: { freq: 240, duration: 0.08, type: 'sawtooth', gain: 0.028 } }],
    'mission-win': [{ kind: 'sfx', name: 'win' }],
    'mission-lose': [{ kind: 'sfx', name: 'lose' }],
  },
  haptics: {
    'warn-threat-3': [16, 44, 16],
    'warn-low-hp': [20, 60, 20],
    'extraction-ready': 18,
    'extraction-entered': 12,
    'extraction-grace-critical': [12, 40, 12],
  },
};
