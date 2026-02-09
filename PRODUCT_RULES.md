# Tierra del Fuego 3 — Product Rules (DoD)

## 1) Legal/IP DoD (obligatorio)
- No usar marcas, nombres, personajes, logos o lore de franquicias conocidas.
- Assets propios o con licencia comercial clara.
- Registrar fuente/licencia en `ASSETS_LICENSES.md`.
- Copy/UI/marketing 100% original.

## 2) Gameplay DoD
- Cada feature mejora al menos 1 pilar del juego.
- Incluye feedback visual o sonoro mínimo.
- Funciona en mobile + desktop.
- Se entiende en <30s por jugador nuevo.

## 3) Técnico DoD
- `npm run build` pasa.
- Sin errores bloqueantes en consola.
- Probado en webview móvil + navegador externo.
- Commit pequeño, claro y reversible.

## 4) Release DoD
- Deploy Pages en success.
- URL con cache-bust probada (`?v=...`).
- Nota breve de “qué cambió / qué probar”.

## 5) Convención de commits
- `feat(gameplay): ...`
- `fix(mobile): ...`
- `perf(render): ...`
- `docs(...): ...`
