# TDF3 — Plan adaptado usando 3 skills

Fecha: 2026-02-12

Skills aplicadas:
- `architecture-designer` (estructura técnica)
- `game-cog` (diseño de mapa/loop de juego)
- `superdesign` (HUD/UI mobile-first)

## 1) Objetivo
Pasar de vertical slice funcional a una base de juego sólida y escalable, manteniendo foco en móvil y legibilidad.

## 2) Qué se mantiene del plan actual
- Base de Sprint 1 (controles + gunfeel) ya consolidada.
- Sprint 2 en curso (amenaza dinámica + extracción + feedback).
- Flujo de entregas cortas con commit + prueba rápida + deploy Pages.

## 3) Plan nuevo por capas (skills-driven)

### Capa A — Arquitectura (architecture-designer)
**Resultado esperado:** código más modular, menos regresiones de controles/gameplay.

Backlog:
1. Definir módulos explícitos:
   - `input` (keyboard/touch/normalización)
   - `movement` (conversión local->mundo + colisiones)
   - `combat` (drones/daño/cooldowns)
   - `mission` (fases/objetivos/extracción)
   - `ui` (HUD/tips/estado)
2. Crear ADRs mínimas:
   - ADR-001: Convención de ejes de input.
   - ADR-002: Pipeline de estado de misión.
   - ADR-003: Política de feedback visual/audio mobile.
3. Agregar checklist NFR corta (60 FPS objetivo móvil, legibilidad HUD, no bloqueos de input).

### Capa B — Mapa y experiencia principal (game-cog)
**Resultado esperado:** mapa principal más “campaign-like”, no solo arena.

Backlog:
1. Blockout de mapa principal “Puerto Quimera”:
   - perímetro exterior,
   - núcleo industrial,
   - zona faro/extracción.
2. Rutas múltiples y pacing:
   - ruta segura (más larga),
   - ruta agresiva (más riesgo, más rápida).
3. Encounters por zonas:
   - exterior: presión baja,
   - interior: presión media (espacios cerrados),
   - extracción: presión alta y clara lectura.
4. Señalización diegética:
   - luces/landmarks hacia objetivo,
   - puntos de cover cada 6-10m.

### Capa C — UX/HUD y claridad (superdesign)
**Resultado esperado:** estado del jugador/misión claro en <1s, especialmente en celular.

Backlog:
1. Jerarquía HUD:
   - objetivo actual,
   - amenaza,
   - extracción/hold,
   - HP crítico.
2. Sistema visual de estados:
   - normal / presión / crítico con color y animación coherente.
3. Microinteracciones:
   - feedback de daño y confirmaciones con timings consistentes.
4. QA visual mobile-first:
   - no superposición de controles,
   - tipografía y contraste validados.

## 4) Roadmap operativo (2 semanas)

### Semana 1
- Día 1-2: refactor modular + ADRs (architecture-designer).
- Día 3-4: blockout mapa principal + rutas (game-cog).
- Día 5: integración misión/extracción en nuevo mapa + smoke test.

### Semana 2
- Día 1-2: polish HUD/UX mobile (superdesign).
- Día 3-4: tuning de encounters y dificultad.
- Día 5: release candidate + checklist QA + deploy.

## 5) Definition of Done por hito
Cada hito debe incluir:
1. commit(s) claros,
2. `npm run build` OK,
3. pasos de prueba (2-4),
4. qué debería notar Naranja en gameplay.

## 6) Riesgos y mitigación
- Riesgo: regresiones por refactor de input/movement.
  - Mitigación: ADR de ejes + smoke tests por yaw/teclado/touch.
- Riesgo: mapa grande afecte rendimiento móvil.
  - Mitigación: blockout simple primero, luego detalle progresivo.
- Riesgo: HUD recargado en pantalla chica.
  - Mitigación: prioridad visual estricta + copy corto.
