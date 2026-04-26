// =============================================================================
// AI — Allied AI behavior for missiles and turrets
// =============================================================================

import { state, AI_SKILLS, firstTurret, missileSlots, missileStats, turretSlots, turretStats } from "../state.js";
import { nearest, clampAngle } from "../utils.js";
import { launchMissile, fireTurret, fireTurretSalvo } from "../entities/weapons.js";
import { priorityEnemy, pickAiMissile } from "./combat.js";
import { GROUND_Y, SLOT_OFFSETS } from "../config.js";
import * as logger from "../debug/logger.js";

// --- AI update called from game loop ---

export function updateAi(dt, mode, difficultyCfg) {
  const skill = AI_SKILLS[state.aiSkill];
  state.aiMissileTimer -= dt;
  state.aiTurretTimer -= dt;
  const aiCooldownMultiplier = difficultyCfg.ai;

  // AI controls missiles when player controls turrets, or in full AI combat.
  if ((mode === "turret" || mode === "auto") && state.aiMissileTimer <= 0) {
    const target = priorityEnemy();
    if (target) {
      const preferredType = pickAiMissile(target);
      const aim = aiMissileAim(target, preferredType, skill);
      const fired = launchMissile(aim, preferredType, true, aiCooldownMultiplier);
      state.aiMissileTimer = fired ? Math.max(210, 470 * skill.delay * difficultyCfg.ai) : 90;
    }
  }

  // AI controls turrets when player controls missiles, or in full AI combat.
  if ((mode === "missiles" || mode === "auto") && state.aiTurretTimer <= 0) {
    autoTurrets(dt, skill, difficultyCfg, aiCooldownMultiplier);
    state.aiTurretTimer = Math.max(36, 85 * skill.delay * difficultyCfg.ai);
  }
}

// --- Auto turret aiming and firing ---

export function autoTurrets(dt, skill, difficultyCfg, aiCooldownMultiplier = 1) {
  const armedBases = state.cities.filter((city) => city.hp > 0 && firstTurret(city));
  if (!armedBases.length) return;
  // Independent turrets each pick their own nearest enemy and fire — they
  // don't need a screen-wide priority target, so don't gate them on it.
  if (state.aiTurretAimMode === "independent") {
    autoTurretsIndependent(armedBases, dt, skill, aiCooldownMultiplier);
    return;
  }
  const target = priorityEnemy();
  if (!target) return;
  const referenceBase = nearest(armedBases, target) || armedBases[0];
  const referenceSlot = bestReadyTurret(referenceBase) || firstTurret(referenceBase);
  const referenceMount = turretMount(referenceBase, referenceSlot);
  const aim = turretAimPoint(referenceMount, target, referenceSlot, skill);
  state.globalTurretAngle = clampAngle(Math.atan2(aim.y - referenceMount.y, aim.x - referenceMount.x), -Math.PI + 0.14, -0.14);
  armedBases.forEach((city) => {
    city.turretAngle = state.globalTurretAngle;
    turretSlots(city).forEach((slot) => {
      slot.angle = state.globalTurretAngle;
    });
    fireTurretSalvo(city, dt, true, aiCooldownMultiplier);
  });
}

// --- Missile interception ---

function aiMissileAim(target, preferredType, skill) {
  const launcher = bestReadyLauncher(target, preferredType) || bestReadyLauncher(target, null);
  if (!launcher) {
    return noisyAim(target.x, target.y, skill.aimNoise);
  }
  const intercept = predictIntercept(launcher, target, launcher.speed);
  const urgency = Math.min(1, Math.max(0, target.y / GROUND_Y));
  const noise = skill.aimNoise * (0.6 - urgency * 0.35);
  return noisyAim(
    target.x + (intercept.x - target.x) * skill.lead,
    target.y + (intercept.y - target.y) * skill.lead,
    noise
  );
}

function bestReadyLauncher(target, preferredType) {
  let best = null;
  state.cities.forEach((city) => {
    if (city.hp <= 0) return;
    missileSlots(city).forEach((slot) => {
      if (!slot.type || (preferredType && slot.type !== preferredType)) return;
      const stats = missileStats(slot);
      if (!stats || slot.cooldown > 0 || slot.ammo < stats.cost) return;
      const x = city.x + SLOT_OFFSETS.missile[slot.index];
      const y = city.y - 18;
      const distance = Math.hypot(target.x - x, target.y - y);
      if (!best || distance < best.distance) {
        best = { x, y, speed: stats.speed, distance };
      }
    });
  });
  return best;
}

function predictIntercept(origin, target, missileSpeed) {
  const tx = target.x - origin.x;
  const ty = target.y - origin.y;
  const vx = target.vx || 0;
  const vy = target.vy || 0;
  const a = vx * vx + vy * vy - missileSpeed * missileSpeed;
  const b = 2 * (tx * vx + ty * vy);
  const c = tx * tx + ty * ty;
  let time = Math.sqrt(c) / Math.max(0.1, missileSpeed);

  if (Math.abs(a) > 0.0001) {
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const root = Math.sqrt(discriminant);
      const t1 = (-b - root) / (2 * a);
      const t2 = (-b + root) / (2 * a);
      const candidates = [t1, t2].filter((candidate) => candidate > 0);
      if (candidates.length) time = Math.min(...candidates);
    }
  } else if (Math.abs(b) > 0.0001) {
    const linearTime = -c / b;
    if (linearTime > 0) time = linearTime;
  }

  time = Math.min(140, Math.max(0, time));
  return {
    x: target.x + vx * time,
    y: Math.min(GROUND_Y - 10, target.y + vy * time),
  };
}

function autoTurretsIndependent(armedBases, dt, skill, aiCooldownMultiplier) {
  armedBases.forEach((city) => {
    turretSlots(city).forEach((slot) => {
      const mount = turretMount(city, slot);
      const target = nearest(state.enemies, mount);
      if (!target) return;
      const aim = turretAimPoint(mount, target, slot, skill);
      const angle = clampAngle(Math.atan2(aim.y - mount.y, aim.x - mount.x), -Math.PI + 0.14, -0.14);
      slot.angle = angle;
      city.turretAngle = angle;
      fireTurret(city, slot, dt, true, aiCooldownMultiplier);
    });
  });
}

function bestReadyTurret(city) {
  return turretSlots(city).find((slot) => {
    const stats = turretStats(slot);
    return stats && slot.cooldown <= 0 && slot.ammo >= stats.ammoCost;
  });
}

function turretMount(city, slot) {
  return {
    x: city.x + SLOT_OFFSETS.turret[slot?.index || 0],
    y: city.y - 24,
  };
}

function turretAimPoint(origin, target, slot, skill) {
  const stats = turretStats(slot);
  const predicted = slot?.type === "laser" || !stats?.speed
    ? { x: target.x, y: target.y }
    : predictIntercept(origin, target, stats.speed);
  return noisyAim(predicted.x, predicted.y, skill.aimNoise);
}

// --- Add noise to aim point ---

export function noisyAim(x, y, radius) {
  const angle = Math.random() * Math.PI * 2;
  const distance = Math.random() * radius;
  return {
    x: x + Math.cos(angle) * distance,
    y: y + Math.sin(angle) * distance,
  };
}
