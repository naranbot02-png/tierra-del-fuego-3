# Sprint 1 — QA Checklist (Mobile Controls + Gunfeel Base)

Objetivo: cerrar Sprint 1 con verificación explícita en mobile webview + navegador externo, y una pasada rápida desktop.

## Criterios de salida (from `SPRINT-1.md`)

- [ ] Mover + mirar + disparar simultáneo sin drift en webview Telegram.
- [ ] Controles no se superponen en pantallas chicas.
- [ ] Feedback de disparo perceptible y consistente.
- [ ] Build + deploy Pages OK.

## Matriz de prueba manual

### A) Mobile WebView (Telegram/embebido)

- [ ] Abrir URL con cache-bust (`?v=` nuevo).
- [ ] 60s de prueba continua: mover (stick izq) + mirar (stick der) + FIRE sostenido.
- [ ] Saltar (`J`) mientras se mueve/rota/dispara.
- [ ] Reiniciar con `↻` sin congelamientos ni input pegado.
- [ ] Alternar Layout (`Cómodo/Compacto`) y confirmar sin solapes.
- [ ] Confirmar feedback de disparo: recoil + flash + hitmarker.

### B) Mobile navegador externo (Chrome/Safari)

- [ ] Repetir test de 60s mover+mirar+disparar.
- [ ] Verificar deadzone de look (micro movimientos no generan drift).
- [ ] Verificar vibración en daño/alerta (si el dispositivo la soporta).
- [ ] Rotar orientación (si aplica) y confirmar controles funcionales.

### C) Desktop smoke test

- [ ] Click para pointer lock.
- [ ] WASD + Space + Click/F para disparo.
- [ ] `R` reinicia misión correctamente.
- [ ] Sin errores bloqueantes en consola.

## Hallazgos / huecos detectados

1. ~~Falta exponer sensibilidad de cámara mobile como ajuste rápido~~ ✅ Resuelto con preset de mira (`Precisa / Normal / Rápida`) persistido en `localStorage`.

## Estado actual (esta sesión)

- [x] Build local: `npm run build` OK.
- [x] Gap detectado de Sprint 1 (ajuste rápido de sensibilidad mobile) resuelto.
- [ ] Validación en dispositivo real (webview Telegram).
- [ ] Validación en navegador móvil externo (Chrome/Safari).
- [ ] Deploy Pages + smoke test con cache-bust (`?v=`).

## Cierre Sprint 1

Estado: **En cierre técnico, pendiente de validación final en dispositivo real** (webview + navegador externo) y deploy Pages.
