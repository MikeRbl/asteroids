'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Skins ─────────────────────────────────────────────────────────────────────
const SKINS = [
  {
    id: 'clasica',
    name: 'CLÁSICA',
    body:   [[20, 0], [-12, -9], [-7, 0], [-12, 9]],
    stroke: '#fff',
    fill:   null,
    flame:  'rgba(255, 130, 0, 0.85)',
    flameBase: -8,
    flameHalf: 4,
  },
  {
    id: 'caza',
    name: 'CAZA',
    body:   [[22, 0], [2, -7], [-10, -4], [-15, 0], [-10, 4], [2, 7]],
    stroke: '#7ff0ff',
    fill:   'rgba(127, 240, 255, 0.15)',
    flame:  'rgba(0, 200, 255, 0.9)',
    flameBase: -12,
    flameHalf: 3,
  },
  {
    id: 'fragata',
    name: 'FRAGATA',
    body:   [[15, 0], [5, -11], [-8, -12], [-14, -6], [-14, 6], [-8, 12], [5, 11]],
    stroke: '#ffd700',
    fill:   'rgba(255, 215, 0, 0.12)',
    flame:  'rgba(255, 180, 60, 0.9)',
    flameBase: -12,
    flameHalf: 5,
  },
  {
    id: 'fantasma',
    name: 'FANTASMA',
    body:   [[20, 0], [7, -4], [5, -10], [-8, -6], [-16, 0], [-8, 6], [5, 10], [7, 4]],
    stroke: '#5bff7a',
    fill:   'rgba(91, 255, 122, 0.12)',
    flame:  'rgba(91, 255, 122, 0.9)',
    flameBase: -13,
    flameHalf: 3,
  },
  {
    id: 'neon',
    name: 'NEÓN',
    body:   [[20, 0], [8, -5], [-2, -9], [-12, -3], [-14, 0], [-12, 3], [-2, 9], [8, 5]],
    stroke: '#ff4fd8',
    fill:   'rgba(255, 79, 216, 0.15)',
    flame:  'rgba(255, 79, 216, 0.9)',
    flameBase: -11,
    flameHalf: 4,
  },
];

const SKIN_STORAGE = 'asteroids.skinId';
let currentSkinIndex = 0;
let currentSkin = SKINS[0];
let skinToastTimer = 0;

function setSkin(index) {
  currentSkinIndex = wrap(index, SKINS.length);
  currentSkin = SKINS[currentSkinIndex];
  skinToastTimer = 2.2;
  try { localStorage.setItem(SKIN_STORAGE, currentSkin.id); } catch (e) { /* sin storage */ }
}

(function initSkin() {
  try {
    const saved = localStorage.getItem(SKIN_STORAGE);
    const i = SKINS.findIndex(s => s.id === saved);
    if (i >= 0) { currentSkinIndex = i; currentSkin = SKINS[i]; }
  } catch (e) { /* sin storage */ }
})();

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle, perpVel = 0, growth = 0) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    // Velocidad lateral perpendicular al movimiento (separación exponencial)
    this.px = -Math.sin(angle);
    this.py =  Math.cos(angle);
    this.perpVel = perpVel;
    this.growth  = growth;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    // La velocidad lateral crece exponencialmente (d/dt = growth * perpVel)
    this.perpVel += this.perpVel * this.growth * dt;
    this.x = wrap(this.x + (this.vx + this.px * this.perpVel) * dt, W);
    this.y = wrap(this.y + (this.vy + this.py * this.perpVel) * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz (cometa) ───────────────────────────────────────────────────
const STAR_SPEED  = 220;  // px/s, más rápido que un asteroide normal
const STAR_RADIUS = 18;
const STAR_TTL    = 6;    // segundos de vida antes de desaparecer
const STAR_POINTS = 200;

class ShootingStar {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    this.radius = STAR_RADIUS;
    this.ttl = STAR_TTL;
    this.dead = false;

    const speed = STAR_SPEED + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    // Polígono irregular (cabeza del cometa)
    const n = randInt(8, 12);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo cuando está por desaparecer
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) return;

    // Cola de luz en dirección opuesta al movimiento
    const angle = Math.atan2(this.vy, this.vx);
    for (let i = 1; i <= 6; i++) {
      ctx.strokeStyle = `rgba(255, 215, 0, ${((1 - i / 6) * 0.5).toFixed(2)})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(this.x - Math.cos(angle) * i * 8, this.y - Math.sin(angle) * i * 8);
      ctx.stroke();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = '#ffd700';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
function drawShipShape(skin, thrusting) {
  ctx.strokeStyle = skin.stroke;
  ctx.lineWidth   = 1.5;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo(skin.body[0][0], skin.body[0][1]);
  for (let i = 1; i < skin.body.length; i++)
    ctx.lineTo(skin.body[i][0], skin.body[i][1]);
  ctx.closePath();
  if (skin.fill) { ctx.fillStyle = skin.fill; ctx.fill(); }
  ctx.stroke();

  // Llama del propulsor
  if (thrusting && Math.random() > 0.35) {
    ctx.beginPath();
    ctx.moveTo(skin.flameBase, -skin.flameHalf);
    ctx.lineTo(skin.flameBase - rand(6, 14), 0);
    ctx.lineTo(skin.flameBase, skin.flameHalf);
    ctx.strokeStyle = skin.flame;
    ctx.stroke();
  }
}

class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.tripleShot    = 0;
    this.shieldTimer   = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;
    if (this.tripleShot    > 0) this.tripleShot    -= dt;
    if (this.shieldTimer   > 0) this.shieldTimer   -= dt;

    const ROT        = 3.5;    // rad/s
    const THRUST     = 260;    // px/s²
    const BOOST_MULT = 1.8;    // multiplicador de velocidad del power-up
    const DRAG       = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    const thrust = this.speedBoost > 0 ? THRUST * BOOST_MULT : THRUST;
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * thrust * dt;
      this.vy += Math.sin(this.angle) * thrust * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;

    // Triple shot: 3 balas que parten en línea recta y se separan exponencialmente
    if (this.tripleShot > 0) {
      const SPREAD    = 8;   // separación inicial perpendicular
      const PERP_VEL  = 30;  // velocidad lateral inicial
      const GROWTH    = 2.2; // tasa de crecimiento exponencial
      const px = -Math.sin(this.angle);
      const py =  Math.cos(this.angle);
      return [
        new Bullet(ox, oy, this.angle),
        new Bullet(ox + px * SPREAD, oy + py * SPREAD, this.angle,  PERP_VEL, GROWTH),
        new Bullet(ox - px * SPREAD, oy - py * SPREAD, this.angle, -PERP_VEL, GROWTH),
      ];
    }
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Aura dorada con velocidad, cian con triple shot
    if (this.speedBoost > 0 || this.tripleShot > 0) {
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.strokeStyle = this.speedBoost > 0
        ? 'rgba(255, 215, 0, 0.35)'
        : 'rgba(102, 204, 255, 0.35)';
      ctx.lineWidth   = 1.5;
      ctx.stroke();
    }

    // Burbuja del escudo
    if (this.shieldTimer > 0) {
      const pulse = 1 + Math.sin(performance.now() / 120) * 0.04;
      ctx.beginPath();
      ctx.arc(0, 0, 26 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
      ctx.lineWidth   = 2;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 29 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.18)';
      ctx.lineWidth   = 5;
      ctx.stroke();
    }

    // Con boost el trazo se tiñe (dorado con velocidad, cian con triple shot)
    const skin = this.speedBoost > 0
      ? { ...currentSkin, stroke: '#ffd700', flame: 'rgba(255, 215, 0, 0.9)' }
      : this.tripleShot > 0
        ? { ...currentSkin, stroke: '#6cf', flame: 'rgba(102, 204, 255, 0.9)' }
        : currentSkin;
    drawShipShape(skin, this.thrusting);

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up (velocidad | triple shot | escudo) ───────────────────────────────
const POWERUP_TTL = 10;   // segundos antes de desaparecer
const SHIELD_DURATION = 5;    // segundos de protección del escudo
const SHIELD_CHANCE   = 0.15; // probabilidad de drop de escudo

class PowerUp {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;      // 'speed' | 'triple' | 'shield'
    this.radius = 14;
    this.ttl = POWERUP_TTL;
    this.dead = false;
  }

  update(dt) {
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo cuando está por desaparecer
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = this.type === 'triple' ? '#6cf'
                    : this.type === 'shield' ? '#00e5ff'
                    : '#ffd700';
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';

    if (this.type === 'shield') {
      // Hexágono de escudo
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(a) * 10;
        const py = Math.sin(a) * 10;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (this.type === 'triple') {
      // Tres líneas paralelas indicando triple disparo
      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 7, -9);
        ctx.lineTo(i * 7,  9);
        ctx.stroke();
      }
    } else {
      // Doble flecha ">>" indicando velocidad
      ctx.beginPath();
      ctx.moveTo(-6, -8);
      ctx.lineTo( 4,  0);
      ctx.lineTo(-6,  8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo( 0, -8);
      ctx.lineTo(10,  0);
      ctx.lineTo( 0,  8);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerUps, shootingStars;
let score, lives, level;
let starTimer;
let state;      // 'menu' | 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function spawnShootingStar() {
  const edge = randInt(0, 3);  // 0 arriba, 1 abajo, 2 izquierda, 3 derecha
  let x, y, angle;
  if (edge === 0)      { x = rand(0, W); y = -20;            angle = rand(Math.PI * 0.1, Math.PI * 0.9); }
  else if (edge === 1) { x = rand(0, W); y = H + 20;         angle = rand(Math.PI * 1.1, Math.PI * 1.9); }
  else if (edge === 2) { x = -20;         y = rand(0, H);    angle = rand(-Math.PI * 0.4, Math.PI * 0.4); }
  else                 { x = W + 20;      y = rand(0, H);    angle = rand(Math.PI * 0.6, Math.PI * 1.4); }
  shootingStars.push(new ShootingStar(x, y, angle));
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerUps  = [];
  shootingStars = [];
  starTimer = rand(5, 10);
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerUps  = [];
  shootingStars = [];
  starTimer = rand(5, 10);
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'menu') {
    if (pressed('ArrowLeft'))  setSkin(currentSkinIndex - 1);
    if (pressed('ArrowRight')) setSkin(currentSkinIndex + 1);
    if (pressed('Space')) initGame();
    return;
  }

  if (state === 'gameover') {
    if (pressed('ArrowLeft'))  setSkin(currentSkinIndex - 1);
    if (pressed('ArrowRight')) setSkin(currentSkinIndex + 1);
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    shootingStars.forEach(s => s.update(dt));
    shootingStars = shootingStars.filter(s => !s.dead);
    powerUps.forEach(p => p.update(dt));
    powerUps = powerUps.filter(p => !p.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Cambiar skin con S o Tab
  if (pressed('KeyS') || pressed('Tab')) setSkin(currentSkinIndex + 1);
  if (skinToastTimer > 0) skinToastTimer -= dt;

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Aparición aleatoria de estrellas fugaces (cada 5-10s)
  starTimer -= dt;
  if (starTimer <= 0) {
    spawnShootingStar();
    starTimer = rand(5, 10);
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  shootingStars.forEach(s => s.update(dt));
  particles.forEach(p => p.update(dt));
  powerUps.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  shootingStars = shootingStars.filter(s => !s.dead);
  particles = particles.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        // 20% de probabilidad de power-up de velocidad o triple shot
        if (Math.random() < 0.2)
          powerUps.push(new PowerUp(a.x, a.y, Math.random() < 0.5 ? 'speed' : 'triple'));
        // Probabilidad independiente de escudo
        if (Math.random() < SHIELD_CHANCE) powerUps.push(new PowerUp(a.x, a.y, 'shield'));
      }
    }
    for (const s of shootingStars) {
      if (!s.dead && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        s.dead = true;
        score += STAR_POINTS;
        explode(s.x, s.y, 12);
        if (Math.random() < 0.2)
          powerUps.push(new PowerUp(s.x, s.y, Math.random() < 0.5 ? 'speed' : 'triple'));
        if (Math.random() < SHIELD_CHANCE) powerUps.push(new PowerUp(s.x, s.y, 'shield'));
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (!a.dead && dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (ship.shieldTimer > 0) {
          a.dead = true;
          score += POINTS[a.size];
          explode(a.x, a.y, a.size * 5);
        } else {
          killShip();
          break;
        }
      }
    }
  }

  // Nave vs estrella fugaz
  if (ship.invincible <= 0) {
    for (const s of shootingStars) {
      if (!s.dead && dist(ship, s) < ship.radius + s.radius * 0.82) {
        if (ship.shieldTimer > 0) {
          s.dead = true;
          score += STAR_POINTS;
          explode(s.x, s.y, 12);
        } else {
          killShip();
          break;
        }
      }
    }
  }

  // Nave vs power-ups
  for (const p of powerUps) {
    if (!p.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      if (p.type === 'shield')      ship.shieldTimer = SHIELD_DURATION;
      else if (p.type === 'triple') ship.tripleShot = 5;  // 5 segundos de triple disparo
      else                          ship.speedBoost = 5;  // 5 segundos de velocidad aumentada
    }
  }
  powerUps = powerUps.filter(p => !p.dead);

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(0.45, 0.45);
  ctx.rotate(-Math.PI / 2);
  drawShipShape(currentSkin, false);
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  // Barra del power-up de velocidad (se reduce con el tiempo)
  if (ship.speedBoost > 0) {
    const BW   = 100;                 // ancho de la barra
    const frac = ship.speedBoost / 5; // fracción de tiempo restante
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(W / 2 - BW / 2, 34, BW, 6);
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(W / 2 - BW / 2, 34, BW * frac, 6);
  }

  // Barra del power-up de triple shot (se reduce con el tiempo)
  if (ship.tripleShot > 0) {
    const BW   = 100;                  // ancho de la barra
    const frac = ship.tripleShot / 5;  // fracción de tiempo restante
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(W / 2 - BW / 2, 44, BW, 6);
    ctx.fillStyle = '#6cf';
    ctx.fillRect(W / 2 - BW / 2, 44, BW * frac, 6);
  }

  // Barra del escudo (se reduce con el tiempo)
  if (ship.shieldTimer > 0) {
    const BW   = 100;                         // ancho de la barra
    const frac = ship.shieldTimer / SHIELD_DURATION; // fracción de tiempo restante
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(W / 2 - BW / 2, 54, BW, 6);
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(W / 2 - BW / 2, 54, BW * frac, 6);
  }

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Aviso al cambiar de skin en juego
  if (skinToastTimer > 0) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.font      = '14px monospace';
    ctx.fillText(`SKIN: ${currentSkin.name}`, W / 2, H - 24);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  powerUps.forEach(p => p.draw());
  shootingStars.forEach(s => s.draw());
  asteroids.forEach(a => a.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover') {
    drawOverlay('GAME OVER', `PUNTAJE: ${score}`);

    // Vista previa de la skin actual
    ctx.save();
    ctx.translate(W / 2, H / 2 + 70);
    ctx.rotate(-Math.PI / 2);
    drawShipShape(currentSkin, false);
    ctx.restore();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd700';
    ctx.font      = '15px monospace';
    ctx.fillText(`SKIN: ${currentSkin.name}`, W / 2, H / 2 + 106);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.fillText('← → SKIN   ·   ESPACIO PARA REINICIAR', W / 2, H / 2 + 128);
  }

  if (state === 'menu') {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff';
    ctx.font      = 'bold 46px monospace';
    ctx.fillText('ASTEROIDS', W / 2, H / 2 - 60);

    // Vista previa de la skin actual
    ctx.save();
    ctx.translate(W / 2, H / 2 + 10);
    ctx.rotate(-Math.PI / 2);
    drawShipShape(currentSkin, false);
    ctx.restore();

    ctx.fillStyle = '#ffd700';
    ctx.font      = '16px monospace';
    ctx.fillText(`SKIN: ${currentSkin.name}`, W / 2, H / 2 + 48);
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.font      = '15px monospace';
    ctx.fillText('← → SKIN   ·   ESPACIO PARA JUGAR', W / 2, H / 2 + 78);
  }
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
state = 'menu';
requestAnimationFrame(loop);