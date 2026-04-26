// =============================================================================
// Combat — Damage calculation, collision detection, targeting priority
// =============================================================================

import { state, clearSlot } from "../state.js";
import { ENEMY_DEFS, GROUND_Y } from "../config.js";
import { nearest } from "../utils.js";

// --- Damage a city or factory when enemy reaches target ---

export function damageCity(enemy) {
  const targets = [
    ...state.factories.filter((factory) => factory.hp > 0).map((factory) => ({ ...factory, targetKind: "factory" })),
    ...state.cities.filter((city) => city.hp > 0).map((city) => ({ ...city, targetKind: "base" })),
  ];
  const target = nearest(targets, enemy);
  if (!target) return;
  const damage = ENEMY_DEFS[enemy.type].damage;
  if (target.targetKind === "factory") {
    const factory = state.factories.find((candidate) => candidate.id === target.id);
    if (!factory) return;
    factory.hp = Math.max(0, factory.hp - damage);
  } else {
    const city = state.cities.find((candidate) => candidate.name === target.name);
    if (!city) return;
    if (city.shield > 0) {
      city.shield = 0;
      return;
    }
    city.hp = Math.max(0, city.hp - damage);
    if (city.hp <= 0) {
      city.slots.forEach(clearSlot);
    }
  }
}

// --- Priority targeting for AI ---

export function priorityEnemy() {
  const weights = { mirv: 9, hypersonic: 8, bomber: 7, jammer: 7, armored: 6, bomb: 6, drone: 4, missile: 5 };
  return [...state.enemies]
    .filter((enemy) => enemy.y < GROUND_Y)
    .sort((a, b) => (weights[b.type] || 1) - (weights[a.type] || 1) || b.y - a.y)[0];
}

// --- AI missile type selection ---

export function pickAiMissile(enemy) {
  if (enemy.type === "drone" || enemy.type === "hypersonic" || enemy.type === "mirv") return "seeker";
  return "ballistic";
}

// --- Laser ray-target intersection (single target) ---

export function findTargetAlongRay(city, angle, width, enemies) {
  let best = null;
  let bestProjection = Infinity;
  enemies.forEach((enemy) => {
    const dx = enemy.x - city.x;
    const dy = enemy.y - (city.y - 24);
    const projection = dx * Math.cos(angle) + dy * Math.sin(angle);
    if (projection < 0) return;
    const perpendicular = Math.abs(dx * Math.sin(angle) - dy * Math.cos(angle));
    if (perpendicular < width + enemy.radius && projection < bestProjection) {
      best = enemy;
      bestProjection = projection;
    }
  });
  return best;
}

// --- Laser pierce: all enemies along ray, sorted by distance ---

export function findTargetsAlongRay(city, angle, width, enemies, maxRange = 900) {
  const hits = [];
  const originX = city.x;
  const originY = city.y - 24;
  enemies.forEach((enemy) => {
    if (enemy.dead) return;
    const dx = enemy.x - originX;
    const dy = enemy.y - originY;
    const projection = dx * Math.cos(angle) + dy * Math.sin(angle);
    if (projection < 0 || projection > maxRange) return;
    const perpendicular = Math.abs(dx * Math.sin(angle) - dy * Math.cos(angle));
    if (perpendicular < width + enemy.radius) {
      hits.push({ enemy, distance: projection });
    }
  });
  hits.sort((a, b) => a.distance - b.distance);
  return hits;
}
