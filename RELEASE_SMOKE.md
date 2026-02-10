# Release Smoke — 2026-02-10

Base URL: `https://naranbot02-png.github.io/tierra-del-fuego-3/`

Cache-bust verificado: `https://naranbot02-png.github.io/tierra-del-fuego-3/?v=1770750890`

## Operativo (DoD Release)

- [x] `npm run build` local OK.
- [x] GitHub Actions `Deploy to GitHub Pages` en **success**.
  - Run: `21878895912`
  - SHA desplegado: `3c345c2be48ca82d5e635db754d9e197bf6081f4`
- [x] Pages status = `built` (`gh api repos/.../pages`).
- [x] URL con cache-bust (`?v=`) responde HTTP 200.
- [x] HTML remoto contiene cambios esperados de esta release (Mira/Mano/Amenaza).

## Smoke checklist manual (post-deploy)

### Mobile
- [ ] 60s dual-stick + FIRE + J en paralelo (sin drift/input pegado).
- [ ] Alternar `Layout`, `Mano`, `Mira` sin solapes ni pérdida de control.
- [ ] Confirmar escalada Amenaza I→II→III (feedback + dificultad).

### Desktop
- [ ] Pointer lock + WASD + Space + Click/F.
- [ ] Reinicio con `R`.
- [ ] Sin errores bloqueantes en consola.

> Nota: checks manuales quedan para ejecución en dispositivo real/webview externo.
