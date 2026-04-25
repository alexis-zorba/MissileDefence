// =============================================================================
// Renderer — All Canvas drawing: sky, cities, factories, weapons, enemies, effects
// =============================================================================

import { state, installedSlots, missileSlots, turretSlots, firstTurret, maxAmmo, weaponColor, primaryWeaponType, MAX_WEAPON_LEVEL } from "../state.js";
import { MISSILE_DEFS, ENEMY_DEFS, CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, SLOT_OFFSETS } from "../config.js";

const W = CANVAS_WIDTH;
const H = CANVAS_HEIGHT;
const groundY = GROUND_Y;

// --- Main draw orchestrator ---

let currentMode = "missiles";

export function draw(ctx, mode = "missiles") {
  currentMode = mode;
  ctx.clearRect(0, 0, W, H);
  drawSky(ctx);
  drawFactories(ctx);
  drawCities(ctx);
  drawFriendlyMissiles(ctx);
  drawEnemies(ctx);
  drawBullets(ctx);
  drawBlasts(ctx);
  drawParticles(ctx);
}

// --- Sky / background ---

function drawSky(ctx) {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, "#080e16");
  gradient.addColorStop(0.58, "#020406");
  gradient.addColorStop(1, "#111712");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(85, 214, 190, 0.13)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 40; y < H; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  const groundGradient = ctx.createLinearGradient(0, groundY, 0, H);
  groundGradient.addColorStop(0, "#1a241c");
  groundGradient.addColorStop(0.45, "#111a14");
  groundGradient.addColorStop(1, "#060908");
  ctx.fillStyle = groundGradient;
  ctx.fillRect(0, groundY, W, H - groundY);
  ctx.strokeStyle = "#5a6b5e";
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  ctx.lineTo(W, groundY);
  ctx.stroke();
  ctx.strokeStyle = "rgba(85, 214, 190, 0.08)";
  for (let y = groundY + 12; y < H; y += 16) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y + Math.sin(y * 0.03) * 2);
    ctx.stroke();
  }
}

// --- Cities ---

function drawCities(ctx) {
  state.cities.forEach((city, index) => {
    const alive = city.hp > 0;
    ctx.save();
    ctx.translate(city.x, city.y);
    ctx.scale(state.visualScale, state.visualScale);
    drawAnchorPad(ctx, 0, 8, 118, 17, "#263527");
    drawGroundShadow(ctx, 0, 9, 94, 13, 0.38);
    drawDefenceBase(ctx, city, alive, index === state.selectedCity);
    if (city.shield && alive) {
      ctx.strokeStyle = "rgba(102, 168, 255, 0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -18, 62, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    if (alive && installedSlots(city).length) drawWeapons(ctx, city, isTurretControlled(city));
    drawCityReadout(ctx, city);
    ctx.restore();
  });
}

function isTurretControlled(city) {
  return (currentMode === "turret" || currentMode === "coop") && firstTurret(city);
}

// --- Factories ---

function drawFactories(ctx) {
  state.factories.forEach((factory) => {
    const alive = factory.hp > 0;
    const hpRatio = factory.maxHp > 0 ? factory.hp / factory.maxHp : 0;
    const width = 38 + factory.level * 8;
    const buildingCount = 2 + factory.level;
    const spacing = width / buildingCount;
    ctx.save();
    ctx.translate(factory.x, factory.y);
    ctx.scale(state.visualScale, state.visualScale);
    drawAnchorPad(ctx, 0, 9, width + 38, 12, "#203023");
    drawGroundShadow(ctx, 0, 8, width + 30, 10, 0.3);
    ctx.strokeStyle = "rgba(4, 9, 12, 0.78)";
    ctx.lineWidth = 1;
    ctx.fillStyle = alive ? "#506574" : "#332725";
    for (let i = 0; i < buildingCount; i += 1) {
      const localX = -width / 2 + i * spacing + spacing * 0.16;
      const intact = alive && i / buildingCount < Math.max(0.16, hpRatio + 0.1);
      const h = intact ? 18 + ((i + factory.level) % 3) * 8 : 5 + ((i * 7 + Math.floor(factory.ruinSeed * 10)) % 8);
      ctx.fillStyle = intact ? "#506574" : "#3a2826";
      ctx.fillRect(localX, -h, spacing * 0.68, h);
      ctx.strokeRect(localX, -h, spacing * 0.68, h);
      if (intact) {
        const blink = Math.sin(performance.now() / 360 + factory.slot + i) > 0.2;
        ctx.fillStyle = blink ? "#f6cf72" : "#8d7442";
        ctx.fillRect(localX + 3, -h + 5, 3, 3);
        if (spacing > 12) ctx.fillRect(localX + spacing * 0.38, -h + 12, 3, 3);
      }
    }
    if (alive) {
      const chimneyX = width / 2 - 7;
      ctx.fillStyle = "#3b4650";
      ctx.fillRect(chimneyX, -38, 8, 30);
      ctx.strokeRect(chimneyX, -38, 8, 30);
      for (let i = 0; i < 3; i += 1) {
        const t = performance.now() / 520 + factory.id.charCodeAt(0) + i;
        ctx.globalAlpha = 0.16 + i * 0.08;
        ctx.fillStyle = "#b8c0bf";
        ctx.beginPath();
        ctx.arc(chimneyX + 4 + Math.sin(t) * 6, -46 - i * 9 - (t % 1) * 6, 5 + i * 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = alive ? "#b8c9cf" : "#62433c";
    ctx.fillRect(-width / 2 - 5, -8, width + 10, 11);
    ctx.strokeRect(-width / 2 - 5, -8, width + 10, 11);
    ctx.strokeStyle = "rgba(180, 199, 200, 0.35)";
    ctx.beginPath();
    ctx.moveTo(-width / 2 - 13, 2);
    ctx.lineTo(width / 2 + 13, 2);
    ctx.stroke();
    for (let x = -width / 2 - 10; x <= width / 2 + 10; x += 8) {
      ctx.beginPath();
      ctx.moveTo(x, -3);
      ctx.lineTo(x, 5);
      ctx.stroke();
    }
    ctx.fillStyle = "#23313a";
    ctx.fillRect(-width / 2, 6, width, 4);
    ctx.fillStyle = hpRatio > 0.35 ? "#55d6be" : "#ff5f5f";
    ctx.fillRect(-width / 2, 6, width * Math.max(0, hpRatio), 4);
    ctx.restore();
  });
}

// --- Ground shadow helper ---

function drawGroundShadow(ctx, x, y, width, height, alpha = 0.3) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#000000";
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAnchorPad(ctx, x, y, width, height, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(112, 132, 116, 0.5)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.32)";
  ctx.beginPath();
  ctx.moveTo(x - width * 0.42, y + height * 0.15);
  ctx.lineTo(x + width * 0.42, y + height * 0.15);
  ctx.stroke();
  ctx.restore();
}

// --- Defence base drawing ---

function drawDefenceBase(ctx, city, alive, selected) {
  const width = 88;
  const color = weaponColor(primaryWeaponType(city));
  ctx.strokeStyle = "rgba(4, 9, 12, 0.9)";
  ctx.lineWidth = 1.4;

  if (selected && alive) {
    ctx.fillStyle = "#f4bf54";
    ctx.beginPath();
    ctx.moveTo(0, -83);
    ctx.lineTo(-9, -69);
    ctx.lineTo(9, -69);
    ctx.closePath();
    ctx.fill();
  }

  ctx.fillStyle = alive ? "#283743" : "#302827";
  roundedRect(ctx, -36, -34, 72, 12, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = alive ? "#354955" : "#3b2f2c";
  roundedRect(ctx, -43, -24, 86, 13, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = alive ? "#b6d2d6" : "#5f3b36";
  roundedRect(ctx, -width / 2, -12, width, 18, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = alive ? "#253540" : "#2f2524";
  ctx.beginPath();
  ctx.arc(0, -34, 17, Math.PI, Math.PI * 2);
  ctx.lineTo(17, -34);
  ctx.lineTo(-17, -34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (alive) {
    const radar = performance.now() / 950;
    ctx.strokeStyle = "rgba(214, 232, 230, 0.7)";
    ctx.beginPath();
    ctx.moveTo(0, -50);
    ctx.lineTo(Math.cos(radar) * 15, -50 + Math.sin(radar) * 7);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.72;
    ctx.fillRect(-31, -9, 62, 3);
    ctx.globalAlpha = 1;
  }
}

// --- City readout (HP bar + ammo bars) ---

function drawCityReadout(ctx, city) {
  const hpPct = city.maxHp > 0 ? Math.max(0, city.hp / city.maxHp) : 0;
  const slots = installedSlots(city);
  const panelHeight = 14 + slots.length * 5;
  ctx.fillStyle = "rgba(2, 5, 8, 0.72)";
  ctx.fillRect(-54, 18, 108, panelHeight);
  ctx.fillStyle = "#23313a";
  ctx.fillRect(-48, 22, 96, 8);
  ctx.fillStyle = hpPct > 0.35 ? "#55d6be" : "#ff5f5f";
  ctx.fillRect(-48, 22, 96 * hpPct, 8);
  slots.forEach((slot, index) => {
    const max = maxAmmo(city, slot);
    const ammoPct = max > 0 ? Math.min(1, slot.ammo / max) : 0;
    const y = 33 + index * 5;
    ctx.fillStyle = "#243037";
    ctx.fillRect(-48, y, 96, 4);
    ctx.fillStyle = weaponColor(slot.type);
    ctx.fillRect(-48, y, 96 * ammoPct, 4);
  });
}

// --- Weapon drawing ---

function drawWeapons(ctx, city, controlled) {
  missileSlots(city).forEach((slot) => {
    ctx.save();
    ctx.translate(SLOT_OFFSETS.missile[slot.index], 0);
    const color = city.disabled > 0 ? "#7a4c7e" : weaponColor(slot.type);
    drawLauncher(ctx, city, slot, color);
    ctx.restore();
  });

  turretSlots(city).forEach((slot) => {
    ctx.save();
    ctx.translate(SLOT_OFFSETS.turret[slot.index], 0);
    const color = city.disabled > 0 ? "#7a4c7e" : controlled ? "#55d6be" : weaponColor(slot.type);
    drawTurretBase(ctx, slot, color);
    ctx.save();
    ctx.rotate(city.turretAngle + Math.PI / 2);
    if (slot.type === "mg") {
      drawMachineGunBarrel(ctx, slot);
    } else if (slot.type === "laser") {
      drawLaserEmitter(ctx, slot);
    } else {
      drawCannonBarrel(ctx, slot);
    }
    ctx.restore();
    drawTurretCap(ctx, slot, color);
    ctx.restore();
  });
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

// --- Launcher drawing ---

function drawLauncher(ctx, city, slot, color) {
  ctx.save();
  drawGroundShadow(ctx, 0, 1, 92, 13, 0.24);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(4, 9, 12, 0.9)";

  const baseGradient = ctx.createLinearGradient(0, -34, 0, -4);
  baseGradient.addColorStop(0, "#3e5262");
  baseGradient.addColorStop(1, "#17232d");
  ctx.fillStyle = baseGradient;
  roundedRect(ctx, -43, -22, 86, 16, 4);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#0d151b";
  ctx.fillRect(-36, -5, 72, 5);
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(-35, -20, 70, 2);

  const podGradient = ctx.createLinearGradient(0, -50, 0, -28);
  podGradient.addColorStop(0, color);
  podGradient.addColorStop(1, "#23384c");
  [-24, 24].forEach((x, index) => {
    ctx.save();
    ctx.translate(x, -35);
    ctx.rotate(index === 0 ? -0.22 : 0.22);
    ctx.fillStyle = podGradient;
    roundedRect(ctx, -18, -8, 36, 14, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#05090c";
    roundedRect(ctx, 11, -5, 8, 8, 2);
    ctx.fill();
    ctx.fillStyle = "#05090c";
    [-8, 0, 8].forEach((tubeX) => {
      ctx.beginPath();
      ctx.arc(tubeX, -1, 2.6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = slot.ammo > 0 && slot.cooldown <= 0 ? "#5cff9d" : "#ff5f5f";
    ctx.beginPath();
    ctx.arc(-13, 3, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.24)";
    ctx.fillRect(-13, -6, 20, 2);
    ctx.restore();
  });

  ctx.fillStyle = "#263746";
  ctx.beginPath();
  ctx.moveTo(-18, -23);
  ctx.lineTo(0, -39);
  ctx.lineTo(18, -23);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// --- Turret base drawing ---

function drawTurretBase(ctx, slot, color) {
  ctx.save();
  drawGroundShadow(ctx, 0, 1, 64, 12, 0.25);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(4, 9, 12, 0.92)";
  const baseGradient = ctx.createLinearGradient(0, -30, 0, 0);
  baseGradient.addColorStop(0, "#425769");
  baseGradient.addColorStop(1, "#17232c");
  ctx.fillStyle = baseGradient;
  roundedRect(ctx, -28, -22, 56, 16, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#0b1218";
  ctx.fillRect(-21, -7, 42, 6);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.38;
  ctx.fillRect(-18, -20, 36, 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(3, 7, 10, 0.82)";
  [-21, -12, 12, 21].forEach((x) => {
    ctx.beginPath();
    ctx.arc(x, -14, 1.6, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = "#f4bf54";
  const level = Math.min(MAX_WEAPON_LEVEL, slot.level || 1);
  for (let i = 0; i < level; i += 1) {
    ctx.beginPath();
    ctx.moveTo(-22 + i * 8, -3);
    ctx.lineTo(-18 + i * 8, -9);
    ctx.lineTo(-14 + i * 8, -3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// --- Turret cap ---

function drawTurretCap(ctx, slot, color) {
  ctx.save();
  ctx.fillStyle = "#2d3e49";
  ctx.strokeStyle = "rgba(4, 9, 12, 0.92)";
  ctx.lineWidth = 1.7;
  ctx.beginPath();
  ctx.ellipse(0, -18, 18, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.78;
  roundedRect(ctx, -13, -20, 26, 5, 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  ctx.beginPath();
  ctx.ellipse(-5, -22, 7, 3, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// --- Cannon barrel ---

function drawCannonBarrel(ctx, slot) {
  ctx.save();
  ctx.strokeStyle = "rgba(4, 9, 12, 0.9)";
  ctx.lineWidth = 1.4;
  const barrelGradient = ctx.createLinearGradient(-8, -64, 8, -20);
  barrelGradient.addColorStop(0, "#ffe090");
  barrelGradient.addColorStop(1, "#7f6435");
  ctx.fillStyle = barrelGradient;
  roundedRect(ctx, -7, -66, 14, 48, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "rgba(37, 30, 18, 0.78)";
  [-55, -43, -31].forEach((y) => ctx.fillRect(-8, y, 16, 3));
  ctx.fillStyle = "#17130c";
  ctx.beginPath();
  ctx.moveTo(-12, -72);
  ctx.lineTo(12, -72);
  ctx.lineTo(8, -63);
  ctx.lineTo(-8, -63);
  ctx.closePath();
  ctx.fill();
  if (slot.cooldown > 0 && slot.heat > 7) {
    ctx.strokeStyle = "rgba(255, 210, 92, 0.9)";
    ctx.lineWidth = 2;
    [[0, -80, 0, -68], [-8, -76, 8, -70], [8, -76, -8, -70]].forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
  }
  ctx.fillStyle = "#6c5732";
  roundedRect(ctx, -14, -29, 28, 12, 3);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// --- Machine gun barrel ---

function drawMachineGunBarrel(ctx, slot) {
  ctx.save();
  ctx.strokeStyle = "rgba(4, 9, 12, 0.9)";
  ctx.lineWidth = 1.1;
  const spin = slot.heat > 4 ? performance.now() / 80 : 0;
  ctx.save();
  ctx.translate(0, -38);
  ctx.rotate(spin);
  ctx.fillStyle = "#d8f2ff";
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * 2 * i) / 6;
    const x = Math.cos(angle) * 6;
    const z = Math.sin(angle) * 2;
    roundedRect(ctx, x - 1.7, -23 + z, 3.4, 45, 1.4);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
  if (slot.cooldown > 0 && slot.cooldown < 80) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#ff9d42";
    ctx.beginPath();
    ctx.arc(0, -64, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = "#c79656";
  ctx.beginPath();
  ctx.moveTo(15, -27);
  ctx.quadraticCurveTo(28, -18, 22, -5);
  ctx.stroke();
  ctx.fillStyle = "#c79656";
  for (let i = 0; i < 5; i += 1) ctx.fillRect(18 + (i % 2) * 3, -23 + i * 4, 5, 2);
  ctx.fillStyle = "#7893a3";
  roundedRect(ctx, -15, -31, 30, 14, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#182630";
  ctx.fillRect(-12, -26, 24, 4);
  ctx.restore();
}

// --- Laser emitter ---

function drawLaserEmitter(ctx, slot) {
  ctx.save();
  ctx.strokeStyle = "rgba(4, 9, 12, 0.9)";
  ctx.lineWidth = 1.2;
  const coreGradient = ctx.createLinearGradient(0, -72, 0, -18);
  coreGradient.addColorStop(0, "#b9fbff");
  coreGradient.addColorStop(0.35, "#67e6ff");
  coreGradient.addColorStop(1, "#1b5260");
  ctx.fillStyle = coreGradient;
  roundedRect(ctx, -6, -72, 12, 54, 4);
  ctx.fill();
  ctx.stroke();
  const pulse = 0.35 + 0.25 * Math.sin(performance.now() / 180);
  ctx.strokeStyle = `rgba(103, 230, 255, ${pulse})`;
  ctx.lineWidth = 1.4;
  [-58, -45].forEach((y) => {
    ctx.beginPath();
    ctx.ellipse(0, y, 11, 3, 0, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.fillStyle = "#12323b";
  roundedRect(ctx, -18, -40, 36, 18, 5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#284a55";
  [-15, -9, 9, 15].forEach((x) => ctx.fillRect(x, -38, 3, 14));
  ctx.strokeStyle = "#67e6ff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-13, -31);
  ctx.lineTo(13, -31);
  ctx.stroke();
  const lens = ctx.createRadialGradient(0, -76, 1, 0, -76, 7);
  lens.addColorStop(0, "#ffffff");
  lens.addColorStop(0.45, "#8ff7ff");
  lens.addColorStop(1, "#1b6d80");
  ctx.fillStyle = lens;
  ctx.beginPath();
  ctx.arc(0, -76, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// --- Friendly missiles ---

function drawFriendlyMissiles(ctx) {
  state.friendlyMissiles.forEach((missile) => {
    ctx.save();
    ctx.translate(missile.x, missile.y);
    ctx.scale(state.visualScale, state.visualScale);
    ctx.translate(-missile.x, -missile.y);
    ctx.strokeStyle = MISSILE_DEFS[missile.type].color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    missile.trail.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(missile.x, missile.y);
    ctx.stroke();
    ctx.fillStyle = MISSILE_DEFS[missile.type].color;
    ctx.beginPath();
    ctx.arc(missile.x, missile.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

// --- Enemies ---

function drawEnemies(ctx) {
  state.enemies.forEach((enemy) => {
    const def = ENEMY_DEFS[enemy.type];
    if (enemy.trail?.length) drawEnemySmokeTrail(ctx, enemy.trail);
    if (enemy.type === "bomber") {
      ctx.fillStyle = def.color;
      ctx.strokeStyle = "rgba(220, 235, 240, 0.45)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.ellipse(enemy.x, enemy.y, 24, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (enemy.type === "drone") {
      drawDrone(ctx, enemy, def);
    } else if (enemy.type === "bomb") {
      drawBomb(ctx, enemy, def);
    } else if (enemy.type === "hypersonic") {
      drawIncomingRocket(ctx, enemy, def);
    } else {
      drawIncomingMissile(ctx, enemy, def);
    }
  });
}

function drawEnemySmokeTrail(ctx, trail) {
  trail.forEach((puff, index) => {
    const fade = index / trail.length;
    ctx.globalAlpha = puff.a * Math.pow(fade, 1.25);
    ctx.fillStyle = puff.warm ? "#b7a58e" : "#aab0ad";
    ctx.beginPath();
    ctx.arc(puff.x, puff.y, puff.r * (1.45 - fade * 0.35) * state.visualScale, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function enemyAngle(enemy) {
  return Math.atan2(enemy.vy || 1, enemy.vx || 0) + Math.PI / 2;
}

function drawIncomingMissile(ctx, enemy, def) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.scale(state.visualScale, state.visualScale);
  ctx.rotate(enemyAngle(enemy));
  ctx.fillStyle = def.color;
  ctx.strokeStyle = "rgba(255, 220, 210, 0.65)";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.bezierCurveTo(10, -8, 9, 12, 0, 17);
  ctx.bezierCurveTo(-9, 12, -10, -8, 0, -15);
  ctx.fill();
  ctx.stroke();
  if (enemy.type === "mirv") {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.bezierCurveTo(10, -8, 9, 12, 0, 17);
    ctx.bezierCurveTo(-9, 12, -10, -8, 0, -15);
    ctx.clip();
    for (let y = -10; y < 15; y += 8) {
      ctx.fillStyle = "#f7f4e8";
      ctx.fillRect(-11, y, 22, 4);
      ctx.fillStyle = "#b4262e";
      ctx.fillRect(-11, y + 4, 22, 4);
    }
    ctx.restore();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.78)";
    ctx.stroke();
  } else {
    ctx.fillStyle = "rgba(80, 20, 20, 0.75)";
    ctx.fillRect(-8, 8, 16, 6);
  }
  ctx.restore();
}

function drawIncomingRocket(ctx, enemy, def) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.scale(state.visualScale, state.visualScale);
  ctx.rotate(enemyAngle(enemy));
  ctx.fillStyle = def.color;
  ctx.strokeStyle = "rgba(210, 230, 255, 0.85)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, -22);
  ctx.bezierCurveTo(5, -11, 5, 15, 0, 24);
  ctx.bezierCurveTo(-5, 15, -5, -11, 0, -22);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#e35f45";
  ctx.fillRect(-5, 12, 10, 5);
  ctx.restore();
}

function drawBomb(ctx, enemy, def) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.scale(state.visualScale, state.visualScale);
  ctx.rotate(enemyAngle(enemy) + 0.12);
  ctx.fillStyle = "#6d6658";
  ctx.strokeStyle = "#d8c783";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, -19);
  ctx.bezierCurveTo(13, -11, 14, 10, 0, 22);
  ctx.bezierCurveTo(-14, 10, -13, -11, 0, -19);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#302d29";
  ctx.fillRect(-12, 9, 24, 6);
  ctx.restore();
}

function drawDrone(ctx, enemy, def) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.scale(state.visualScale, state.visualScale);
  ctx.rotate(Math.sin(enemy.wobble) * 0.7);
  ctx.strokeStyle = "rgba(124, 255, 191, 0.72)";
  ctx.fillStyle = def.color;
  ctx.lineWidth = 1.4;
  ctx.fillRect(-4, -3, 8, 6);
  [[-11, -8], [11, -8], [-11, 8], [11, 8]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(x, y, 5, 2, enemy.wobble, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.restore();
}

// --- Bullets ---

function drawBullets(ctx) {
  state.friendlyBullets.forEach((bullet) => {
    ctx.strokeStyle = bullet.color;
    ctx.fillStyle = bullet.color;
    if (bullet.laser) {
      ctx.globalAlpha = bullet.life / 45;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bullet.x, bullet.y);
      ctx.lineTo(bullet.x + bullet.vx, bullet.y + bullet.vy);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, (bullet.radius || 3) * state.visualScale, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

// --- Blasts ---

function drawBlasts(ctx) {
  state.blasts.forEach((blast) => {
    const radius = blast.currentRadius * state.visualScale;
    if (radius <= 0.5) return;
    const alpha = Math.max(0, Math.min(1, 1 - blast.age / blast.life));
    const gradient = ctx.createRadialGradient(blast.x, blast.y, radius * 0.12, blast.x, blast.y, radius);
    if (blast.type === "emp") {
      gradient.addColorStop(0, `rgba(238, 232, 255, ${0.82 * alpha})`);
      gradient.addColorStop(0.58, `rgba(177, 140, 255, ${0.62 * alpha})`);
      gradient.addColorStop(1, `rgba(91, 68, 145, ${0.24 * alpha})`);
    } else {
      gradient.addColorStop(0, `rgba(255, 244, 178, ${0.9 * alpha})`);
      gradient.addColorStop(0.56, `rgba(255, 189, 82, ${0.7 * alpha})`);
      gradient.addColorStop(1, `rgba(255, 95, 95, ${0.28 * alpha})`);
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, radius, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "rgba(1, 3, 5, 0.92)";
  for (let i = 0; i < state.blasts.length; i += 1) {
    const a = state.blasts[i];
    const ar = a.currentRadius * state.visualScale;
    if (ar <= 0.5) continue;
    for (let j = i + 1; j < state.blasts.length; j += 1) {
      const b = state.blasts[j];
      const br = b.currentRadius * state.visualScale;
      if (br <= 0.5) continue;
      const distance = Math.hypot(b.x - a.x, b.y - a.y);
      if (distance >= ar + br || distance <= Math.abs(ar - br) * 0.25) continue;
      ctx.save();
      ctx.beginPath();
      ctx.arc(a.x, a.y, ar, 0, Math.PI * 2);
      ctx.clip();
      ctx.beginPath();
      ctx.arc(b.x, b.y, br, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

// --- Particles ---

function drawParticles(ctx) {
  state.particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, Math.min(1, particle.life / 280));
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size * state.visualScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}
