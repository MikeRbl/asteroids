# AGENTS.md

Asteroids — clon de arcade en HTML5 Canvas puro. Sin dependencias, sin bundler, sin `package.json`.

## Correr / verificar

- No hay build, ni scripts npm, ni tests, ni linter/typecheck. Abrir `index.html` directo o `npx serve .` (http://localhost:3000). Verificar jugando en el navegador.

## Estructura

- `game.js` — todo el juego en un solo archivo (ES6 classes, `'use strict'`): input, entidades (Ship, Asteroid, Bullet, Particle), estado, loop update/draw.
- `index.html` — carga `game.js` con `<script src>` plano; NO usa ES modules (`import`/`export`). Canvas fijo 800x600; las constantes `W`/`H` en `game.js` deben coincidir.
- `favicon.svg` — icono estático.

## Convenciones

- Todo en español: README, comentarios del código y textos del juego (HUD: "SCORE", "NIVEL", "GAME OVER", "PUNTAJE"). Mantener.
- Conservar el diseño de un solo archivo sin dependencias. Si se agrega un archivo, registrarlo con una etiqueta `<script>` en `index.html`.
- Input: `keys[code]` para estado continuo, `pressed(code)`/`justPressed` para disparo de flanco (Space dispara y reinicia). `e.code` (ArrowLeft, ArrowUp, etc.).
- El estado del juego (ship, bullets, asteroids, score, lives, state) vive a nivel de módulo, no en una clase.
- `dt` está limitado a 0.05s en el loop.