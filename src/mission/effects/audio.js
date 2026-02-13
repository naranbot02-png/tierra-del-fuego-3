export function applyMissionAudioEffects({ events, beep, sfxStart, sfxWin, sfxLose }) {
  for (const ev of events) {
    if (ev.type === 'mission-started') sfxStart();

    if (ev.type === 'warn-threat-2') {
      beep({ freq: 560, duration: 0.06, type: 'triangle', gain: 0.024 });
    }

    if (ev.type === 'warn-threat-3') {
      beep({ freq: 300, duration: 0.08, type: 'sawtooth', gain: 0.03 });
      setTimeout(() => beep({ freq: 250, duration: 0.1, type: 'sawtooth', gain: 0.028 }), 80);
    }

    if (ev.type === 'warn-30') beep({ freq: 520, duration: 0.06, type: 'triangle', gain: 0.026 });

    if (ev.type === 'warn-15') {
      beep({ freq: 360, duration: 0.08, type: 'sawtooth', gain: 0.03 });
      setTimeout(() => beep({ freq: 280, duration: 0.1, type: 'sawtooth', gain: 0.028 }), 90);
    }

    if (ev.type === 'warn-low-hp') {
      beep({ freq: 200, duration: 0.08, type: 'square', gain: 0.03 });
    }

    if (ev.type === 'extraction-ready') {
      beep({ freq: 660, duration: 0.06, type: 'triangle', gain: 0.028 });
      setTimeout(() => beep({ freq: 920, duration: 0.07, type: 'triangle', gain: 0.028 }), 65);
    }

    if (ev.type === 'extraction-entered') {
      beep({ freq: 740, duration: 0.05, type: 'triangle', gain: 0.024 });
    }

    if (ev.type === 'extraction-grace-expired') {
      beep({ freq: 240, duration: 0.08, type: 'sawtooth', gain: 0.028 });
    }

    if (ev.type === 'mission-win') sfxWin();
    if (ev.type === 'mission-lose') sfxLose();
  }
}
