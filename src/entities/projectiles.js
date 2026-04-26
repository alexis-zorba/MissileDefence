// =============================================================================
// Projectiles — Missile and bullet movement updates
// =============================================================================

import { state } from "../state.js";
import { MISSILE_DEFS, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT } from "../config.js";
import { nearest } from "../utils.js";
import { createBlast } from "./effects.js";

// --- Missile movement ---

export function updateMissiles(dt = 16) {
  const step = dt / (1000 / 60);
  state.friendlyMissiles.forEach((missile) => {
    const def = MISSILE_DEFS[missile.type];
    const stats = missile.stats || def?.levels[Math.max(0, (missile.level || 1) - 1)];
    missile.age = (missile.age || 0) + dt;
    if (missile.type === "seeker") {
      const target = nearest(state.enemies, missile);
      if (target) {
        const lead = stats.lead || 0;
        const predictedX = target.x + (target.vx || 0) * lead;
        const predictedY = Math.min(GROUND_Y - 50, target.y + (target.vy || 0) * lead);
        const desiredAngle = Math.atan2(predictedY - missile.y, predictedX - missile.x);
        let currentAngle = missile.angle ?? desiredAngle;
        let angleDiff = desiredAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        const maxTurn = (stats.turnRate || 2.5) * (Math.PI / 180) * step;
        const turnAmount = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
        missile.angle = currentAngle + turnAmount;
        missile.targetX += (predictedX - missile.targetX) * 0.06;
        missile.targetY += (predictedY - missile.targetY) * 0.06;
      }
    }
    const dx = missile.targetX - missile.x;
    const dy = missile.targetY - missile.y;
    const distance = Math.hypot(dx, dy);
    if (missile.wobble == null) missile.wobble = Math.random() * Math.PI * 2;
    const dirX = missile.angle != null ? Math.cos(missile.angle) : (distance > 0 ? dx / distance : 0);
    const dirY = missile.angle != null ? Math.sin(missile.angle) : (distance > 0 ? dy / distance : 1);
    missile.trail.push({
      x: missile.x - dirX * 6 + Math.sin(missile.wobble + missile.trail.length * 0.42) * 2,
      y: missile.y - dirY * 6 + (Math.random() - 0.5) * 4,
      r: 3 + Math.random() * 5,
      a: 0.28 + Math.random() * 0.18,
    });
    const maxTrail = Math.round(32 * state.trailDuration);
    if (missile.trail.length > maxTrail) missile.trail.shift();
    const travel = stats.speed * step;
    const shouldDetonateAtTarget = missile.type !== "seeker" && distance <= travel;
    if (shouldDetonateAtTarget) {
      const radiusBoost = missile.type === "ballistic" ? 1 + (missile.blastRadiusLevel - 1) * 0.16 : 1;
      const radius = stats.radius * radiusBoost;
      createBlast(missile.targetX, missile.targetY, radius, stats.damage, missile.type, missile.blastLifeLevel);
      if (missile.type === "ballistic" && missile.blastRadiusLevel > 1) {
        const clusterCount = Math.min(7, missile.blastRadiusLevel + 1);
        for (let i = 0; i < clusterCount; i += 1) {
          const angle = (Math.PI * 2 * i) / clusterCount + Math.random() * 0.22;
          const spread = radius * (0.42 + Math.random() * 0.18);
          createBlast(
            missile.targetX + Math.cos(angle) * spread,
            missile.targetY + Math.sin(angle) * spread * 0.72,
            radius * 0.42,
            stats.damage * 0.38,
            "ballistic",
            missile.blastLifeLevel
          );
        }
      }
      missile.done = true;
      if (missile.type === "ballistic" && missile.level >= 3) {
        for (let i = 0; i < 4; i += 1) {
          const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.4;
          createBlast(missile.targetX + Math.cos(angle) * 34, missile.targetY + Math.sin(angle) * 22, 22 * radiusBoost, 0.72, "ballistic", missile.blastLifeLevel);
        }
      }
    } else if (missile.type === "seeker") {
      missile.x += Math.cos(missile.angle ?? -Math.PI / 2) * travel;
      missile.y += Math.sin(missile.angle ?? -Math.PI / 2) * travel;
    } else if (distance > 0) {
      missile.x += (dx / distance) * travel;
      missile.y += (dy / distance) * travel;
    }
    if (!missile.done && missile.type === "seeker") {
      const nearbyEnemy = state.enemies.find((e) => !e.dead && Math.hypot(e.x - missile.x, e.y - missile.y) < stats.radius * 0.55 + e.radius);
      if (nearbyEnemy) {
        createBlast(missile.x, missile.y, stats.radius, stats.damage, missile.type, missile.blastLifeLevel);
        missile.done = true;
      }
    }
    if (!missile.done && missile.type === "seeker" && missile.maxAge && missile.age >= missile.maxAge) {
      createBlast(missile.x, missile.y, stats.radius * 0.82, stats.damage * 0.72, missile.type, missile.blastLifeLevel);
      missile.done = true;
    }
    if (!missile.done && missile.type === "seeker" && isOutsideFrame(missile)) {
      missile.done = true;
    }
    if (!missile.done && missile.y >= GROUND_Y - 4) {
      createBlast(missile.x, GROUND_Y - 4, 20, stats.damage * 0.5, missile.type, missile.blastLifeLevel);
      missile.done = true;
    }
  });
}

function isOutsideFrame(missile) {
  const margin = 90;
  return missile.x < -margin || missile.x > CANVAS_WIDTH + margin || missile.y < -margin || missile.y > CANVAS_HEIGHT + margin;
}

// --- Bullet movement ---

export function updateBullets(dt) {
  const step = dt / (1000 / 60);
  state.friendlyBullets.forEach((bullet) => {
    if (bullet.laser) {
      bullet.life -= dt;
      return;
    }
    bullet.x += bullet.vx * step;
    bullet.y += bullet.vy * step;
    bullet.life -= step;
    state.enemies.forEach((enemy) => {
      if (enemy.dead) return;
      const hit = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.radius + (bullet.radius || 3);
      if (hit) {
        enemy.hp -= bullet.damage;
        bullet.done = true;
        state.particles.push({ x: bullet.x, y: bullet.y, life: 150, color: bullet.color, size: 5 });
      }
    });
  });
}
