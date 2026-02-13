import { MISSION_EFFECTS_CATALOG } from './catalog.js';

export function applyMissionAudioEffects({ events, beep, sfxStart, sfxWin, sfxLose }) {
  const audioCatalog = MISSION_EFFECTS_CATALOG.audio;

  for (const ev of events) {
    const cues = audioCatalog[ev.type];
    if (!cues) continue;

    for (const cue of cues) {
      const runCue = () => {
        if (cue.kind === 'beep') beep(cue.params);
        if (cue.kind === 'sfx' && cue.name === 'start') sfxStart();
        if (cue.kind === 'sfx' && cue.name === 'win') sfxWin();
        if (cue.kind === 'sfx' && cue.name === 'lose') sfxLose();
      };

      if (cue.delayMs) setTimeout(runCue, cue.delayMs);
      else runCue();
    }
  }
}
