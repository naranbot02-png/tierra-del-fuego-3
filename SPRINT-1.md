# Sprint 1 — Mobile Controls + Gunfeel Base

Duración objetivo: 3-5 días

## Objetivo del sprint
Lograr una base jugable sólida en celular: dual-stick estable, controles cómodos y feedback de disparo claro.

## Backlog (ordenado)
1. `fix(mobile)`: estabilidad total dual-stick (sin cruces al usar dos dedos)
2. `feat(mobile)`: sensibilidad de cámara + deadzone configurable
3. `feat(mobile)`: preset de layout (compacto / cómodo)
4. `feat(gameplay)`: muzzle flash + micro shake + hit feedback
5. `perf(mobile)`: revisar frame pacing y draw cost básico

## Criterios de salida del sprint
- Mover + mirar + disparar simultáneo sin drift en webview Telegram.
- Controles no se superponen en pantallas chicas.
- Feedback de disparo perceptible y consistente.
- Build + deploy Pages OK.

## Prueba rápida por build
- Abrir URL con `?v=` nuevo.
- Probar 60s: mover/rotar/disparar/saltar en paralelo.
- Confirmar ausencia de “saltos” del stick derecho.
