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

  // AI controls missiles (when player controls turrets)
  if ((mode === "turret" || mode === "missiles") && mode === "turret" && state.aiMissileTimer <= 0) {
    const target = priorityEnemy();
    if (target) {
      const aim = noisyAim(target.x + target.vx * skill.lead, target.y + target.vy * skill.lead, skill.aimNoise);
      launchMissile(aim, pickAiMissile(target), true, difficultyCfg.ai);
      state.aiMissileTimer = 900 * difficultyCfg.ai * skill.delay;
    }
  }

  // AI controls turrets (when player controls missiles)
  if ((mode === "missiles" || mode === "turret") && mode === "missiles" && state.aiTurretTimer <= 0) {
    autoTurrets(dt, skill, difficultyCfg);
    state.aiTurretTimer = 80 * difficultyCfg.ai * skill.delay;
  }
}

// --- Auto turret aiming and firing ---

export function autoTurrets(dt, skill, difficultyCfg) {
  const armedBases = state.cities.filter((city) => city.hp > 0 && firstTurret(city));
  const target = priorityEnemy();
  if (!target || !armedBases.length) return;
  if (state.aiTurretAimMode === "independent") {
    autoTurretsIndependent(armedBases, dt, skill, difficultyCfg);
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
    fireTurretSalvo(city, dt, true, difficultyCfg.ai);
  });
}

function autoTurretsIndependent(armedBases, dt, skill, difficultyCfg) {
  armedBases.forEach((city) => {
    turretSlots(city).forEach((slot) => {
      const mount = { x: city.x, y: city.y - 24 };
      const target = nearest(state.enemies, mount);
      if (!target) return;
      const aim = noisyAim(target.x, target.y, skill.aimNoise);
      const angle = clampAngle(Math.atan2(aim.y - mount.y, aim.x - mount.x), -Math.PI + 0.14, -0.14);
      slot.angle = angle;
      city.turretAngle = angle;
      fireTurret(city, slot, dt, true, difficultyCfg.ai);
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
