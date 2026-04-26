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
  consumeDurability,
} from "../state.js";
import { TURRET_DEFS, SLOT_OFFSETS, GROUND_Y } from "../config.js";
import { clampAngle } from "../utils.js";
import { findTargetsAlongRay } from "../systems/combat.js";
import * as logger from "../debug/logger.js";

// --- Missile launch ---

export function launchMissileFromSlot(city, slot, target, byAi, aiMultiplier) {
  if (state.betweenWaves || state.paused) return false;
  if (!city || city.hp <= 0 || !slot?.type) return false;
  const stats = missileStats(slot);
  if (!stats || slot.cooldown > 0 || slot.ammo < stats.cost) return false;
  const launchedType = slot.type;
  const launchedLevel = slot.level;
  slot.ammo -= stats.cost;
  const remainingAmmo = slot.ammo;
  slot.cooldown = stats.cooldown * (byAi ? aiMultiplier : 1);
  state.friendlyMissiles.push({
    x: city.x + SLOT_OFFSETS.missile[slot.index],
    y: city.y - 18,
    targetX: target.x,
    targetY: Math.min(target.y, GROUND_Y),
    type: launchedType,
    level: launchedLevel,
    stats,
    byAi,
    angle: Math.atan2(target.y - city.y, target.x - city.x),
    age: 0,
    maxAge: slot.type === "seeker" ? 3800 : 0,
    blastRadiusLevel: city.blastRadiusLevel,
    blastLifeLevel: city.blastLifeLevel,
    trail: [],
  });
  consumeDurability(slot);
  logger.log("debug", `Missile launched from ${city.name}`, { type: launchedType, level: launchedLevel, ammo: remainingAmmo });
  return true;
}

export function launchMissile(target, preferredType = null, byAi = false, aiMultiplier = 1) {
  if (state.betweenWaves || state.paused) return false;
  const attempts = [];
  const collect = (type) => {
    state.cities.forEach((city) => {
      if (city.hp <= 0) return;
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
  if (!city || city.hp <= 0 || !slot?.type) return false;
  const def = TURRET_DEFS[slot.type];
  const stats = turretStats(slot);
  if (!def || !stats || slot.cooldown > 0) return false;
  if (slot.ammo < stats.ammoCost) return false;
  const angle = typeof slot.angle === "number" ? slot.angle : city.turretAngle;
  slot.ammo -= stats.ammoCost;
  if (slot.type === "laser") {
    const hits = findTargetsAlongRay(city, angle, stats.width, state.enemies, 900);
    const beamEnd = hits.length > 0 ? hits[hits.length - 1].distance : 900;
    hits.forEach(({ enemy }, index) => {
      const falloff = Math.max(0.3, 1 - index * 0.25);
      enemy.hp -= stats.damage * dt * falloff;
      state.particles.push({ x: enemy.x, y: enemy.y, life: 90, color: def.color, size: 4 });
    });
    state.friendlyBullets.push({
      x: city.x + SLOT_OFFSETS.turret[slot.index],
      y: city.y - 24,
      vx: Math.cos(angle),
      vy: Math.sin(angle),
      beamLength: beamEnd,
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
  slot.cooldown = stats.cooldown * (byAi ? aiMultiplier : 1);
  consumeDurability(slot);
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

export function aimPlayerTurretsAt(point, aimMode = "parallel") {
  const armedCities = state.cities.filter((city) => city.hp > 0 && firstTurret(city));
  if (!armedCities.length) return;
  if (aimMode === "point") {
    armedCities.forEach((city) => {
      city.turretAngle = clampAngle(Math.atan2(point.y - (city.y - 24), point.x - city.x), -Math.PI + 0.1, -0.1);
      turretSlots(city).forEach((slot) => {
        slot.angle = clampAngle(Math.atan2(point.y - (city.y - 24), point.x - (city.x + SLOT_OFFSETS.turret[slot.index])), -Math.PI + 0.1, -0.1);
      });
    });
    return;
  }
  const reference = armedCities.reduce((best, city) => {
    const bestDistance = Math.hypot(point.x - best.x, point.y - best.y);
    const distance = Math.hypot(point.x - city.x, point.y - city.y);
    return distance < bestDistance ? city : best;
  }, armedCities[0]);
  state.globalTurretAngle = clampAngle(Math.atan2(point.y - (reference.y - 24), point.x - reference.x), -Math.PI + 0.1, -0.1);
  armedCities.forEach((city) => {
    city.turretAngle = state.globalTurretAngle;
    turretSlots(city).forEach((slot) => {
      slot.angle = state.globalTurretAngle;
    });
  });
}

// --- Player turret rotation ---

export function updatePlayerTurret(dt, mode, turretCurve, turretSensitivity, keys) {
  if (mode !== "turret" && mode !== "coop") return;
  const selectedInput = document.getElementById("turretInputSelect")?.value || state.turretInputMode;
  state.turretInputMode = selectedInput;
  state.turretAimMode = document.getElementById("turretAimSelect")?.value || state.turretAimMode;
  if (selectedInput === "mouse" && mode === "turret") return;
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
