// =============================================================================
// Renderer — All Canvas drawing: sky, cities, factories, weapons, enemies, effects
// =============================================================================

import { state, installedSlots, missileSlots, turretSlots, firstTurret, maxAmmo, weaponColor, primaryWeaponType, MAX_WEAPON_LEVEL } from "../state.js";
import { MISSILE_DEFS, ENEMY_DEFS, CANVAS_WIDTH, CANVAS_HEIGHT, GROUND_Y, SLOT_OFFSETS } from "../config.js";

const W = CANVAS_WIDTH;
const H = CANVAS_HEIGHT;
const groundY = GROUND_Y;
const CLOUD_LAYERS = [
  { y: 126, speed: 4.2, scale: 1.1, alpha: 0.1, seed: 0, count: 1 },
  { y: 232, speed: 7.4, scale: 1.55, alpha: 0.15, seed: 420, count: 2 },
  { y: 342, speed: 10.2, scale: 2.05, alpha: 0.18, seed: 860, count: 1 },
];

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
  drawPixelSkyGradient(ctx);
  ctx.strokeStyle = "rgba(85, 214, 190, 0.13)";
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 40; y < groundY; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  if (state.cloudsEnabled) drawCloudLayers(ctx);
  ctx.fillStyle = "#1a241c";
  ctx.fillRect(0, groundY, W, 18);
  ctx.fillStyle = "#111a14";
  ctx.fillRect(0, groundY + 18, W, H - groundY - 18);
  ctx.fillStyle = "#060908";
  ctx.fillRect(0, groundY + 44, W, H - groundY - 44);
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

function drawPixelSkyGradient(ctx) {
  const bands = [
    { y: 0, h: 104, color: "#020712" },
    { y: 104, h: 96, color: "#06111e" },
    { y: 200, h: 112, color: "#0a1c2a" },
    { y: 312, h: 120, color: "#102a37" },
    { y: 432, h: groundY - 432, color: "#183745" },
  ];
  bands.forEach((band) => {
    ctx.fillStyle = band.color;
    ctx.fillRect(0, band.y, W, Math.max(0, band.h));
  });
  ctx.fillStyle = "rgba(105, 169, 255, 0.05)";
  for (let y = 72; y < groundY; y += 64) {
    ctx.fillRect(0, y, W, 4);
  }
}

function drawCloudLayers(ctx) {
  const time = performance.now() / 1000;
  CLOUD_LAYERS.forEach((layer) => {
    for (let i = 0; i < layer.count; i += 1) {
      const shapeSeed = layer.seed + i * 137;
      const density = 0.58 + ((shapeSeed * 17) % 38) / 100;
      const width = (170 + ((i * 61 + layer.seed) % 170)) * layer.scale;
      const x = (((i * 520 + layer.seed + time * layer.speed) % (W + width + 420)) - width - 210);
      const y = layer.y + Math.sin(time * 0.22 + i + layer.seed) * 8;
      drawPixelCloud(ctx, x, y, width, layer.scale, layer.alpha, density, shapeSeed);
    }
  });
}

function drawPixelCloud(ctx, x, y, width, scale, alpha, density, seed) {
  const block = Math.max(5, Math.round(6 * scale));
  const height = Math.round((20 + density * 26) * scale);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#b8c6c9";
  drawPixelRect(ctx, x + block * 1, y + block * 2, width * (0.48 + density * 0.22), height * 0.5);
  if (seed % 2 === 0) drawPixelRect(ctx, x + block * 5, y + block, width * 0.22, height * (0.45 + density * 0.28));
  drawPixelRect(ctx, x + width * 0.28, y, width * (0.18 + density * 0.13), height * (0.64 + density * 0.24));
  if (seed % 3 !== 0) drawPixelRect(ctx, x + width * 0.54, y + block, width * 0.26, height * (0.42 + density * 0.18));
  if (density > 0.78) drawPixelRect(ctx, x + width * 0.7, y + block * 3, width * 0.18, height * 0.38);
  ctx.fillStyle = "#d8e0df";
  drawPixelRect(ctx, x + width * 0.18, y + block, width * (0.12 + density * 0.08), block * 2);
  if (seed % 5 !== 0) drawPixelRect(ctx, x + width * 0.48, y + block, width * 0.18, block * 2);
  ctx.fillStyle = "#607984";
  drawPixelRect(ctx, x + block * 2, y + height, width * (0.44 + density * 0.24), block);
  ctx.restore();
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
      ctx.fillStyle = "rgba(102, 168, 255, 0.42)";
      for (let x = -58; x <= 58; x += 8) {
        const y = -18 - Math.round(Math.sqrt(Math.max(0, 58 * 58 - x * x)) * 0.55);
        drawPixelRect(ctx, x, y, 6, 5);
      }
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
        const size = 7 + i * 2;
        drawPixelRect(ctx, chimneyX + Math.sin(t) * 6, -50 - i * 9 - (t % 1) * 6, size, size);
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
  const rows = 3;
  for (let i = 0; i < rows; i += 1) {
    const rowWidth = width * (1 - i * 0.18);
    drawPixelRect(ctx, x - rowWidth / 2, y - height / 2 + i * (height / rows), rowWidth, height / rows);
  }
  ctx.restore();
}

function drawAnchorPad(ctx, x, y, width, height, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(112, 132, 116, 0.5)";
  ctx.lineWidth = 1;
  drawPixelRect(ctx, x - width / 2, y - height / 2 + 4, width, height - 8);
  drawPixelRect(ctx, x - width / 2 + 10, y - height / 2, width - 20, 4);
  drawPixelRect(ctx, x - width / 2 + 10, y + height / 2 - 4, width - 20, 4);
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
  drawPixelRect(ctx, -17, -34, 34, 5);
  drawPixelRect(ctx, -13, -42, 26, 8);
  drawPixelRect(ctx, -8, -49, 16, 7);

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
    ctx.rotate((typeof slot.angle === "number" ? slot.angle : city.turretAngle) + Math.PI / 2);
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
  ctx.beginPath();
  ctx.rect(Math.round(x), Math.round(y), Math.round(width), Math.round(height));
}

// --- Launcher drawing ---

function drawLauncher(ctx, city, slot, color) {
  ctx.save();
  drawGroundShadow(ctx, 0, 1, 92, 13, 0.24);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(4, 9, 12, 0.9)";

  ctx.fillStyle = "#17232d";
  roundedRect(ctx, -43, -22, 86, 16, 4);
  ctx.fill();
  ctx.fillStyle = "#3e5262";
  ctx.fillRect(-43, -22, 86, 5);
  ctx.stroke();

  ctx.fillStyle = "#0d151b";
  ctx.fillRect(-36, -5, 72, 5);
  ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
  ctx.fillRect(-35, -20, 70, 2);

  [-24, 24].forEach((x, index) => {
    ctx.save();
    ctx.translate(x, -35);
    ctx.rotate(index === 0 ? -0.22 : 0.22);
    ctx.fillStyle = "#23384c";
    roundedRect(ctx, -18, -8, 36, 14, 4);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(-18, -8, 36, 4);
    ctx.stroke();
    ctx.fillStyle = "#05090c";
    roundedRect(ctx, 11, -5, 8, 8, 2);
    ctx.fill();
    ctx.fillStyle = "#05090c";
    [-8, 0, 8].forEach((tubeX) => {
      drawPixelRect(ctx, tubeX - 3, -4, 6, 6);
    });
    ctx.fillStyle = slot.ammo > 0 && slot.cooldown <= 0 ? "#5cff9d" : "#ff5f5f";
    drawPixelRect(ctx, -15, 1, 4, 4);
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
  ctx.fillStyle = "#17232c";
  roundedRect(ctx, -28, -22, 56, 16, 5);
  ctx.fill();
  ctx.fillStyle = "#425769";
  ctx.fillRect(-28, -22, 56, 5);
  ctx.stroke();
  ctx.fillStyle = "#0b1218";
  ctx.fillRect(-21, -7, 42, 6);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.38;
  ctx.fillRect(-18, -20, 36, 2);
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(3, 7, 10, 0.82)";
  [-21, -12, 12, 21].forEach((x) => {
    drawPixelRect(ctx, x - 2, -16, 4, 4);
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
  drawPixelRect(ctx, -18, -25, 36, 14);
  drawPixelRect(ctx, -14, -29, 28, 4);
  drawPixelRect(ctx, -14, -11, 28, 4);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.78;
  roundedRect(ctx, -13, -20, 26, 5, 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "rgba(255,255,255,0.18)";
  drawPixelRect(ctx, -11, -24, 12, 3);
  ctx.restore();
}

// --- Cannon barrel ---

function drawCannonBarrel(ctx, slot) {
  ctx.save();
  ctx.strokeStyle = "rgba(4, 9, 12, 0.9)";
  ctx.lineWidth = 1.4;
  ctx.fillStyle = "#7f6435";
  roundedRect(ctx, -7, -66, 14, 48, 3);
  ctx.fill();
  ctx.fillStyle = "#ffe090";
  ctx.fillRect(-7, -66, 5, 48);
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
    drawPixelRect(ctx, -7, -71, 14, 14);
    ctx.fillStyle = "#fff0a6";
    drawPixelRect(ctx, -3, -67, 6, 6);
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = "#c79656";
  ctx.beginPath();
  ctx.moveTo(15, -27);
  ctx.lineTo(25, -19);
  ctx.lineTo(22, -5);
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
  ctx.fillStyle = "#1b5260";
  roundedRect(ctx, -6, -72, 12, 54, 4);
  ctx.fill();
  ctx.fillStyle = "#67e6ff";
  drawPixelRect(ctx, -3, -69, 6, 43);
  ctx.fillStyle = "#b9fbff";
  drawPixelRect(ctx, -1, -66, 2, 18);
  ctx.stroke();
  const pulse = 0.35 + 0.25 * Math.sin(performance.now() / 180);
  ctx.strokeStyle = `rgba(103, 230, 255, ${pulse})`;
  ctx.lineWidth = 1.4;
  [-58, -45].forEach((y) => {
    drawPixelRect(ctx, -11, y - 2, 22, 4);
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
  ctx.fillStyle = "#1b6d80";
  drawPixelRect(ctx, -7, -83, 14, 14);
  ctx.fillStyle = "#8ff7ff";
  drawPixelRect(ctx, -5, -81, 10, 10);
  ctx.fillStyle = "#ffffff";
  drawPixelRect(ctx, -2, -79, 4, 4);
  ctx.restore();
}

// --- Friendly missiles ---

function drawFriendlyMissiles(ctx) {
  state.friendlyMissiles.forEach((missile) => {
    missile.trail.forEach((point, index) => {
      const fade = index / Math.max(1, missile.trail.length - 1);
      const size = (2 + fade * 5) * state.visualScale;
      ctx.globalAlpha = 0.16 + fade * 0.62;
      ctx.fillStyle = missile.type === "seeker" ? "#73a9ff" : "#e9f6ff";
      drawPixelRect(ctx, point.x - size / 2, point.y - size / 2, size, size);
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = MISSILE_DEFS[missile.type].color;
    drawPixelRect(ctx, missile.x - 3 * state.visualScale, missile.y - 6 * state.visualScale, 6 * state.visualScale, 12 * state.visualScale);
    ctx.fillStyle = "#ffffff";
    drawPixelRect(ctx, missile.x - 1 * state.visualScale, missile.y - 4 * state.visualScale, 2 * state.visualScale, 3 * state.visualScale);
  });
}

// --- Enemies ---

function drawEnemies(ctx) {
  state.enemies.forEach((enemy) => {
    const def = ENEMY_DEFS[enemy.type];
    if (enemy.trail?.length) drawEnemySmokeTrail(ctx, enemy.trail);
    if (enemy.type === "bomber") {
      drawBomber(ctx, enemy, def);
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
    const size = puff.r * (1.45 - fade * 0.35) * state.visualScale;
    drawPixelRect(ctx, puff.x - size / 2, puff.y - size / 2, size, size);
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
  drawPixelRect(ctx, -6, -11, 12, 24);
  drawPixelRect(ctx, -4, -15, 8, 4);
  drawPixelRect(ctx, -9, 6, 3, 9);
  drawPixelRect(ctx, 6, 6, 3, 9);
  if (enemy.type === "mirv") {
    for (let y = -10; y < 15; y += 8) {
      ctx.fillStyle = "#f7f4e8";
      drawPixelRect(ctx, -7, y, 14, 4);
      ctx.fillStyle = "#b4262e";
      drawPixelRect(ctx, -7, y + 4, 14, 4);
    }
  } else {
    ctx.fillStyle = "rgba(80, 20, 20, 0.75)";
    drawPixelRect(ctx, -6, 8, 12, 5);
  }
  ctx.restore();
}

function drawIncomingRocket(ctx, enemy, def) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.scale(state.visualScale, state.visualScale);
  ctx.rotate(enemyAngle(enemy));
  ctx.fillStyle = def.color;
  drawPixelRect(ctx, -4, -22, 8, 40);
  drawPixelRect(ctx, -2, -26, 4, 4);
  drawPixelRect(ctx, -7, 10, 3, 10);
  drawPixelRect(ctx, 4, 10, 3, 10);
  ctx.fillStyle = "#e35f45";
  drawPixelRect(ctx, -5, 14, 10, 5);
  ctx.restore();
}

function drawBomber(ctx, enemy, def) {
  const scale = state.visualScale;
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#1d2b35";
  drawPixelRect(ctx, -28, -5, 56, 10);
  ctx.fillStyle = def.color;
  drawPixelRect(ctx, -22, -8, 38, 16);
  drawPixelRect(ctx, 16, -4, 12, 8);
  drawPixelRect(ctx, -4, -19, 24, 7);
  drawPixelRect(ctx, -8, 12, 24, 7);
  ctx.fillStyle = "#e9f6ff";
  drawPixelRect(ctx, -17, -3, 5, 4);
  drawPixelRect(ctx, -7, -3, 5, 4);
  drawPixelRect(ctx, 3, -3, 5, 4);
  ctx.fillStyle = "#ff5f5f";
  drawPixelRect(ctx, 20, -8, 6, 4);
  ctx.restore();
}

function drawBomb(ctx, enemy, def) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  ctx.scale(state.visualScale, state.visualScale);
  ctx.rotate(enemyAngle(enemy) + 0.12);
  ctx.fillStyle = "#6d6658";
  drawPixelRect(ctx, -8, -15, 16, 30);
  drawPixelRect(ctx, -12, -7, 24, 18);
  ctx.fillStyle = def.color;
  drawPixelRect(ctx, -5, -20, 10, 5);
  drawPixelRect(ctx, -9, 15, 18, 5);
  ctx.fillStyle = "#302d29";
  drawPixelRect(ctx, -12, 8, 24, 5);
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
  drawPixelRect(ctx, -5, -4, 10, 8);
  [[-11, -8], [11, -8], [-11, 8], [11, 8]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(x, y);
    ctx.stroke();
    drawPixelRect(ctx, x - 5, y - 1, 10, 2);
    drawPixelRect(ctx, x - 1, y - 5, 2, 10);
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
      const size = (bullet.radius || 3) * 2 * state.visualScale;
      drawPixelRect(ctx, bullet.x - size / 2, bullet.y - size / 2, size, size);
    }
  });
}

// --- Blasts ---

function drawBlasts(ctx) {
  state.blasts.forEach((blast) => {
    const radius = blast.currentRadius * state.visualScale;
    if (radius <= 0.5) return;
    const alpha = Math.max(0, Math.min(1, 1 - blast.age / blast.life));
    const color = blast.type === "emp" ? "#b18cff" : "#ffd56b";
    drawPixelDisk(ctx, blast.x, blast.y, radius, color, alpha, 5 * state.visualScale);
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
      drawPixelIntersection(ctx, a, ar, b, br, 5 * state.visualScale);
    }
  }
}

// --- Particles ---

function drawParticles(ctx) {
  state.particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, Math.min(1, particle.life / 280));
    ctx.fillStyle = particle.color;
    const size = particle.size * state.visualScale;
    drawPixelRect(ctx, particle.x - size / 2, particle.y - size / 2, size, size);
    ctx.globalAlpha = 1;
  });
}

function drawPixelDisk(ctx, x, y, radius, color, alpha = 1, block = 4) {
  const step = Math.max(2, block);
  const left = x - radius;
  const top = y - radius;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  for (let py = top; py <= y + radius; py += step) {
    for (let px = left; px <= x + radius; px += step) {
      const cx = px + step / 2;
      const cy = py + step / 2;
      if (Math.hypot(cx - x, cy - y) <= radius) drawPixelRect(ctx, px, py, step, step);
    }
  }
  ctx.restore();
}

function drawPixelIntersection(ctx, a, ar, b, br, block = 4) {
  const step = Math.max(2, block);
  const left = Math.max(a.x - ar, b.x - br);
  const right = Math.min(a.x + ar, b.x + br);
  const top = Math.max(a.y - ar, b.y - br);
  const bottom = Math.min(a.y + ar, b.y + br);
  for (let py = top; py <= bottom; py += step) {
    for (let px = left; px <= right; px += step) {
      const cx = px + step / 2;
      const cy = py + step / 2;
      if (Math.hypot(cx - a.x, cy - a.y) <= ar && Math.hypot(cx - b.x, cy - b.y) <= br) {
        drawPixelRect(ctx, px, py, step, step);
      }
    }
  }
}

function drawPixelRect(ctx, x, y, width, height) {
  ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(width)), Math.max(1, Math.round(height)));
}
