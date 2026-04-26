// =============================================================================
// Effects — Blasts (explosions) and particles
// =============================================================================

import { state } from "../state.js";
import { MISSILE_DEFS, ENEMY_DEFS } from "../config.js";
import { makeId } from "../utils.js";

// --- Blast creation and update ---

export function createBlast(x, y, radius, damage, type, lifeLevel = 1) {
  state.blasts.push({
    id: makeId(),
    x,
    y,
    radius,
    damage,
    type,
    age: 0,
    life: (type === "emp" ? 620 : 520) * (1 + (lifeLevel - 1) * 0.18),
    currentRadius: 0,
  });
  burst(x, y, MISSILE_DEFS[type]?.color || "#ff775f", 9);
}

export function updateBlasts(dt) {
  state.blasts.forEach((blast) => {
    blast.age += dt;
    const progress = blast.age / blast.life;
    blast.currentRadius = blast.radius * Math.sin(Math.min(1, progress) * Math.PI);
    state.enemies.forEach((enemy) => {
      if (enemy.dead || enemy.hitBy?.has(blast.id)) return;
      const distance = Math.hypot(enemy.x - blast.x, enemy.y - blast.y);
      if (distance < blast.currentRadius + enemy.radius) {
        const damage = blast.type === "emp" && ["drone", "jammer", "bomb"].includes(enemy.type) ? 2 : blast.damage;
        enemy.hp -= damage;
        enemy.hitBy ||= new Set();
        enemy.hitBy.add(blast.id);
        sparkBurst(enemy.x, enemy.y);
      }
    });
  });
}

// --- Particles ---

export function burst(x, y, color, count) {
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

export function sparkBurst(x, y, count = 7) {
  const palette = ["#ffffff", "#ffe98a", "#ffb152", "#ffefb1"];
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.4 + Math.random() * 3.4;
    state.particles.push({
      x: x + (Math.random() - 0.5) * 2,
      y: y + (Math.random() - 0.5) * 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 140 + Math.random() * 160,
      color: palette[(Math.random() * palette.length) | 0],
      size: 1 + Math.random() * 2.4,
    });
  }
}

export function updateParticles(dt) {
  const step = dt / (1000 / 60);
  state.particles.forEach((particle) => {
    particle.life -= dt;
    particle.x += (particle.vx || 0) * step;
    particle.y += (particle.vy || 0) * step;
  });
}

// --- Cleanup dead entities ---

export function cleanup() {
  state.friendlyMissiles = state.friendlyMissiles.filter((missile) => !missile.done);
  state.friendlyBullets = state.friendlyBullets.filter((bullet) => !bullet.done && bullet.life > 0);
  state.enemies = state.enemies.filter((enemy) => !enemy.dead);
  state.blasts = state.blasts.filter((blast) => blast.age < blast.life);
  state.particles = state.particles.filter((particle) => particle.life > 0);
}
