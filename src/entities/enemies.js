// =============================================================================
// Enemies — Spawning, movement, behaviors (MIRV split, bomber drop, jammer)
// =============================================================================

import { state } from "../state.js";
import { ENEMY_DEFS, CANVAS_WIDTH, GROUND_Y } from "../config.js";
import { nearest } from "../utils.js";
import { damageCity } from "../systems/combat.js";
import { createBlast } from "../entities/effects.js";
import * as logger from "../debug/logger.js";

const W = CANVAS_WIDTH;

// --- Spawn enemy based on wave and difficulty ---

export function spawnEnemy(wave, difficultyCfg) {
  const roll = Math.random();
  let type = "missile";
  if (wave >= 13 && roll > 0.82) type = "jammer";
  else if (wave >= 10 && roll > 0.76) type = "bomber";
  else if (wave >= 8 && roll > 0.72) type = "armored";
  else if (wave >= 7 && roll > 0.58) type = "mirv";
  else if (wave >= 5 && roll > 0.7) type = "hypersonic";
  else if (wave >= 4 && roll > 0.55) type = "drone";

  if (type === "bomber") {
    const fromLeft = Math.random() > 0.5;
    state.enemies.push({
      type,
      x: fromLeft ? -40 : W + 40,
      y: 70 + Math.random() * 120,
      vx: (fromLeft ? 1 : -1) * (1.15 + wave * 0.025) * difficultyCfg.speed,
      vy: 0,
      hp: ENEMY_DEFS[type].hp,
      bombTimer: 550 + Math.random() * 900,
      bombsDropped: 0,
      radius: ENEMY_DEFS[type].radius,
      trail: [],
    });
    return;
  }

  const target = pickLivingTarget();
  if (!target) return;
  const x = Math.random() * W;
  const y = -12;
  const tx = target.x + (Math.random() - 0.5) * 86;
  const ty = target.y;
  const dx = tx - x;
  const dy = ty - y;
  const length = Math.hypot(dx, dy);
  const base = type === "hypersonic" ? 2.65 : type === "drone" ? 0.86 : 1.15;
  const speed = (base + wave * 0.045 + Math.random() * 0.35) * difficultyCfg.speed;
  state.enemies.push({
    type,
    x,
    y,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
    hp: ENEMY_DEFS[type].hp,
    targetX: tx,
    targetY: ty,
    splitAt: type === "mirv" ? 190 + Math.random() * 160 : null,
    radius: ENEMY_DEFS[type].radius,
    wobble: Math.random() * Math.PI * 2,
    trail: [],
  });
}

// --- MIRV split ---

export function splitMirv(enemy, difficultyCfg) {
  for (let i = 0; i < 3; i += 1) {
    const target = pickLivingTarget();
    if (!target) continue;
    const tx = target.x + (i - 1) * 52 + (Math.random() - 0.5) * 30;
    const ty = target.y;
    const dx = tx - enemy.x;
    const dy = ty - enemy.y;
    const length = Math.hypot(dx, dy);
    const speed = 1.72 * difficultyCfg.speed;
    state.enemies.push({
      type: "missile",
      x: enemy.x,
      y: enemy.y,
      vx: (dx / length) * speed,
      vy: (dy / length) * speed,
      hp: 0.75,
      targetX: tx,
      targetY: ty,
      radius: 5,
    });
  }
}

// --- Bomber drop bomb ---

export function dropBomb(enemy, difficultyCfg) {
  const target = pickLivingTarget();
  const targetX = target?.x || W / 2;
  const travel = Math.max(80, Math.abs(targetX - enemy.x));
  const direction = Math.sign(targetX - enemy.x) || Math.sign(enemy.vx) || 1;
  state.enemies.push({
    type: "bomb",
    x: enemy.x,
    y: enemy.y + 14,
    vx: direction * Math.min(1.2, 0.28 + travel / 900),
    vy: 0.416 * difficultyCfg.speed,
    hp: ENEMY_DEFS.bomb.hp,
    radius: ENEMY_DEFS.bomb.radius,
    wobble: Math.random() * Math.PI * 2,
    trail: [],
  });
}

// --- Update all enemies: movement, behaviors, damage ---

export function updateEnemies(dt, difficultyCfg, trailDuration) {
  const step = dt / (1000 / 60);
  state.enemies.forEach((enemy) => {
    const def = ENEMY_DEFS[enemy.type];
    if (enemy.type === "drone") {
      enemy.wobble += 0.12 * step;
      enemy.x += (Math.sin(enemy.wobble * 1.7) * 2.6 + Math.sin(enemy.wobble * 4.1) * 0.8) * step;
      enemy.y += Math.cos(enemy.wobble * 2.3) * 1.15 * step;
    } else if (enemy.type !== "bomber") {
      enemy.trail ||= [];
      const isBomb = enemy.type === "bomb";
      enemy.trail.push({
        x: enemy.x - enemy.vx * (isBomb ? 10 : 7) + Math.sin((enemy.wobble || 0) + enemy.trail.length * 0.42) * (isBomb ? 5 : 2),
        y: enemy.y - enemy.vy * (isBomb ? 9 : 7) + (Math.random() - 0.5) * (isBomb ? 1.6 : 4),
        r: (isBomb ? 4 : 3) + Math.random() * (isBomb ? 5 : 5),
        a: (isBomb ? 0.3 : 0.28) + Math.random() * (isBomb ? 0.12 : 0.18),
        warm: isBomb,
      });
      const maxTrail = Math.round((isBomb ? 86 : 32) * trailDuration);
      if (enemy.trail.length > maxTrail) enemy.trail.shift();
    }
    if (enemy.type === "bomb") {
      enemy.vy += 0.018 * step;
      enemy.wobble = (enemy.wobble || 0) + 0.08 * step;
    }
    enemy.x += enemy.vx * step;
    enemy.y += enemy.vy * step;

    if (enemy.type === "bomber") {
      enemy.bombTimer -= dt;
      if (enemy.bombTimer <= 0 && (enemy.bombsDropped || 0) < 3) {
        dropBomb(enemy, difficultyCfg);
        enemy.bombsDropped = (enemy.bombsDropped || 0) + 1;
        enemy.bombTimer = 700 + Math.random() * 750;
      }
      if (enemy.x < -80 || enemy.x > W + 80) enemy.dead = true;
    }

    if (enemy.type === "mirv" && enemy.splitAt && enemy.y >= enemy.splitAt) {
      splitMirv(enemy, difficultyCfg);
      enemy.dead = true;
    }

    if (enemy.type === "jammer") {
      state.cities.forEach((city) => {
        if (city.hp > 0 && Math.hypot(city.x - enemy.x, city.y - enemy.y) < 175) city.disabled = 260;
      });
    }

    if (enemy.hp <= 0) {
      enemy.dead = true;
      state.score += def.score;
      burstParticles(enemy.x, enemy.y, def.color, 10);
    }

    const reachedTarget = Number.isFinite(enemy.targetX) && Math.hypot(enemy.x - enemy.targetX, enemy.y - enemy.targetY) < enemy.radius + 8;
    if ((reachedTarget || enemy.y >= GROUND_Y - 8) && enemy.type !== "bomber") {
      damageCity(enemy);
      enemy.dead = true;
      createBlast(enemy.x, Math.min(enemy.y, GROUND_Y - 8), 24, 0, "impact");
    }
  });
}

// --- Target selection ---

export function pickLivingTarget() {
  const livingFactories = state.factories.filter((factory) => factory.hp > 0);
  if (livingFactories.length) return livingFactories[Math.floor(Math.random() * livingFactories.length)];
  const living = state.cities.filter((city) => city.hp > 0);
  return living[Math.floor(Math.random() * living.length)];
}

// --- Burst particles on enemy death ---

function burstParticles(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2.8;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 260 + Math.random() * 220,
      color,
      size: 2 + Math.random() * 4,
    });
  }
}
