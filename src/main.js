// =============================================================================
// Missile Defence Multiplayer — Entry point
// =============================================================================
// Bootstraps the game: initialises canvas, binds UI/input, runs the game loop.
// All game systems are imported from dedicated modules.
// =============================================================================

import { state, resetState, DIFFICULTY, installedSlots, WAVE_CLEAR_BONUS } from "./state.js";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./config.js";
import { draw } from "./rendering/renderer.js";
import { updateMissiles } from "./entities/projectiles.js";
import { updateBullets } from "./entities/projectiles.js";
import { updateEnemies } from "./entities/enemies.js";
import { spawnEnemy } from "./entities/enemies.js";
import { updateBlasts, updateParticles, cleanup } from "./entities/effects.js";
import { updatePlayerTurret } from "./entities/weapons.js";
import { updateAi } from "./systems/ai.js";
import { bindInput } from "./systems/input.js";
import { startWave, finishWave } from "./core/wave.js";
import { ui, setOverlay, updateUi, renderFooterCities, renderCities, openBuildDialog, closeBuildDialog, openGameModeDialog, bindDialogs, bindStateListeners } from "./ui/ui.js";
import { t } from "./i18n.js";
import * as logger from "./debug/logger.js";

// --- Canvas setup ---
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

// --- Helpers ---

function getDifficultyCfg() {
  return DIFFICULTY[ui.difficultySelect.value];
}

function getMode() {
  return ui.mode.value;
}

function uiCallbacks() {
  return { closeBuildDialog, setOverlay };
}

// --- Reset game ---

function resetGame() {
  const diffCfg = getDifficultyCfg();
  const citiesConfig = ["Jarvis", "Minter", "Miyamoto"];
  resetState(diffCfg, citiesConfig);
  ui.next.disabled = false;
  setOverlay(t("overlay.defencesReady"), t("overlay.defencesReadyText"));
  openBuildDialog(true);
  updateUi();
  logger.log("info", "Game reset", { difficulty: diffCfg.label, mode: getMode() });
}

// --- Main update loop ---

function update(dt) {
  if (!state.running || state.paused) return;
  dt *= state.gameSpeed;
  const diffCfg = getDifficultyCfg();

  // Cooldowns
  state.cities.forEach((city) => {
    city.disabled = Math.max(0, city.disabled - dt);
    installedSlots(city).forEach((slot) => {
      slot.cooldown = Math.max(0, slot.cooldown - dt);
    });
  });

  // Throttled HUD refresh — keeps city HP / jammed status in sync during combat.
  state.hudRefreshTimer = (state.hudRefreshTimer || 0) - dt;
  if (state.hudRefreshTimer <= 0) {
    state.hudRefreshTimer = 120;
    renderFooterCities();
    if (ui.intelDialog.open) renderCities();
  }

  // Wave spawning
  if (!state.betweenWaves) {
    state.spawnTimer -= dt;
    if (state.enemiesToSpawn > 0 && state.spawnTimer <= 0) {
      const spawnCount = Math.min(
        state.enemiesToSpawn,
        Math.max(1, Math.floor(state.wave * diffCfg.count / 4))
      );
      for (let s = 0; s < spawnCount; s += 1) {
        spawnEnemy(state.wave, diffCfg);
        state.enemiesToSpawn -= 1;
      }
      state.spawnTimer = Math.max(120, 860 - state.wave * 26 + Math.random() * 380);
    }
    updateAi(dt, getMode(), diffCfg);
  }

  // Player turret control
  updatePlayerTurret(dt, getMode(), state.turretCurve, state.turretSensitivity, state.keys);

  // Physics
  updateMissiles(dt);
  updateBullets(dt);
  updateEnemies(dt, diffCfg, state.trailDuration);
  updateBlasts(dt);
  updateParticles(dt);
  cleanup();

  // Wave complete?
  if (!state.betweenWaves && state.enemiesToSpawn <= 0 && state.enemies.length === 0) {
    const { produced, factoryProduction } = finishWave(diffCfg, updateUi);
    setOverlay(
      t("overlay.waveRepelled", { wave: state.wave - 1 }),
      t("overlay.waveReward", { bonus: WAVE_CLEAR_BONUS, factory: factoryProduction, produced })
    );
    showCreditBump();
    openBuildDialog();
    ui.next.disabled = false;
  }

  // Game over?
  if (state.running && state.cities.every((city) => city.hp <= 0) && state.factories.every((factory) => factory.hp <= 0)) {
    state.running = false;
    state.betweenWaves = true;
    setOverlay(t("overlay.gameOver"), t("overlay.gameOverText", { score: state.score }));
    ui.next.disabled = true;
    logger.log("warn", "Game over — all cities destroyed");
  }
}

function showCreditBump() {
  const banner = ui.buildModal.closest(".credit-banner");
  if (banner) {
    banner.classList.add("bump");
    window.setTimeout(() => banner.classList.remove("bump"), 220);
  }
}

// --- Game loop ---

function loop(time) {
  const dt = Math.min(34, time - state.lastTime || 16);
  state.lastTime = time;
  update(dt);
  draw(ctx, getMode());
  logger.tickFps(time);
  if (state.debugMode && Math.floor(time / 2000) !== Math.floor((time - dt) / 2000)) {
    logger.snapshot(state);
  }
  requestAnimationFrame(loop);
}

// --- Bootstrap ---

function boot() {
  // Bind state listeners for UI auto-update
  bindStateListeners();

  // Bind input
  bindInput(canvas, getMode);

  // Bind dialogs — Avvia starts the pending wave; after game over it resets the match.
  bindDialogs(() => {
    if (!state.running) {
      openGameModeDialog();
      return;
    }
    if (state.betweenWaves) {
      startWave(getDifficultyCfg(), uiCallbacks());
    }
  }, resetGame);

  setOverlay(t("overlay.chooseMode"), t("overlay.chooseModeText"));
  openGameModeDialog();

  // First draw
  draw(ctx, getMode());

  // Start loop
  requestAnimationFrame(loop);

  logger.log("info", "Game booted", { version: "0.2.0-refactored" });
}

boot();
