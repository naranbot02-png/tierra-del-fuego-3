# ASSETS_LICENSES.md

Inventario de assets y fuentes utilizadas por **Tierra del Fuego 3**.

## 1) Código / librerías de terceros

### three.js
- Uso: motor 3D (`WebGLRenderer`, geometrías, materiales, luces, etc.)
- Fuente: paquete `three` en `package.json` + import ESM CDN en runtime
- Versión: `0.182.0`
- URL runtime actual: `https://unpkg.com/three@0.182.0/build/three.module.js`
- Licencia: **MIT**
- Referencia: repositorio oficial `mrdoob/three.js` (LICENSE MIT)

## 2) Assets visuales

Actualmente no se usan texturas/modelos externos (PNG/JPG/GLB/etc.).

- Geometrías: generadas por código (Three primitives: plane, box, sphere, circle, ring)
- Materiales/colores: definidos en código
- HUD/CSS/SVG hitmarker: creado inline en código HTML/JS del proyecto
- Tipografía: stack de fuentes del sistema (`system-ui`, `Segoe UI`, etc.)

Licencia: **propio del proyecto** (código original del repositorio) + fuentes del sistema del dispositivo del usuario.

## 3) Audio

- SFX sintetizados por WebAudio (`OscillatorNode` + `GainNode`) en runtime.
- No se usan archivos de audio externos (`.mp3/.wav/.ogg`).

Licencia: **propio del proyecto** (generación procedural).

## 4) TODOs de compliance

- [ ] Confirmar y documentar explícitamente en release final si se mantiene import por CDN (`unpkg`) o se migra a bundle local de Vite para evitar dependencia externa en runtime.
- [ ] Si se agregan assets externos (imágenes, sonidos, modelos), registrar aquí: fuente exacta, URL, autor y tipo de licencia antes de publicar.
