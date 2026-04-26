// =============================================================================
// AI — Allied AI behavior for missiles and turrets
// =============================================================================

import { state, AI_SKILLS, firstTurret, turretSlots } from "../state.js";
import { nearest, clampAngle } from "../utils.js";
import { launchMissile, fireTurret, fireTurretSalvo } from "../entities/weapons.js";
import { priorityEnemy, pickAiMissile } from "./combat.js";
import * as logger from "../debug/logger.js";

// --- AI update called from game loop ---

export function updateAi(dt, mode, difficultyCfg) {
  const skill = AI_SKILLS[state.aiSkill];
  state.aiMissileTimer -= dt;
  state.aiTurretTimer -= dt;
  const aiCooldownMultiplier = Math.max(0.55, 1 / difficultyCfg.ai);

  // AI controls missiles when player controls turrets, or in full AI combat.
  if ((mode === "turret" || mode === "auto") && state.aiMissileTimer <= 0) {
    const target = priorityEnemy();
    if (target) {
      const missileLead = skill.lead * 1.35;
      const missileNoise = skill.aimNoise * 0.38;
      const aim = noisyAim(target.x + target.vx * missileLead, target.y + target.vy * missileLead, missileNoise);
      launchMissile(aim, pickAiMissile(target), true, aiCooldownMultiplier);
      state.aiMissileTimer = Math.max(360, (720 * skill.delay) / difficultyCfg.ai);
    }
  }

  // AI controls turrets when player controls missiles, or in full AI combat.
  if ((mode === "missiles" || mode === "auto") && state.aiTurretTimer <= 0) {
    autoTurrets(dt, skill, difficultyCfg, aiCooldownMultiplier);
    state.aiTurretTimer = Math.max(36, (85 * skill.delay) / difficultyCfg.ai);
  }
}

// --- Auto turret aiming and firing ---

export function autoTurrets(dt, skill, difficultyCfg, aiCooldownMultiplier = 1) {
  const armedBases = state.cities.filter((city) => city.hp > 0 && firstTurret(city));
  const target = priorityEnemy();
  if (!target || !armedBases.length) return;
  if (state.aiTurretAimMode === "independent") {
    autoTurretsIndependent(armedBases, dt, skill, aiCooldownMultiplier);
    return;
  }
  const referenceBase = nearest(armedBases, target) || armedBases[0];
  const aim = noisyAim(target.x, target.y, skill.aimNoise);
  state.globalTurretAngle = clampAngle(Math.atan2(aim.y - referenceBase.y, aim.x - referenceBase.x), -Math.PI + 0.14, -0.14);
  armedBases.forEach((city) => {
    city.turretAngle = state.globalTurretAngle;
    turretSlots(city).forEach((slot) => {
      slot.angle = state.globalTurretAngle;
    });
    fireTurretSalvo(city, dt, true, aiCooldownMultiplier);
  });
}

function autoTurretsIndependent(armedBases, dt, skill, aiCooldownMultiplier) {
  armedBases.forEach((city) => {
    turretSlots(city).forEach((slot) => {
      const mount = { x: city.x, y: city.y - 24 };
      const target = nearest(state.enemies, mount);
      if (!target) return;
      const aim = noisyAim(target.x, target.y, skill.aimNoise);
      const angle = clampAngle(Math.atan2(aim.y - mount.y, aim.x - mount.x), -Math.PI + 0.14, -0.14);
      slot.angle = angle;
      city.turretAngle = angle;
      fireTurret(city, slot, dt, true, aiCooldownMultiplier);
    });
  });
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
