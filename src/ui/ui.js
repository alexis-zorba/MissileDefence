// =============================================================================
// UI — DOM element references, HUD updates, dialog management
// =============================================================================

import { state, on, installedSlots, maxAmmo, maxDurability, weaponColor, factoriesForBase, DEFAULT_GAME_SPEED, DEFAULT_VISUAL_SCALE } from "../state.js";
import { DIFFICULTY } from "../config.js";
import { spendUpgrade } from "../core/economy.js";
import { startWave } from "../core/wave.js";
import { applyTranslations, language, setLanguage, t } from "../i18n.js";

// --- DOM element references ---

export const ui = {
  wave: document.getElementById("waveLabel"),
  difficulty: document.getElementById("difficultyLabel"),
  build: document.getElementById("buildLabel"),
  score: document.getElementById("scoreLabel"),
  cities: document.getElementById("cities"),
  overlay: document.getElementById("overlay"),
  intel: document.getElementById("intelButton"),
  intelDialog: document.getElementById("intelDialog"),
  closeIntel: document.getElementById("closeIntelButton"),
  help: document.getElementById("helpButton"),
  helpDialog: document.getElementById("helpDialog"),
  closeHelp: document.getElementById("closeHelpButton"),
  settings: document.getElementById("settingsButton"),
  settingsDialog: document.getElementById("settingsDialog"),
  buildDialog: document.getElementById("buildDialog"),
  closeBuild: document.getElementById("closeBuildButton"),
  buildStartWave: document.getElementById("buildStartWaveButton"),
  buildModal: document.getElementById("buildModalLabel"),
  buildCities: document.getElementById("buildCities"),
  footerCities: document.getElementById("footerCities"),
  newGame: document.getElementById("newGameButton"),
  start: document.getElementById("startButton"),
  next: document.getElementById("nextWaveButton"),
  pause: document.getElementById("pauseButton"),
  gameModeDialog: document.getElementById("gameModeDialog"),
  language: document.getElementById("languageSelect"),
  mode: document.getElementById("modeSelect"),
  difficultySelect: document.getElementById("difficultySelect"),
  aiSkill: document.getElementById("aiSkillSelect"),
  aiTurretAim: document.getElementById("aiTurretAimSelect"),
  turretInput: document.getElementById("turretInputSelect"),
  turretAim: document.getElementById("turretAimSelect"),
  turretSensitivity: document.getElementById("turretSensitivityInput"),
  turretCurve: document.getElementById("turretCurveInput"),
  trailDuration: document.getElementById("trailDurationInput"),
  cloudsEnabled: document.getElementById("cloudsEnabledInput"),
  debugMode: document.getElementById("debugModeInput"),
  debugControls: document.getElementById("debugControls"),
  gameSpeed: document.getElementById("gameSpeedInput"),
  visualScale: document.getElementById("visualScaleInput"),
};

// --- Overlay messages ---

export function setOverlay(title, text) {
  ui.overlay.style.display = title ? "flex" : "none";
  ui.overlay.innerHTML = title ? `<strong>${title}</strong><span>${text}</span>` : "";
}

// --- Full UI refresh ---

export function updateUi() {
  ui.wave.textContent = state.wave;
  ui.difficulty.textContent = t(`options.${ui.difficultySelect.value}`);
  ui.build.textContent = state.build;
  ui.buildModal.textContent = state.build;
  ui.score.textContent = state.score;
  renderCities();
  renderFooterCities();
  renderBuildCities();
}

// --- City cards in Intel dialog ---

export function renderCities() {
  ui.cities.innerHTML = state.cities
    .map((city, index) => {
      return cityStatusCard(city, index, {
        className: "city-card",
        dataAttribute: "data-city",
      });
    })
    .join("");
}

// --- City cards in Build dialog ---

export function renderBuildCities() {
  ui.buildCities.innerHTML = state.cities
    .map((city, index) => {
      return cityStatusCard(city, index, {
        className: "build-city",
        dataAttribute: "data-build-city",
      });
    })
    .join("");
}

// --- Footer city bars ---

export function renderFooterCities() {
  ui.footerCities.innerHTML = state.cities.map((city, index) => {
    const hpPct = city.maxHp > 0 ? Math.max(0, (city.hp / city.maxHp) * 100) : 0;
    const factories = factoriesForBase(index);
    const livingFactories = factories.filter((factory) => factory.hp > 0);
    const production = livingFactories.reduce((sum, factory) => sum + factory.level, 0);
    const weaponBars = city.slots.map((slot) => {
      if (!slot.type) {
        return `
          <div class="footer-slot empty" title="${t("intel.empty")}">
            <span class="slot-icon">${slot.role === "missile" ? "↟" : "⌁"}</span>
            <div class="footer-bar"><span style="width:0"></span></div>
            <small>--</small>
          </div>
        `;
      }
      const ammoPct = maxAmmo(city, slot) > 0 ? Math.min(100, (slot.ammo / maxAmmo(city, slot)) * 100) : 0;
      const durabilityMax = maxDurability(slot);
      const durability = slot.durability || 0;
      const durabilityPct = durabilityMax > 0 ? Math.min(100, (durability / durabilityMax) * 100) : 0;
      return `
        <div class="footer-slot" title="${slotLabel(slot)}">
          <span class="slot-icon" style="color:${weaponColor(slot.type)}">${weaponIcon(slot.type)}</span>
          <div class="footer-bar"><span style="width:${ammoPct}%; background:${weaponColor(slot.type)}"></span></div>
          <small>${slot.ammo}/${maxAmmo(city, slot)}</small>
          <div class="footer-bar durability"><span style="width:${durabilityPct}%; background:${durabilityPct > 25 ? "#55d6be" : "#ff5f5f"}"></span></div>
          <small>${durability}/${durabilityMax}</small>
        </div>
      `;
    }).join("");
    return `
      <article class="footer-city">
        <div class="footer-city-head">
          <strong>${city.name}</strong>
          <span class="footer-city-name">⌂ ${livingFactories.length}/${factories.length} P${production}</span>
        </div>
        <div class="footer-bars">
          <div class="footer-bar health"><span style="width:${hpPct}%; background:${hpPct > 35 ? "#55d6be" : "#ff5f5f"}"></span></div>
          <div class="footer-slot-grid">
          ${weaponBars}
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function metricBadge(icon, label, value, pct, color) {
  return `
    <div class="metric-badge">
      <span class="metric-icon">${icon}</span>
      <div>
        <small>${label}</small>
        <strong>${value}</strong>
        <div class="mini-gauge"><span style="width:${Math.max(0, Math.min(100, pct))}%; background:${color}"></span></div>
      </div>
    </div>
  `;
}

function cityStatusCard(city, index, options) {
  const selected = index === state.selectedCity ? " selected" : "";
  const hpPct = Math.max(0, (city.hp / city.maxHp) * 100);
  const installed = installedSlots(city);
  const factories = factoriesForBase(index);
  const livingFactories = factories.filter((factory) => factory.hp > 0);
  const production = livingFactories.reduce((sum, factory) => sum + factory.level, 0);
  return `
    <article class="${options.className}${selected}" ${options.dataAttribute}="${index}">
      <header><strong>${city.name}</strong><span>${t("intel.slots", { count: installed.length })}</span></header>
      <div class="city-gauges">
        ${metricBadge("▰", t("intel.health"), `${Math.round(hpPct)}%`, hpPct, hpPct > 35 ? "#55d6be" : "#ff5f5f")}
        ${metricBadge("⌂", t("intel.factories"), `${livingFactories.length}/${factories.length}`, factories.length ? (livingFactories.length / factories.length) * 100 : 0, "#69a9ff")}
        ${metricBadge("⚙", t("intel.production"), production, Math.min(100, production * 18), "#f4bf54")}
        ${metricBadge("◈", t("intel.shield"), city.shield ? t("intel.yes") : t("intel.no"), city.shield ? 100 : 0, "#67e6ff")}
      </div>
      <div class="slot-grid">
        ${city.slots.map((slot) => slotCard(city, slot)).join("")}
      </div>
      <div class="city-meta"><span>${t("intel.magazine")} ${city.magazineLevel || 1}</span><span>${t("intel.blast")} ${city.blastRadiusLevel}/${city.blastLifeLevel}</span></div>
    </article>
  `;
}

function slotCard(city, slot) {
  const color = slot.type ? weaponColor(slot.type) : "rgba(149, 170, 179, 0.45)";
  const ammoPct = slot.type && maxAmmo(city, slot) > 0 ? Math.min(100, (slot.ammo / maxAmmo(city, slot)) * 100) : 0;
  const durabilityMax = slot.type ? maxDurability(slot) : 0;
  const durability = slot.durability || 0;
  const durabilityPct = durabilityMax > 0 ? Math.min(100, (durability / durabilityMax) * 100) : 0;
  return `
    <div class="slot-card${slot.type ? "" : " empty"}">
      <div class="slot-card-head">
        <span style="color:${color}">${weaponIcon(slot.type || slot.role)}</span>
        <strong>${slot.type ? slotLabel(slot) : t("intel.empty")}</strong>
        <small>${t(`roles.${slot.role}`)}</small>
      </div>
      <div class="slot-bars">
        <div><small>${t("intel.ammo")}</small><div class="bar"><span style="width:${ammoPct}%; background:${color}"></span></div></div>
        <div><small>${t("intel.durability")} ${slot.type ? `${durability}/${durabilityMax}` : ""}</small><div class="bar"><span style="width:${durabilityPct}%; background:${durabilityPct > 25 ? "#55d6be" : "#ff5f5f"}"></span></div></div>
      </div>
    </div>
  `;
}

function weaponIcon(type) {
  return {
    missile: "↟",
    turret: "⌁",
    ballistic: "↟",
    seeker: "◆",
    cannon: "▰",
    mg: "≋",
    laser: "⌁",
  }[type] || "·";
}

function slotLabel(slot) {
  return slot?.type ? `${t(`weapons.${slot.type}`)} L${slot.level}` : t("intel.empty");
}

// --- Build dialog ---

export function openBuildDialog(initial = false) {
  if (!ui.buildDialog.open && state.betweenWaves) ui.buildDialog.showModal();
  if (initial) showCreditBump();
}

export function closeBuildDialog() {
  if (ui.buildDialog.open) ui.buildDialog.close();
}

export function openGameModeDialog() {
  closeBuildDialog();
  if (ui.settingsDialog.open) ui.settingsDialog.close();
  if (ui.intelDialog.open) ui.intelDialog.close();
  if (!ui.gameModeDialog.open) ui.gameModeDialog.showModal();
}

export function closeGameModeDialog() {
  if (ui.gameModeDialog.open) ui.gameModeDialog.close();
}

function showCreditBump() {
  const banner = ui.buildModal.closest(".credit-banner");
  banner.classList.add("bump");
  window.setTimeout(() => banner.classList.remove("bump"), 220);
}

// --- Dialog event binding ---

export function bindDialogs(onStart, onNewGame) {
  setLanguage(language());
  ui.language.value = language();
  applyTranslations();
  // Settings
  ui.settings.addEventListener("click", () => ui.settingsDialog.showModal());
  // Intel
  ui.intel.addEventListener("click", () => ui.intelDialog.showModal());
  ui.closeIntel.addEventListener("click", () => ui.intelDialog.close());
  // Guide
  ui.help.addEventListener("click", () => ui.helpDialog.showModal());
  ui.closeHelp.addEventListener("click", () => ui.helpDialog.close());
  // Start / next wave / pause
  ui.newGame.addEventListener("click", () => openGameModeDialog());
  ui.start.addEventListener("click", onStart);
  ui.next.addEventListener("click", () => {
    const diffCfg = DIFFICULTY[ui.difficultySelect.value];
    startWave(diffCfg, { closeBuildDialog, setOverlay });
  });
  ui.pause.addEventListener("click", () => {
    state.paused = !state.paused;
    ui.pause.textContent = state.paused ? t("actions.resume") : t("actions.pause");
    setOverlay(state.paused ? t("overlay.paused") : "", state.paused ? t("overlay.pausedText") : "");
  });
  // Build dialog
  ui.closeBuild.addEventListener("click", () => closeBuildDialog());
  ui.buildStartWave.addEventListener("click", () => {
    const diffCfg = DIFFICULTY[ui.difficultySelect.value];
    startWave(diffCfg, { closeBuildDialog, setOverlay });
  });
  ui.gameModeDialog.addEventListener("click", (event) => {
    const button = event.target.closest("[data-mode-preset]");
    if (!button) return;
    applyModePreset(button.dataset.modePreset);
    closeGameModeDialog();
    onNewGame();
  });
  // City selection
  ui.cities.addEventListener("click", (event) => {
    const card = event.target.closest(".city-card");
    if (!card) return;
    state.selectedCity = Number(card.dataset.city);
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
  // Upgrade buttons
  document.querySelectorAll("[data-upgrade]").forEach((button) => {
    button.addEventListener("click", () => {
      spendUpgrade(button.dataset.upgrade);
      updateUi();
    });
  });
  // Settings sliders
  ui.trailDuration.addEventListener("input", () => {
    state.trailDuration = Number(ui.trailDuration.value);
  });
  ui.cloudsEnabled.addEventListener("change", () => {
    state.cloudsEnabled = ui.cloudsEnabled.checked;
  });
  ui.debugMode.addEventListener("change", () => {
    const checked = ui.debugMode.checked;
    state.debugMode = checked;
    ui.debugControls.hidden = !checked;
    if (!checked) {
      state.gameSpeed = DEFAULT_GAME_SPEED;
      state.visualScale = DEFAULT_VISUAL_SCALE;
      ui.gameSpeed.value = String(DEFAULT_GAME_SPEED);
      ui.visualScale.value = String(DEFAULT_VISUAL_SCALE);
    }
    // Toggle debug logger
    if (checked) import("../debug/logger.js").then((l) => l.enable());
    else import("../debug/logger.js").then((l) => l.disable());
  });
  ui.gameSpeed.addEventListener("input", () => {
    if (!state.debugMode) return;
    state.gameSpeed = Number(ui.gameSpeed.value);
  });
  ui.visualScale.addEventListener("input", () => {
    if (!state.debugMode) return;
    state.visualScale = Number(ui.visualScale.value);
  });
  ui.turretSensitivity.addEventListener("input", () => {
    state.turretSensitivity = Number(ui.turretSensitivity.value);
  });
  ui.turretCurve.addEventListener("input", () => {
    state.turretCurve = Number(ui.turretCurve.value);
  });
  ui.aiSkill.addEventListener("change", () => {
    state.aiSkill = ui.aiSkill.value;
  });
  ui.aiTurretAim.addEventListener("change", () => {
    state.aiTurretAimMode = ui.aiTurretAim.value;
  });
  ui.turretInput.addEventListener("change", () => {
    state.turretInputMode = ui.turretInput.value;
    syncControlAvailability();
  });
  ui.turretAim.addEventListener("change", () => {
    state.turretAimMode = ui.turretAim.value;
  });
  ui.mode.addEventListener("change", () => {
    applyModePreset(ui.mode.value);
  });
  ui.difficultySelect.addEventListener("change", updateUi);
  ui.language.addEventListener("change", () => {
    setLanguage(ui.language.value);
    applyTranslations();
    updateUi();
  });
  syncControlAvailability();
}

function applyModePreset(preset) {
  ui.mode.value = preset;
  ui.aiTurretAim.value = "independent";
  if (preset === "turret") {
    ui.turretInput.value = "mouse";
    ui.turretAim.value = "point";
  } else {
    ui.turretInput.value = "keyboard";
    ui.turretAim.value = "parallel";
  }
  syncControlAvailability();
}

function syncControlAvailability() {
  state.turretInputMode = ui.turretInput.value;
  state.turretAimMode = ui.turretAim.value;
  state.aiTurretAimMode = ui.aiTurretAim.value;
  state.aiSkill = ui.aiSkill.value;
  const mouseReservedForMissiles = ui.mode.value === "missiles" || ui.mode.value === "coop" || ui.mode.value === "auto";
  if (mouseReservedForMissiles && ui.turretInput.value === "mouse") {
    ui.turretInput.value = "keyboard";
    state.turretInputMode = "keyboard";
  }
  ui.turretInput.querySelector('option[value="mouse"]').disabled = mouseReservedForMissiles;
  ui.turretAim.disabled = state.turretInputMode !== "mouse";
}

// --- Subscribe to state events for UI auto-update ---

export function bindStateListeners() {
  on("reset", () => updateUi());
}
