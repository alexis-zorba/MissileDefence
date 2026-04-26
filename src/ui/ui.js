// =============================================================================
// UI — DOM element references, HUD updates, dialog management
// =============================================================================

import { state, on, installedSlots, maxAmmo, weaponColor, slotLabel, activeAmmoText, factorySummary, DEFAULT_GAME_SPEED, DEFAULT_VISUAL_SCALE } from "../state.js";
import { DIFFICULTY } from "../config.js";
import { spendUpgrade } from "../core/economy.js";
import { startWave } from "../core/wave.js";

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
  aiSkill: document.getElementById("aiSkillSelect"),
  aiTurretAim: document.getElementById("aiTurretAimSelect"),
  turretInput: document.getElementById("turretInputSelect"),
  turretAim: document.getElementById("turretAimSelect"),
  turretSensitivity: document.getElementById("turretSensitivityInput"),
  turretCurve: document.getElementById("turretCurveInput"),
  trailDuration: document.getElementById("trailDurationInput"),
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
  ui.difficulty.textContent = DIFFICULTY[ui.difficultySelect.value].label;
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
      const selected = index === state.selectedCity ? " selected" : "";
      const hpPct = Math.max(0, (city.hp / city.maxHp) * 100);
      const heatPct = Math.min(100, Math.max(0, ...city.slots.filter((s) => s.role === "turret" && s.type).map((slot) => slot.heat), 0));
      const installed = installedSlots(city);
      return `
        <article class="city-card${selected}" data-city="${index}">
          <header><strong>${city.name}</strong><span>${installed.length}/4 slot</span></header>
          <div class="bars">
            <div class="bar health"><span style="width:${hpPct}%"></span></div>
            <div class="bar"><span style="width:${heatPct}%"></span></div>
          </div>
          <div class="city-meta">
            <span>${factorySummary(index)}</span>
            <span>${activeAmmoText(city)}</span>
            <span>Scudo ${city.shield ? "si" : "no"}</span>
            <span>Blast ${city.blastRadiusLevel}/${city.blastLifeLevel}</span>
          </div>
          <div class="city-meta">${city.slots.map((slot) => `<span>${slotLabel(slot)}</span>`).join("")}</div>
        </article>
      `;
    })
    .join("");
}

// --- City cards in Build dialog ---

export function renderBuildCities() {
  ui.buildCities.innerHTML = state.cities
    .map((city, index) => {
      const selected = index === state.selectedCity ? " selected" : "";
      const hpPct = Math.round(Math.max(0, (city.hp / city.maxHp) * 100));
      const weapons = installedSlots(city).map(slotLabel).join(", ");
      return `
        <article class="build-city${selected}" data-build-city="${index}">
          <strong>${city.name}</strong>
          <div class="city-meta"><span>Base ${hpPct}%</span><span>${factorySummary(index)}</span></div>
          <div class="city-meta"><span>${weapons || "Nessuna arma"}</span><span>${activeAmmoText(city)}</span></div>
          <div class="city-meta"><span>Caricatori ${city.magazineLevel || 1}</span><span>Blast ${city.blastRadiusLevel}/${city.blastLifeLevel}</span></div>
          <div class="city-meta"><span>Scudo ${city.shield ? "si" : "no"}</span><span></span></div>
        </article>
      `;
    })
    .join("");
}

// --- Footer city bars ---

export function renderFooterCities() {
  ui.footerCities.innerHTML = state.cities.map((city, index) => {
    const hpPct = city.maxHp > 0 ? Math.max(0, (city.hp / city.maxHp) * 100) : 0;
    const weaponBars = installedSlots(city).map((slot) => {
      const ammoPct = maxAmmo(city, slot) > 0 ? Math.min(100, (slot.ammo / maxAmmo(city, slot)) * 100) : 0;
      return `
        <div class="footer-bar" title="${slotLabel(slot)}">
          <span style="width:${ammoPct}%; background:${weaponColor(slot.type)}"></span>
        </div>
      `;
    }).join("");
    return `
      <article class="footer-city">
        <div class="footer-city-head">
          <strong>${city.name}</strong>
          <span class="footer-city-name">${factorySummary(index)}</span>
        </div>
        <div class="footer-bars">
          <div class="footer-bar health"><span style="width:${hpPct}%; background:${hpPct > 35 ? "#55d6be" : "#ff5f5f"}"></span></div>
          ${weaponBars}
        </div>
      </article>
    `;
  }).join("");
}

// --- Build dialog ---

export function openBuildDialog(initial = false) {
  if (!ui.buildDialog.open && state.betweenWaves) ui.buildDialog.showModal();
  if (initial) showCreditBump();
}

export function closeBuildDialog() {
  if (ui.buildDialog.open) ui.buildDialog.close();
}

function showCreditBump() {
  const banner = ui.buildModal.closest(".credit-banner");
  banner.classList.add("bump");
  window.setTimeout(() => banner.classList.remove("bump"), 220);
}

// --- Dialog event binding ---

export function bindDialogs(onStart) {
  // Settings
  ui.settings.addEventListener("click", () => ui.settingsDialog.showModal());
  // Intel
  ui.intel.addEventListener("click", () => ui.intelDialog.showModal());
  ui.closeIntel.addEventListener("click", () => ui.intelDialog.close());
  // Start / next wave / pause
  ui.start.addEventListener("click", onStart);
  ui.next.addEventListener("click", () => {
    const diffCfg = DIFFICULTY[ui.difficultySelect.value];
    startWave(diffCfg, { closeBuildDialog, setOverlay });
  });
  ui.pause.addEventListener("click", () => {
    state.paused = !state.paused;
    ui.pause.textContent = state.paused ? "Riprendi" : "Pausa";
    setOverlay(state.paused ? "Pausa" : "", state.paused ? "Simulazione sospesa." : "");
  });
  // Build dialog
  ui.closeBuild.addEventListener("click", () => closeBuildDialog());
  ui.buildStartWave.addEventListener("click", () => {
    const diffCfg = DIFFICULTY[ui.difficultySelect.value];
    startWave(diffCfg, { closeBuildDialog, setOverlay });
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
    syncControlAvailability();
  });
  ui.difficultySelect.addEventListener("change", updateUi);
  syncControlAvailability();
}

function syncControlAvailability() {
  const mouseReservedForMissiles = ui.mode.value === "missiles" || ui.mode.value === "coop";
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
