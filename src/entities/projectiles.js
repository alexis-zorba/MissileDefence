// =============================================================================
// Projectiles — Missile and bullet movement updates
// =============================================================================

import { state } from "../state.js";
import { MISSILE_DEFS } from "../config.js";
import { nearest } from "../utils.js";
import { createBlast } from "./effects.js";

// --- Missile movement ---

export function updateMissiles() {
  state.friendlyMissiles.forEach((missile) => {
    const def = MISSILE_DEFS[missile.type];
    const stats = missile.stats || def?.levels[Math.max(0, (missile.level || 1) - 1)];
    if (missile.type === "seeker") {
      const target = nearest(state.enemies, missile);
      if (target) {
        const lead = stats.lead || 0;
        const predictedX = target.x + (target.vx || 0) * lead;
        const predictedY = target.y + (target.vy || 0) * lead;
        const desiredAngle = Math.atan2(predictedY - missile.y, predictedX - missile.x);
        let currentAngle = missile.angle ?? desiredAngle;
        let angleDiff = desiredAngle - currentAngle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        const maxTurn = (stats.turnRate || 2.5) * (Math.PI / 180);
        const turnAmount = Math.max(-maxTurn, Math.min(maxTurn, angleDiff));
        missile.angle = currentAngle + turnAmount;
        missile.targetX = missile.x + Math.cos(missile.angle) * 1500;
        missile.targetY = missile.y + Math.sin(missile.angle) * 1500;
      }
    }
    const dx = missile.targetX - missile.x;
    const dy = missile.targetY - missile.y;
    const distance = Math.hypot(dx, dy);
    missile.trail.push({ x: missile.x, y: missile.y });
    if (missile.trail.length > 18) missile.trail.shift();
    if (distance <= stats.speed) {
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
    } else {
      missile.x += (dx / distance) * stats.speed;
      missile.y += (dy / distance) * stats.speed;
    }
  });
}

// --- Bullet movement ---

export function updateBullets(dt) {
  state.friendlyBullets.forEach((bullet) => {
    if (bullet.laser) {
      bullet.life -= dt;
      return;
    }
    bullet.x += bullet.vx;
    bullet.y += bullet.vy;
    bullet.life -= 1;
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
