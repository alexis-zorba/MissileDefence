import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  DIFFICULTY,
  ENEMY_DEFS,
  GROUND_Y,
  MISSILE_DEFS,
  TURRET_DEFS,
  UPGRADE_COSTS,
} from "./config.js";
import { clampAngle, makeId, nearest } from "./utils.js";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const ui = {
  wave: document.getElementById("waveLabel"),
  difficulty: document.getElementById("difficultyLabel"),
  build: document.getElementById("buildLabel"),
  score: document.getElementById("scoreLabel"),
  cities: document.getElementById("cities"),
  overlay: document.getElementById("overlay"),
  intel: document.getElementById("intelButton"),
  intelDialog: document.getElementById("intelDialog"),
  closeIntel: document.getElementById("closeIntelButton"),
  settings: document.getElementById("settingsButton"),
  settingsDialog: document.getElementById("settingsDialog"),
  buildDialog: document.getElementById("buildDialog"),
  closeBuild: document.getElementById("closeBuildButton"),
  buildStartWave: document.getElementById("buildStartWaveButton"),
  buildModal: document.getElementById("buildModalLabel"),
  buildCities: document.getElementById("buildCities"),
  footerCities: document.getElementById("footerCities"),
  start: document.getElementById("startButton"),
  next: document.getElementById("nextWaveButton"),
  pause: document.getElementById("pauseButton"),
  mode: document.getElementById("modeSelect"),
  difficultySelect: document.getElementById("difficultySelect"),
  missileSelect: document.getElementById("missileSelect"),
  turretSelect: document.getElementById("turretSelect"),
};

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

const W = CANVAS_WIDTH;
const H = CANVAS_HEIGHT;
const groundY = GROUND_Y;
const difficulty = DIFFICULTY;
const missileDefs = MISSILE_DEFS;
const turretDefs = TURRET_DEFS;
const enemyDefs = ENEMY_DEFS;
const upgradeCosts = UPGRADE_COSTS;

const state = {
  running: false,
  paused: false,
  betweenWaves: true,
  wave: 1,
  score: 0,
  build: 0,
  selectedCity: 0,
  selectedMissile: "standard",
  selectedTurret: "cannon",
  keys: new Set(),
  lastTime: 0,
  spawnTimer: 0,
  enemiesToSpawn: 0,
  aiMissileTimer: 0,
  aiTurretTimer: 0,
  turretTurnVelocity: 0,
  globalTurretAngle: -Math.PI / 2,
  playerTurretIndex: 1,
  cities: [],
  friendlyMissiles: [],
  friendlyBullets: [],
  enemies: [],
  blasts: [],
  particles: [],
};

function resetGame() {
  const hp = difficulty[ui.difficultySelect.value].cityHp;
  state.running = true;
  state.paused = false;
  state.betweenWaves = true;
  state.wave = 1;
  state.score = 0;
  state.build = 8;
  state.selectedCity = 0;
  state.playerTurretIndex = 1;
  state.turretTurnVelocity = 0;
  state.globalTurretAngle = -Math.PI / 2;
  state.friendlyMissiles = [];
  state.friendlyBullets = [];
  state.enemies = [];
  state.blasts = [];
  state.particles = [];
  state.cities = [0, 1, 2].map((i) => ({
    name: ["Aquila", "Vega", "Orione"][i],
    x: W * (0.22 + i * 0.28),
    y: groundY,
    hp,
    maxHp: hp,
    factory: 1,
    weapon: i === 0 ? "launcher" : i === 1 ? "cannon" : "mg",
    weaponLevel: 1,
    weapons: {
      [i === 0 ? "launcher" : i === 1 ? "cannon" : "mg"]: { level: 1 },
    },
    ammoByWeapon: {
      launcher: i === 0 ? 14 : 0,
      cannon: i === 1 ? 42 : 0,
      mg: i === 2 ? 150 : 0,
      laser: 0,
    },
    missileAmmoLevel: 1,
    turretAmmoLevel: 1,
    blastRadiusLevel: 1,
    blastLifeLevel: 1,
    shield: 0,
    turretAngle: state.globalTurretAngle,
    ruinSeed: Math.random(),
    cooldown: 0,
    heat: 0,
    disabled: 0,
  }));
  ui.next.disabled = false;
  setOverlay("Difese pronte", "Spendi il credito costruzione, poi avvia la prossima ondata.");
  openBuildDialog(true);
  updateUi();
}

function startWave() {
  if (!state.running) resetGame();
  state.betweenWaves = false;
  state.enemiesToSpawn = Math.ceil((8 + state.wave * 2.15) * difficulty[ui.difficultySelect.value].count);
  state.spawnTimer = 350;
  state.aiMissileTimer = 0;
  state.aiTurretTimer = 0;
  state.friendlyMissiles = [];
  state.friendlyBullets = [];
  state.blasts = [];
  ui.next.disabled = true;
  closeBuildDialog();
  setOverlay("", "");
}

function finishWave() {
  state.betweenWaves = true;
  const cfg = difficulty[ui.difficultySelect.value];
  const produced = state.cities.reduce((sum, city) => {
    if (city.hp <= 0) return sum;
    const damagePenalty = city.hp / city.maxHp < 0.5 ? 0.5 : 1;
    return sum + Math.ceil(city.factory * cfg.build * damagePenalty);
  }, 0);
  state.build += produced;
  state.cities.forEach((city) => {
    if (city.hp > 0) {
      Object.keys(city.weapons).forEach((weapon) => {
        city.ammoByWeapon[weapon] = Math.min(maxAmmo(city, weapon), currentAmmo(city, weapon) + replenishAmmo(city, weapon));
      });
      city.disabled = 0;
      city.heat = Math.max(0, city.heat - 40);
      city.shield = Math.min(city.shield, 1);
    }
  });
  setOverlay(`Ondata ${state.wave} respinta`, `Le fabbriche hanno prodotto ${produced} punti costruzione.`);
  showCreditBump();
  state.wave += 1;
  ui.next.disabled = false;
  openBuildDialog();
  updateUi();
}

function setOverlay(title, text) {
  ui.overlay.style.display = title ? "flex" : "none";
  ui.overlay.innerHTML = title ? `<strong>${title}</strong><span>${text}</span>` : "";
}

function updateUi() {
  ui.wave.textContent = state.wave;
  ui.difficulty.textContent = difficulty[ui.difficultySelect.value].label;
  ui.build.textContent = state.build;
  ui.buildModal.textContent = state.build;
  ui.score.textContent = state.score;
  renderCities();
  renderFooterCities();
  renderBuildCities();
}

function renderCities() {
  ui.cities.innerHTML = state.cities
    .map((city, index) => {
      const selected = index === state.selectedCity ? " selected" : "";
      const hpPct = Math.max(0, (city.hp / city.maxHp) * 100);
      const heatPct = Math.min(100, city.heat);
      const weapon = weaponLabel(city.weapon);
      const installed = Object.keys(city.weapons);
      return `
        <article class="city-card${selected}" data-city="${index}">
          <header><strong>${city.name}</strong><span>${weapon} L${city.weaponLevel}</span></header>
          <div class="bars">
            <div class="bar health"><span style="width:${hpPct}%"></span></div>
            <div class="bar"><span style="width:${heatPct}%"></span></div>
          </div>
          <div class="city-meta">
            <span>Fabbrica ${city.factory}</span>
            <span>${activeAmmoText(city)}</span>
            <span>Scudo ${city.shield ? "si" : "no"}</span>
            <span>Blast ${city.blastRadiusLevel}/${city.blastLifeLevel}</span>
          </div>
          <select class="weapon-select" data-city-weapon="${index}">
            ${installed.map((id) => `<option value="${id}"${id === city.weapon ? " selected" : ""}>${weaponLabel(id)} L${city.weapons[id].level}</option>`).join("")}
          </select>
        </article>
      `;
    })
    .join("");
}

function renderBuildCities() {
  ui.buildCities.innerHTML = state.cities
    .map((city, index) => {
      const selected = index === state.selectedCity ? " selected" : "";
      const hpPct = Math.round(Math.max(0, (city.hp / city.maxHp) * 100));
      const weapons = Object.keys(city.weapons).map((id) => `${weaponLabel(id)} L${city.weapons[id].level}`).join(", ");
      return `
        <article class="build-city${selected}" data-build-city="${index}">
          <strong>${city.name}</strong>
          <div class="city-meta"><span>Vita ${hpPct}%</span><span>Fabbrica ${city.factory}</span></div>
          <div class="city-meta"><span>${weapons || "Nessuna arma"}</span><span>${activeAmmoText(city)}</span></div>
          <div class="city-meta"><span>Blast ${city.blastRadiusLevel}/${city.blastLifeLevel}</span><span>Scudo ${city.shield ? "si" : "no"}</span></div>
        </article>
      `;
    })
    .join("");
}

function renderFooterCities() {
  ui.footerCities.innerHTML = state.cities.map((city) => {
    const hpPct = city.maxHp > 0 ? Math.max(0, (city.hp / city.maxHp) * 100) : 0;
    const weaponBars = Object.keys(city.weapons).map((weapon) => {
      const ammoPct = maxAmmo(city, weapon) > 0 ? Math.min(100, (currentAmmo(city, weapon) / maxAmmo(city, weapon)) * 100) : 0;
      return `
        <div class="footer-bar" title="${weaponLabel(weapon)}">
          <span style="width:${ammoPct}%; background:${weaponColor(weapon)}"></span>
        </div>
      `;
    }).join("");
    return `
      <article class="footer-city">
        <div class="footer-city-head">
          <strong>${city.name}</strong>
          <span class="footer-city-name">F${city.factory}</span>
        </div>
        <div class="footer-bars">
          <div class="footer-bar health"><span style="width:${hpPct}%; background:${hpPct > 35 ? "#55d6be" : "#ff5f5f"}"></span></div>
          ${weaponBars}
        </div>
      </article>
    `;
  }).join("");
}

function weaponLabel(id) {
  if (id === "launcher") return "Lanciamissili";
  return turretDefs[id]?.label || "Nessuna";
}

function setActiveWeapon(city, weapon) {
  if (!city?.weapons?.[weapon]) return;
  city.weapon = weapon;
  city.weaponLevel = city.weapons[weapon].level;
  if (weapon !== "launcher") state.selectedTurret = weapon;
}

function setActiveTurretForAll(weapon) {
  state.cities.forEach((city) => {
    if (city.weapons?.[weapon]) setActiveWeapon(city, weapon);
  });
}

function currentAmmo(city, weapon) {
  return city?.ammoByWeapon?.[weapon] || 0;
}

function activeAmmoText(city) {
  if (!city || city.hp <= 0) return "Distrutta";
  const weapon = city.weapon === "none" ? firstWeapon(city) : city.weapon;
  return weapon ? `Mun. ${currentAmmo(city, weapon)}/${maxAmmo(city, weapon)}` : "Senza armi";
}

function firstWeapon(city) {
  return Object.keys(city.weapons)[0];
}

function maxAmmo(city, weapon) {
  const level = city.weapons[weapon]?.level || 1;
  const missileAmmoLevel = city.missileAmmoLevel || 1;
  const turretAmmoLevel = city.turretAmmoLevel || 1;
  if (weapon === "launcher") return 18 + level * 6 + missileAmmoLevel * 4;
  if (weapon === "cannon") return 36 + level * 10 + turretAmmoLevel * 8;
  if (weapon === "mg") return 120 + level * 28 + turretAmmoLevel * 18;
  if (weapon === "laser") return 70 + level * 18 + turretAmmoLevel * 10;
  return 0;
}

function replenishAmmo(city, weapon) {
  const factory = city.factory || 0;
  const missileAmmoLevel = city.missileAmmoLevel || 1;
  const turretAmmoLevel = city.turretAmmoLevel || 1;
  if (weapon === "launcher") return 5 + factory * 2 + missileAmmoLevel;
  if (weapon === "cannon") return 10 + factory * 4 + turretAmmoLevel * 2;
  if (weapon === "mg") return 36 + factory * 12 + turretAmmoLevel * 5;
  if (weapon === "laser") return 18 + factory * 6 + turretAmmoLevel * 3;
  return 0;
}

function seedAmmo(city, weapon) {
  city.ammoByWeapon[weapon] = Math.max(currentAmmo(city, weapon), Math.ceil(maxAmmo(city, weapon) * 0.45));
}

function openBuildDialog(initial = false) {
  if (!ui.buildDialog.open && state.betweenWaves) ui.buildDialog.showModal();
  if (initial) showCreditBump();
}

function closeBuildDialog() {
  if (ui.buildDialog.open) ui.buildDialog.close();
}

function showCreditBump() {
  const banner = ui.buildModal.closest(".credit-banner");
  banner.classList.add("bump");
  window.setTimeout(() => banner.classList.remove("bump"), 220);
}

function spendUpgrade(kind) {
  if (!state.betweenWaves || !state.running) return;
  const cost = upgradeCosts[kind];
  if (state.build < cost) return;
  const city = state.cities[state.selectedCity];
  if (!city) return;

  if (kind === "repair") {
    if (city.hp <= 0) {
      city.hp = Math.min(city.maxHp * 0.45, city.maxHp);
      city.factory = Math.max(1, city.factory);
      city.weapons ||= {};
      city.ammoByWeapon ||= {};
      city.missileAmmoLevel ||= 1;
      city.turretAmmoLevel ||= 1;
      city.blastRadiusLevel ||= 1;
      city.blastLifeLevel ||= 1;
      city.ruinSeed = Math.random();
    } else {
      city.hp = Math.min(city.maxHp, city.hp + 32);
    }
  } else if (kind === "factory") {
    if (city.hp <= 0 || city.factory >= 5) return;
    city.factory += 1;
  } else if (kind === "shield") {
    if (city.hp <= 0) return;
    city.shield = 1;
  } else if (kind === "ammo") {
    if (!city.weapons.launcher) return;
    city.missileAmmoLevel = Math.min(5, city.missileAmmoLevel + 1);
    city.ammoByWeapon.launcher = Math.min(maxAmmo(city, "launcher"), currentAmmo(city, "launcher") + replenishAmmo(city, "launcher"));
  } else if (kind === "turretAmmo") {
    if (!["cannon", "mg", "laser"].some((weapon) => city.weapons[weapon])) return;
    city.turretAmmoLevel = Math.min(5, city.turretAmmoLevel + 1);
    ["cannon", "mg", "laser"].forEach((weapon) => {
      if (city.weapons[weapon]) city.ammoByWeapon[weapon] = Math.min(maxAmmo(city, weapon), currentAmmo(city, weapon) + replenishAmmo(city, weapon));
    });
  } else if (kind === "blastRadius") {
    if (!city.weapons.launcher) return;
    city.blastRadiusLevel = Math.min(5, city.blastRadiusLevel + 1);
  } else if (kind === "blastLife") {
    if (!city.weapons.launcher) return;
    city.blastLifeLevel = Math.min(5, city.blastLifeLevel + 1);
  } else {
    const newWeapon = kind === "launcher" ? "launcher" : kind;
    if (city.weapons[newWeapon]) {
      city.weapons[newWeapon].level = Math.min(5, city.weapons[newWeapon].level + 1);
    } else {
      city.weapons[newWeapon] = { level: 1 };
      seedAmmo(city, newWeapon);
    }
    setActiveWeapon(city, newWeapon);
    city.cooldown = 0;
    city.heat = 0;
  }

  state.build -= cost;
  updateUi();
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

function launchMissileFromCity(city, target, type, byAi = false) {
  if (state.betweenWaves || state.paused) return false;
  if (!city) return false;
  const def = missileDefs[type];
  const launcherLevel = city.weapons.launcher?.level || 1;
  const unlocked = launcherLevel >= def.unlock || type === "standard";
  const useType = unlocked ? type : "standard";
  const useDef = missileDefs[useType];
  if (currentAmmo(city, "launcher") < useDef.cost) return false;
  city.ammoByWeapon.launcher -= useDef.cost;
  state.friendlyMissiles.push({
    x: city.x,
    y: city.y - 18,
    targetX: target.x,
    targetY: Math.min(target.y, groundY - 18),
    type: useType,
    byAi,
    blastRadiusLevel: city.blastRadiusLevel,
    blastLifeLevel: city.blastLifeLevel,
    trail: [],
  });
  updateUi();
  return true;
}

function launchMissile(target, type, byAi = false) {
  if (state.betweenWaves || state.paused) return false;
  const launchers = state.cities.filter((city) => city.hp > 0 && city.weapons.launcher && city.disabled <= 0);
  if (byAi) {
    const city = nearest(launchers.filter((candidate) => currentAmmo(candidate, "launcher") >= missileDefs[type].cost), target) || launchers[0];
    return launchMissileFromCity(city, target, type, true);
  }
  return launchers
    .filter((city) => currentAmmo(city, "launcher") >= missileDefs[type].cost)
    .map((city) => launchMissileFromCity(city, target, type, false))
    .some(Boolean);
}

function fireTurret(city, type, dt, byAi = false) {
  if (!city || city.hp <= 0 || city.disabled > 0 || !city.weapons[type]) return;
  const def = turretDefs[type] || turretDefs[city.weapon];
  const level = city.weapons[type]?.level || 1;
  if (city.cooldown > 0 || city.heat >= 100) return;
  if (currentAmmo(city, type) < def.ammoCost) return;
  city.ammoByWeapon[type] -= def.ammoCost;
  if (type === "laser") {
    const target = findTargetAlongRay(city, city.turretAngle, 18);
    if (target) {
      target.hp -= def.damage * dt * (1 + level * 0.22);
      state.particles.push({ x: target.x, y: target.y, life: 90, color: def.color, size: 4 });
    }
    state.friendlyBullets.push({
      x: city.x,
      y: city.y - 24,
      vx: Math.cos(city.turretAngle) * 900,
      vy: Math.sin(city.turretAngle) * 900,
      life: 45,
      laser: true,
      color: def.color,
    });
  } else {
    state.friendlyBullets.push({
      x: city.x,
      y: city.y - 24,
      vx: Math.cos(city.turretAngle) * def.speed,
      vy: Math.sin(city.turretAngle) * def.speed,
      damage: def.damage * (1 + level * 0.18),
      life: 120,
      radius: type === "cannon" ? 4 : 2.5,
      color: def.color,
    });
  }
  city.heat += def.heat;
  city.cooldown = Math.max(40, def.cooldown - level * 28);
  if (byAi) city.cooldown *= difficulty[ui.difficultySelect.value].ai;
  updateUi();
}

function firePlayerTurrets(dt) {
  state.cities.forEach((city) => {
    if (city.hp <= 0) return;
    const type = city.weapon !== "launcher" && city.weapons[city.weapon] ? city.weapon : firstTurret(city);
    if (!type) return;
    fireTurret(city, type, dt);
  });
}

function spawnEnemy() {
  const wave = state.wave;
  const roll = Math.random();
  let type = "missile";
  if (wave >= 13 && roll > 0.82) type = "jammer";
  else if (wave >= 10 && roll > 0.76) type = "bomber";
  else if (wave >= 8 && roll > 0.72) type = "armored";
  else if (wave >= 7 && roll > 0.58) type = "mirv";
  else if (wave >= 5 && roll > 0.7) type = "hypersonic";
  else if (wave >= 4 && roll > 0.55) type = "drone";

  const cfg = difficulty[ui.difficultySelect.value];
  if (type === "bomber") {
    const fromLeft = Math.random() > 0.5;
    state.enemies.push({
      type,
      x: fromLeft ? -40 : W + 40,
      y: 70 + Math.random() * 120,
      vx: (fromLeft ? 1 : -1) * (1.15 + wave * 0.025) * cfg.speed,
      vy: 0,
      hp: enemyDefs[type].hp,
      bombTimer: 550 + Math.random() * 900,
      radius: enemyDefs[type].radius,
    });
    return;
  }

  const target = pickLivingCity();
  if (!target) return;
  const x = Math.random() * W;
  const y = -12;
  const tx = target.x + (Math.random() - 0.5) * 86;
  const ty = groundY;
  const dx = tx - x;
  const dy = ty - y;
  const length = Math.hypot(dx, dy);
  const base = type === "hypersonic" ? 2.65 : type === "drone" ? 0.86 : 1.15;
  const speed = (base + wave * 0.045 + Math.random() * 0.35) * cfg.speed;
  state.enemies.push({
    type,
    x,
    y,
    vx: (dx / length) * speed,
    vy: (dy / length) * speed,
    hp: enemyDefs[type].hp,
    targetX: tx,
    targetY: ty,
    splitAt: type === "mirv" ? 190 + Math.random() * 160 : null,
    radius: enemyDefs[type].radius,
    wobble: Math.random() * Math.PI * 2,
    trail: [],
  });
}

function update(dt) {
  if (!state.running || state.paused) return;
  const seconds = dt / 1000;
  state.cities.forEach((city) => {
    city.cooldown = Math.max(0, city.cooldown - dt);
    city.disabled = Math.max(0, city.disabled - dt);
    city.heat = Math.max(0, city.heat - seconds * 16);
  });

  if (!state.betweenWaves) {
    state.spawnTimer -= dt;
    if (state.enemiesToSpawn > 0 && state.spawnTimer <= 0) {
      spawnEnemy();
      state.enemiesToSpawn -= 1;
      state.spawnTimer = Math.max(160, 980 - state.wave * 34 + Math.random() * 420);
    }
    updateAi(dt);
  }

  updatePlayerTurret(dt);
  updateMissiles();
  updateBullets(dt);
  updateEnemies(dt);
  updateBlasts(dt);
  updateParticles(dt);
  cleanup();

  if (!state.betweenWaves && state.enemiesToSpawn <= 0 && state.enemies.length === 0) {
    finishWave();
  }

  if (state.running && state.cities.every((city) => city.hp <= 0)) {
    state.running = false;
    state.betweenWaves = true;
    setOverlay("Citta distrutte", `Punteggio finale: ${state.score}. Premi Avvia per ricominciare.`);
    ui.next.disabled = true;
  }
}

function updateAi(dt) {
  const mode = ui.mode.value;
  state.aiMissileTimer -= dt;
  state.aiTurretTimer -= dt;

  if ((mode === "turret" || mode === "missiles") && mode === "turret" && state.aiMissileTimer <= 0) {
    const target = priorityEnemy();
    if (target) {
      launchMissile({ x: target.x + target.vx * 24, y: target.y + target.vy * 24 }, pickAiMissile(target), true);
      state.aiMissileTimer = 900 * difficulty[ui.difficultySelect.value].ai;
    }
  }

  if ((mode === "missiles" || mode === "turret") && mode === "missiles" && state.aiTurretTimer <= 0) {
    autoTurrets(dt);
    state.aiTurretTimer = 80 * difficulty[ui.difficultySelect.value].ai;
  }

  if (mode === "coop") return;
}

function autoTurrets(dt) {
  state.cities.forEach((city) => {
    if (city.hp <= 0) return;
    const active = city.weapon !== "launcher" && city.weapons[city.weapon] ? city.weapon : firstTurret(city);
    if (!active) return;
    const target = nearest(state.enemies, city);
    if (!target) return;
    city.turretAngle = clampAngle(Math.atan2(target.y - city.y, target.x - city.x), -Math.PI + 0.14, -0.14);
    fireTurret(city, active, dt, true);
  });
}

function updatePlayerTurret(dt) {
  const mode = ui.mode.value;
  if (mode !== "turret" && mode !== "coop") return;
  const input = (state.keys.has("ArrowRight") ? 1 : 0) - (state.keys.has("ArrowLeft") ? 1 : 0);
  const targetVelocity = input * 1.7;
  state.turretTurnVelocity += (targetVelocity - state.turretTurnVelocity) * Math.min(1, dt / 110);
  state.globalTurretAngle += state.turretTurnVelocity * (dt / 1000);
  state.globalTurretAngle = clampAngle(state.globalTurretAngle, -Math.PI + 0.1, -0.1);
  state.cities.forEach((city) => {
    if (firstTurret(city)) city.turretAngle = state.globalTurretAngle;
  });
  if (state.keys.has("Space")) firePlayerTurrets(dt);
}

function firstTurret(city) {
  return ["cannon", "mg", "laser"].find((id) => city.weapons[id]);
}

function updateMissiles() {
  state.friendlyMissiles.forEach((missile) => {
    const def = missileDefs[missile.type];
    if (missile.type === "guided") {
      const target = nearest(state.enemies, missile);
      if (target) {
        missile.targetX += (target.x - missile.targetX) * 0.035;
        missile.targetY += (target.y - missile.targetY) * 0.035;
      }
    }
    const dx = missile.targetX - missile.x;
    const dy = missile.targetY - missile.y;
    const distance = Math.hypot(dx, dy);
    missile.trail.push({ x: missile.x, y: missile.y });
    if (missile.trail.length > 18) missile.trail.shift();
    if (distance <= def.speed) {
      const radius = def.radius * (1 + (missile.blastRadiusLevel - 1) * 0.16);
      createBlast(missile.targetX, missile.targetY, radius, def.damage, missile.type, missile.blastLifeLevel);
      missile.done = true;
      if (missile.type === "frag") {
        for (let i = 0; i < 4; i += 1) {
          const angle = (Math.PI * 2 * i) / 4 + Math.random() * 0.4;
          createBlast(missile.targetX + Math.cos(angle) * 36, missile.targetY + Math.sin(angle) * 24, 24 * (1 + (missile.blastRadiusLevel - 1) * 0.12), 0.85, "frag", missile.blastLifeLevel);
        }
      }
    } else {
      missile.x += (dx / distance) * def.speed;
      missile.y += (dy / distance) * def.speed;
    }
  });
}

function updateBullets(dt) {
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

function updateEnemies(dt) {
  state.enemies.forEach((enemy) => {
    const def = enemyDefs[enemy.type];
    if (enemy.type === "drone") {
      enemy.wobble += 0.12;
      enemy.x += Math.sin(enemy.wobble * 1.7) * 2.6 + Math.sin(enemy.wobble * 4.1) * 0.8;
      enemy.y += Math.cos(enemy.wobble * 2.3) * 1.15;
    } else if (enemy.type !== "bomber" && enemy.type !== "bomb") {
      enemy.trail ||= [];
      enemy.trail.push({
        x: enemy.x - enemy.vx * 7 + (Math.random() - 0.5) * 4,
        y: enemy.y - enemy.vy * 7 + (Math.random() - 0.5) * 4,
        r: 3 + Math.random() * 5,
        a: 0.28 + Math.random() * 0.18,
      });
      if (enemy.trail.length > 22) enemy.trail.shift();
    }
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;

    if (enemy.type === "bomber") {
      enemy.bombTimer -= dt;
      if (enemy.bombTimer <= 0) {
        dropBomb(enemy);
        enemy.bombTimer = 700 + Math.random() * 750;
      }
      if (enemy.x < -80 || enemy.x > W + 80) enemy.dead = true;
    }

    if (enemy.type === "mirv" && enemy.splitAt && enemy.y >= enemy.splitAt) {
      splitMirv(enemy);
      enemy.dead = true;
    }

    if (enemy.type === "jammer") {
      state.cities.forEach((city) => {
        if (city.hp > 0 && Math.hypot(city.x - enemy.x, city.y - enemy.y) < 175) city.disabled = 260;
      });
    }

    if (enemy.hp <= 0) {
      enemy.dead = true;
      state.score += def.score;
      burst(enemy.x, enemy.y, def.color, 10);
    }

    if (enemy.y >= groundY - 8 && enemy.type !== "bomber") {
      damageCity(enemy);
      enemy.dead = true;
      createBlast(enemy.x, groundY - 8, 24, 0, "impact");
    }
  });
}

function updateBlasts(dt) {
  state.blasts.forEach((blast) => {
    blast.age += dt;
    const progress = blast.age / blast.life;
    blast.currentRadius = blast.radius * Math.sin(Math.min(1, progress) * Math.PI);
    state.enemies.forEach((enemy) => {
      if (enemy.dead || enemy.hitBy?.has(blast.id)) return;
      const distance = Math.hypot(enemy.x - blast.x, enemy.y - blast.y);
      if (distance < blast.currentRadius + enemy.radius) {
        const damage = blast.type === "emp" && ["drone", "jammer", "bomb"].includes(enemy.type) ? 2 : blast.damage;
        enemy.hp -= damage;
        enemy.hitBy ||= new Set();
        enemy.hitBy.add(blast.id);
      }
    });
  });
}

function updateParticles(dt) {
  state.particles.forEach((particle) => {
    particle.life -= dt;
    particle.x += particle.vx || 0;
    particle.y += particle.vy || 0;
  });
}

function cleanup() {
  state.friendlyMissiles = state.friendlyMissiles.filter((missile) => !missile.done);
  state.friendlyBullets = state.friendlyBullets.filter((bullet) => !bullet.done && bullet.life > 0);
  state.enemies = state.enemies.filter((enemy) => !enemy.dead);
  state.blasts = state.blasts.filter((blast) => blast.age < blast.life);
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function createBlast(x, y, radius, damage, type, lifeLevel = 1) {
  state.blasts.push({
    id: makeId(),
    x,
    y,
    radius,
    damage,
    type,
    age: 0,
    life: (type === "emp" ? 620 : 520) * (1 + (lifeLevel - 1) * 0.18),
    currentRadius: 0,
  });
  burst(x, y, missileDefs[type]?.color || "#ff775f", 9);
}

function burst(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2.8;
    state.particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 260 + Math.random() * 220,
      color,
      size: 2 + Math.random() * 4,
    });
  }
}

function splitMirv(enemy) {
  for (let i = 0; i < 3; i += 1) {
    const target = pickLivingCity();
    if (!target) continue;
    const tx = target.x + (i - 1) * 52 + (Math.random() - 0.5) * 30;
    const ty = groundY;
    const dx = tx - enemy.x;
    const dy = ty - enemy.y;
    const length = Math.hypot(dx, dy);
    const speed = 1.72 * difficulty[ui.difficultySelect.value].speed;
    state.enemies.push({
      type: "missile",
      x: enemy.x,
      y: enemy.y,
      vx: (dx / length) * speed,
      vy: (dy / length) * speed,
      hp: 0.75,
      targetX: tx,
      targetY: ty,
      radius: 5,
    });
  }
}

function dropBomb(enemy) {
  const target = pickLivingCity();
  const dx = (target?.x || W / 2) - enemy.x;
  state.enemies.push({
    type: "bomb",
    x: enemy.x,
    y: enemy.y + 12,
    vx: Math.sign(dx) * 0.35,
    vy: 1.65 * difficulty[ui.difficultySelect.value].speed,
    hp: enemyDefs.bomb.hp,
    radius: enemyDefs.bomb.radius,
  });
}

function damageCity(enemy) {
  const city = nearest(state.cities.filter((candidate) => candidate.hp > 0), enemy);
  if (!city) return;
  const damage = enemyDefs[enemy.type].damage;
  if (city.shield > 0) {
    city.shield = 0;
    return;
  }
  city.hp = Math.max(0, city.hp - damage);
  if (city.hp <= 0) {
    city.factory = 0;
    city.weapon = "none";
    city.weaponLevel = 0;
    city.weapons = {};
    city.ammoByWeapon = {};
  }
  updateUi();
}

function priorityEnemy() {
  const weights = { mirv: 9, hypersonic: 8, bomber: 7, jammer: 7, armored: 6, bomb: 6, drone: 4, missile: 5 };
  return [...state.enemies]
    .filter((enemy) => enemy.y < groundY)
    .sort((a, b) => (weights[b.type] || 1) - (weights[a.type] || 1) || b.y - a.y)[0];
}

function pickAiMissile(enemy) {
  if (enemy.type === "drone" || enemy.type === "jammer") return "emp";
  if (enemy.type === "mirv") return "guided";
  if (enemy.type === "armored") return "he";
  return "standard";
}

function findTargetAlongRay(city, angle, width) {
  let best = null;
  let bestProjection = Infinity;
  state.enemies.forEach((enemy) => {
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

function pickLivingCity() {
  const living = state.cities.filter((city) => city.hp > 0);
  return living[Math.floor(Math.random() * living.length)];
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  drawSky();
  drawCities();
  drawFriendlyMissiles();
  drawEnemies();
  drawBullets();
  drawBlasts();
  drawParticles();
  drawCrosshair();
}

function drawSky() {
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
  ctx.fillStyle = "#152017";
  ctx.fillRect(0, groundY + 20, W, H - groundY);
  ctx.strokeStyle = "#43554b";
  ctx.beginPath();
  ctx.moveTo(0, groundY + 20);
  ctx.lineTo(W, groundY + 20);
  ctx.stroke();
}

function drawCities() {
  state.cities.forEach((city, index) => {
    const alive = city.hp > 0;
    const hpRatio = city.maxHp > 0 ? city.hp / city.maxHp : 0;
    const width = 78 + city.factory * 20;
    const buildingCount = 4 + city.factory;
    const spacing = width / buildingCount;
    ctx.save();
    ctx.translate(city.x, city.y);
    ctx.fillStyle = alive ? "#4d6570" : "#2c2322";
    for (let i = 0; i < buildingCount; i += 1) {
      const localX = -width / 2 + i * spacing + spacing * 0.18;
      const intact = alive && i / buildingCount < Math.max(0.18, hpRatio + 0.18);
      const h = intact ? 24 + ((i + city.factory) % 4) * 9 : 7 + ((i * 5 + Math.floor(city.ruinSeed * 10)) % 9);
      ctx.fillStyle = intact ? "#4d6570" : "#3a2826";
      ctx.fillRect(localX, -h, spacing * 0.64, h);
    }
    ctx.fillStyle = alive ? "#b6d2d6" : "#5f3b36";
    ctx.fillRect(-width / 2 - 8, -10, width + 16, 16);
    if (city.shield && alive) {
      ctx.strokeStyle = "rgba(102, 168, 255, 0.7)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, -18, 62, Math.PI, Math.PI * 2);
      ctx.stroke();
    }
    if (alive && city.weapon !== "none") drawWeapon(city, isTurretControlled(city));
    drawCityReadout(city);
    ctx.restore();
  });
}

function drawCityReadout(city) {
  const hpPct = city.maxHp > 0 ? Math.max(0, city.hp / city.maxHp) : 0;
  const weapons = Object.keys(city.weapons);
  const panelHeight = 14 + weapons.length * 5;
  ctx.fillStyle = "rgba(2, 5, 8, 0.72)";
  ctx.fillRect(-54, 18, 108, panelHeight);
  ctx.fillStyle = "#23313a";
  ctx.fillRect(-48, 22, 96, 8);
  ctx.fillStyle = hpPct > 0.35 ? "#55d6be" : "#ff5f5f";
  ctx.fillRect(-48, 22, 96 * hpPct, 8);
  weapons.forEach((weapon, index) => {
    const max = maxAmmo(city, weapon);
    const ammoPct = max > 0 ? Math.min(1, currentAmmo(city, weapon) / max) : 0;
    const y = 33 + index * 5;
    ctx.fillStyle = "#243037";
    ctx.fillRect(-48, y, 96, 4);
    ctx.fillStyle = weaponColor(weapon);
    ctx.fillRect(-48, y, 96 * ammoPct, 4);
  });
}

function drawWeapon(city, controlled) {
  const color = city.disabled > 0 ? "#7a4c7e" : controlled ? "#55d6be" : weaponColor(city.weapon);
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(5, 12, 16, 0.82)";
  ctx.lineWidth = 2;
  if (city.weapon === "launcher") {
    ctx.fillStyle = "#293848";
    ctx.fillRect(-37, -22, 74, 15);
    ctx.strokeRect(-37, -22, 74, 15);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(0, -27, 18, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.save();
    ctx.rotate(-0.18);
    ctx.fillRect(-36, -42, 28, 8);
    ctx.strokeRect(-36, -42, 28, 8);
    ctx.restore();
    ctx.save();
    ctx.rotate(0.18);
    ctx.fillRect(8, -42, 28, 8);
    ctx.strokeRect(8, -42, 28, 8);
    ctx.restore();
    return;
  }
  ctx.save();
  ctx.rotate(city.turretAngle + Math.PI / 2);
  if (city.weapon === "mg") {
    ctx.fillStyle = "#d8f2ff";
    ctx.fillRect(-10, -55, 4, 43);
    ctx.fillRect(-2, -58, 4, 46);
    ctx.fillRect(6, -55, 4, 43);
    ctx.fillStyle = "#7d98a8";
    ctx.fillRect(-13, -22, 26, 10);
  } else if (city.weapon === "laser") {
    ctx.fillStyle = "#67e6ff";
    ctx.fillRect(-5, -64, 10, 50);
    ctx.fillStyle = "#1b5260";
    ctx.fillRect(-12, -34, 24, 16);
    ctx.strokeStyle = "#67e6ff";
    ctx.strokeRect(-14, -36, 28, 20);
  } else {
    ctx.fillStyle = "#f8d16b";
    ctx.fillRect(-7, -61, 14, 47);
    ctx.fillStyle = "#655235";
    ctx.fillRect(-11, -23, 22, 9);
  }
  ctx.restore();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, -14, 17, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function weaponColor(weapon) {
  if (weapon === "launcher") return "#8fb7ff";
  return turretDefs[weapon]?.color || "#d6dfe3";
}

function drawFriendlyMissiles() {
  state.friendlyMissiles.forEach((missile) => {
    ctx.strokeStyle = missileDefs[missile.type].color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    missile.trail.forEach((point, index) => {
      if (index === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.lineTo(missile.x, missile.y);
    ctx.stroke();
    ctx.fillStyle = missileDefs[missile.type].color;
    ctx.beginPath();
    ctx.arc(missile.x, missile.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawEnemies() {
  state.enemies.forEach((enemy) => {
    const def = enemyDefs[enemy.type];
    if (enemy.trail?.length) drawEnemySmokeTrail(enemy.trail);
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 1.5;
    if (enemy.type !== "bomber" && enemy.type !== "drone") {
      ctx.beginPath();
      ctx.moveTo(enemy.x - enemy.vx * 16, enemy.y - enemy.vy * 16);
      ctx.lineTo(enemy.x, enemy.y);
      ctx.stroke();
    }
    ctx.fillStyle = def.color;
    ctx.beginPath();
    if (enemy.type === "bomber") {
      ctx.ellipse(enemy.x, enemy.y, 24, 9, 0, 0, Math.PI * 2);
    } else if (enemy.type === "drone") {
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      ctx.rotate(Math.sin(enemy.wobble) * 0.7);
      ctx.ellipse(0, 0, enemy.radius + 2, enemy.radius, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(124, 255, 191, 0.55)";
      ctx.beginPath();
      ctx.moveTo(-8, -2);
      ctx.lineTo(-15, -7);
      ctx.moveTo(8, -2);
      ctx.lineTo(15, -7);
      ctx.stroke();
      ctx.restore();
      return;
    } else {
      ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
    }
    ctx.fill();
  });
}

function drawEnemySmokeTrail(trail) {
  trail.forEach((puff, index) => {
    const fade = index / trail.length;
    ctx.globalAlpha = puff.a * fade;
    ctx.fillStyle = "#aab0ad";
    ctx.beginPath();
    ctx.arc(puff.x, puff.y, puff.r * (1.3 - fade * 0.4), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}

function drawBullets() {
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
      ctx.arc(bullet.x, bullet.y, bullet.radius || 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function drawBlasts() {
  state.blasts.forEach((blast) => {
    ctx.strokeStyle = blast.type === "emp" ? "rgba(177, 140, 255, 0.86)" : "rgba(255, 213, 107, 0.78)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(blast.x, blast.y, blast.currentRadius, 0, Math.PI * 2);
    ctx.stroke();
  });
}

function drawParticles() {
  state.particles.forEach((particle) => {
    ctx.globalAlpha = Math.max(0, Math.min(1, particle.life / 280));
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  });
}

function drawCrosshair() {
  ctx.strokeStyle = "rgba(85, 214, 190, 0.45)";
  ctx.lineWidth = 1;
  state.cities.forEach((city) => {
    if (!city || !firstTurret(city) || city.hp <= 0) return;
    ctx.beginPath();
    ctx.moveTo(city.x, city.y - 24);
    ctx.lineTo(city.x + Math.cos(city.turretAngle) * 90, city.y - 24 + Math.sin(city.turretAngle) * 90);
    ctx.stroke();
  });
}

function isTurretControlled(city) {
  const mode = ui.mode.value;
  return (mode === "turret" || mode === "coop") && firstTurret(city);
}

function loop(time) {
  const dt = Math.min(34, time - state.lastTime || 16);
  state.lastTime = time;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

canvas.addEventListener("click", (event) => {
  if (event.target !== canvas) return;
  if (ui.mode.value === "turret") return;
  launchMissile(canvasPoint(event), state.selectedMissile);
});

ui.settings.addEventListener("click", () => {
  ui.settingsDialog.showModal();
});

ui.intel.addEventListener("click", () => {
  ui.intelDialog.showModal();
});

ui.closeIntel.addEventListener("click", () => {
  ui.intelDialog.close();
});

ui.start.addEventListener("click", () => {
  resetGame();
  startWave();
});

ui.next.addEventListener("click", startWave);

ui.pause.addEventListener("click", () => {
  state.paused = !state.paused;
  ui.pause.textContent = state.paused ? "Riprendi" : "Pausa";
  setOverlay(state.paused ? "Pausa" : "", state.paused ? "Simulazione sospesa." : "");
});

ui.missileSelect.addEventListener("change", () => {
  state.selectedMissile = ui.missileSelect.value;
});

ui.turretSelect.addEventListener("change", () => {
  state.selectedTurret = ui.turretSelect.value;
  setActiveTurretForAll(state.selectedTurret);
});

ui.difficultySelect.addEventListener("change", updateUi);

ui.cities.addEventListener("click", (event) => {
  const card = event.target.closest(".city-card");
  if (!card) return;
  state.selectedCity = Number(card.dataset.city);
  state.playerTurretIndex = state.selectedCity;
  updateUi();
});

ui.cities.addEventListener("change", (event) => {
  const select = event.target.closest("[data-city-weapon]");
  if (!select) return;
  const city = state.cities[Number(select.dataset.cityWeapon)];
  setActiveWeapon(city, select.value);
  state.selectedCity = Number(select.dataset.cityWeapon);
  state.playerTurretIndex = state.selectedCity;
  updateUi();
});

ui.buildCities.addEventListener("click", (event) => {
  const card = event.target.closest("[data-build-city]");
  if (!card) return;
  state.selectedCity = Number(card.dataset.buildCity);
  state.playerTurretIndex = state.selectedCity;
  updateUi();
});

ui.closeBuild.addEventListener("click", () => closeBuildDialog());

ui.buildStartWave.addEventListener("click", () => {
  startWave();
});

document.querySelectorAll("[data-upgrade]").forEach((button) => {
  button.addEventListener("click", () => spendUpgrade(button.dataset.upgrade));
});

document.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
  state.keys.add(event.code);
});

document.addEventListener("keyup", (event) => {
  state.keys.delete(event.code);
});

resetGame();
draw();
requestAnimationFrame(loop);
