import test from 'node:test';
import assert from 'node:assert/strict';
import { createMissionEffectsOrchestrator } from '../src/mission/effects.js';

test('orquestador despacha eventos a audio/ui-tip/haptics adapters', () => {
  const calls = [];

  const orchestrator = createMissionEffectsOrchestrator({
    audioAdapter: (payload) => calls.push({ name: 'audio', payload }),
    tipAdapter: (payload) => calls.push({ name: 'tip', payload }),
    hapticsAdapter: (payload) => calls.push({ name: 'haptics', payload }),
  });

  const mission = { phase: 'playing' };
  const events = [{ type: 'warn-threat-3' }, { type: 'extraction-ready' }];
  const tipEl = { textContent: '', style: { display: 'none' } };
  const vibrate = () => {};

  orchestrator({
    events,
    mission,
    isTouch: true,
    tipEl,
    beep: () => {},
    sfxStart: () => {},
    sfxWin: () => {},
    sfxLose: () => {},
    vibrate,
  });

  assert.equal(calls.length, 3);
  assert.equal(calls[0].name, 'audio');
  assert.equal(calls[1].name, 'tip');
  assert.equal(calls[2].name, 'haptics');

  assert.deepEqual(calls[0].payload.events, events);
  assert.deepEqual(calls[1].payload.events, events);
  assert.deepEqual(calls[2].payload.events, events);
  assert.equal(calls[1].payload.mission, mission);
  assert.equal(calls[1].payload.tipEl, tipEl);
  assert.equal(calls[2].payload.isTouch, true);
  assert.equal(calls[2].payload.vibrate, vibrate);
});
