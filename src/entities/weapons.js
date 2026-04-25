// =============================================================================
// Weapons — Missile launches, turret firing, player turret control
// =============================================================================

import {
  state,
  missileSlots,
  turretSlots,
  firstTurret,
  missileStats,
  turretStats,
} from "../state.js";
import { TURRET_DEFS, SLOT_OFFSETS, GROUND_Y } from "../config.js";
import { clampAngle } from "../utils.js";
import { findTargetAlongRay } from "../systems/combat.js";
import * as logger from "../debug/logger.js";

// --- Missile launch ---

export function launchMissileFromSlot(city, slot, target, byAi, aiMultiplier) {
  if (state.betweenWaves || state.paused) return false;
  if (!city || city.hp <= 0 || city.disabled > 0 || !slot?.type) return false;
  const stats = missileStats(slot);
  if (!stats || slot.cooldown > 0 || slot.ammo < stats.cost) return false;
  slot.ammo -= stats.cost;
  slot.cooldown = stats.cooldown * (byAi ? aiMultiplier : 1);
  state.friendlyMissiles.push({
    x: city.x + SLOT_OFFSETS.missile[slot.index],
    y: city.y - 18,
    targetX: target.x,
    targetY: Math.min(target.y, GROUND_Y),
    type: slot.type,
    level: slot.level,
    stats,
    byAi,
    blastRadiusLevel: city.blastRadiusLevel,
    blastLifeLevel: city.blastLifeLevel,
    trail: [],
  });
  logger.log("debug", `Missile launched from ${city.name}`, { type: slot.type, level: slot.level, ammo: slot.ammo });
  return true;
}

export function launchMissile(target, preferredType = null, byAi = false, aiMultiplier = 1) {
  if (state.betweenWaves || state.paused) return false;
  const attempts = [];
  const collect = (type) => {
    state.cities.forEach((city) => {
      if (city.hp <= 0 || city.disabled > 0) return;
      missileSlots(city)
        .filter((slot) => !type || slot.type === type)
        .forEach((slot) => attempts.push(launchMissileFromSlot(city, slot, target, byAi, aiMultiplier)));
    });
  };
  collect(preferredType);
  if (byAi && preferredType && !attempts.some(Boolean)) collect(null);
  const fired = attempts.some(Boolean);
  if (fired) logger.log("debug", "Missile salvo launched", { preferredType, byAi, count: attempts.filter(Boolean).length });
  return fired;
}

// --- Turret fire ---

export function fireTurret(city, slot, dt, byAi = false, aiMultiplier = 1) {
  if (!city || city.hp <= 0 || city.disabled > 0 || !slot?.type) return false;
  const def = TURRET_DEFS[slot.type];
  const stats = turretStats(slot);
  if (!def || !stats || slot.cooldown > 0 || slot.heat >= 100) return false;
  if (slot.ammo < stats.ammoCost) return false;
  const angle = typeof slot.angle === "number" ? slot.angle : city.turretAngle;
  slot.ammo -= stats.ammoCost;
  if (slot.type === "laser") {
    const target = findTargetAlongRay(city, angle, stats.width, state.enemies);
    if (target) {
      target.hp -= stats.damage * dt;
      state.particles.push({ x: target.x, y: target.y, life: 90, color: def.color, size: 4 });
    }
    state.friendlyBullets.push({
      x: city.x + SLOT_OFFSETS.turret[slot.index],
      y: city.y - 24,
      vx: Math.cos(angle) * 900,
      vy: Math.sin(angle) * 900,
      life: 45,
      laser: true,
      color: def.color,
    });
  } else {
    state.friendlyBullets.push({
      x: city.x + SLOT_OFFSETS.turret[slot.index],
      y: city.y - 24,
      vx: Math.cos(angle) * stats.speed,
      vy: Math.sin(angle) * stats.speed,
      damage: stats.damage,
      life: 120,
      radius: stats.radius || 3,
      color: def.color,
    });
  }
  slot.heat += stats.heat;
  slot.cooldown = stats.cooldown * (byAi ? aiMultiplier : 1);
  return true;
}

export function fireTurretSalvo(city, dt, byAi = false, aiMultiplier = 1) {
  const fired = turretSlots(city)
    .map((slot) => fireTurret(city, slot, dt, byAi, aiMultiplier))
    .filter(Boolean).length;
  if (fired > 0) {
    logger.log("debug", "Turret salvo fired", { city: city.name, byAi, fired });
  }
  return fired;
}

export function firePlayerTurrets(dt) {
  return state.cities.reduce((sum, city) => sum + fireTurretSalvo(city, dt), 0);
}

// --- Player turret rotation ---

export function updatePlayerTurret(dt, mode, turretCurve, turretSensitivity, keys) {
  if (mode !== "turret" && mode !== "coop") return;
  const input = (keys.has("ArrowRight") ? 1 : 0) - (keys.has("ArrowLeft") ? 1 : 0);
  const shapedInput = input === 0 ? 0 : Math.sign(input) * Math.pow(Math.abs(input), turretCurve);
  const targetVelocity = shapedInput * turretSensitivity;
  const responseMs = 155 - Math.min(1.7, turretCurve) * 55;
  state.turretTurnVelocity += (targetVelocity - state.turretTurnVelocity) * Math.min(1, dt / responseMs);
  state.globalTurretAngle += state.turretTurnVelocity * (dt / 1000);
  state.globalTurretAngle = clampAngle(state.globalTurretAngle, -Math.PI + 0.1, -0.1);
  state.cities.forEach((city) => {
    if (firstTurret(city)) {
      city.turretAngle = state.globalTurretAngle;
      turretSlots(city).forEach((slot) => {
        slot.angle = state.globalTurretAngle;
      });
    }
  });
  if (keys.has("Space")) firePlayerTurrets(dt);
}
