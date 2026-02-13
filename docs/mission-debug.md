# Mission Debug (rápido)

## Eventos principales del core (`stepMissionCore`)

- `mission-started`
- `warn-threat-2`
- `warn-threat-3`
- `warn-30`
- `warn-15`
- `warn-low-hp`
- `extraction-ready`
- `extraction-entered`
- `extraction-grace-expired`
- `mission-win`
- `mission-lose`

## Cómo inspeccionarlos rápido

1. Punto de entrada: `src/main.js` → `updateMission(dt)`.
2. Ver emisión en core: `src/mission/core.js` (`events.push(...)`).
3. Ver consumo de efectos: `src/mission/effects.js` (orquestador) + adapters:
   - `src/mission/effects/audio.js`
   - `src/mission/effects/ui-tip.js`
   - `src/mission/effects/haptics.js`
4. Para depurar fino, log temporal en `updateMission`:
   - `if (events.length) console.info('[mission-events]', events);`

## Smoke checklist misión (manual)

1. Iniciar misión y esperar transición prep → playing (tip de inicio).
2. Dejar correr tiempo para ver amenazas II/III y avisos.
3. Matar todos los drones y verificar `extraction-ready`.
4. Entrar/salir del faro:
   - dentro: sube extracción,
   - fuera breve: hold mantiene,
   - fuera prolongado: `extraction-grace-expired` y empieza decay.
5. Confirmar finales:
   - win por extracción completa,
   - lose por tiempo agotado o HP 0.
