# ADR-001: Convención de ejes/input y pipeline de movimiento

- **Fecha:** 2026-02-13
- **Estado:** Aprobado (Semana 1 Día 1)

## Contexto
`main.js` concentraba lectura de input, normalización, lógica de sprint y transformación a movimiento en mundo. Esto dificultaba testear y refactorizar sin riesgo de regresión.

## Decisión
Definimos una arquitectura incremental con separación por responsabilidad:

- `src/input/intent.js`
  - Convención de intención: `+Y = avanzar`, `+X = derecha`.
  - Touch: se invierte eje Y del stick (`-touch.moveY`) para alinear UI con convención de intención.
  - Normalización combinada teclado + touch para evitar diagonales más rápidas.
  - Sprint por teclado (Shift) y auto-sprint móvil por magnitud de intención.

- `src/movement/transform.js`
  - Transformación intención local → delta en mundo usando base derivada de cámara (forward/right en plano XZ).
  - Se respeta la orientación visual actual (`yaw/pitch`) para coherencia de control.

## Pipeline acordado
1. Capturar input crudo (teclado/touch).
2. Convertir a **intención local** (`intentX`, `intentY`).
3. Normalizar intención combinada.
4. Resolver estado de velocidad (walk/sprint).
5. Transformar a delta mundo (`worldX`, `worldZ`) con base de cámara.
6. Aplicar colisiones/desplazamiento.

## Consecuencias
- Menor acoplamiento en `main.js`.
- Refactorizaciones futuras más seguras (input/movimiento aislables).
- Base lista para pruebas unitarias por módulo sin tocar render loop.
