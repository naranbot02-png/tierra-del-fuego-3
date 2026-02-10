# Release Notes — 2026-02-10 (Sprint 1 cierre + Sprint 2 avance)

## Qué cambió

- Cierre formal Sprint 1 con checklist QA documentado (`SPRINT-1-QA.md`).
- Fix mobile: preset de sensibilidad de mira (`Precisa / Normal / Rápida`) persistido.
- Legal/IP DoD: inventario de assets y licencias (`ASSETS_LICENSES.md`).
- Sprint 2 (loop misión): dificultad progresiva por tiempo.
  - Drones aumentan agresividad por nivel de amenaza (I → II → III).
  - HUD muestra nivel de amenaza durante la misión.
  - Alertas visuales/sonoras al escalar la amenaza.
- Sprint 2 (loop misión): nueva fase de extracción tras derribar drones.
  - Al completar bajas, el objetivo cambia a volver al faro para evacuar.
  - Extracción por permanencia en zona (progreso acumulado, con pérdida parcial al salir).
  - Señal visual del faro/aro y feedback háptico breve al entrar en zona en mobile.
  - Indicador direccional discreto al faro durante extracción (mobile-first, sin bloquear touch).
  - Mini barra de objetivo (combat/extracción/resultado) para lectura rápida en pantallas chicas.
  - Copy adaptativo en mobile: objetivo/timer más cortos en `pointer: coarse` para reducir ruido visual.

## Qué probar (rápido)

### Mobile
- Dual-stick + FIRE + J en paralelo durante 60s.
- Cambiar `Layout`, `Mano` y `Mira` sin perder control ni generar drift.
- Confirmar que la misión sube de Amenaza I→II→III y se siente el aumento.

### Desktop
- Pointer lock + WASD + Space + click/F.
- Reinicio con `R`.

### Build/Release
- `npm run build` sin fallos.
- Publicar con cache-bust (`?v=`) y repetir smoke test.
