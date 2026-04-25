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
import { ui, setOverlay, updateUi, openBuildDialog, closeBuildDialog, bindDialogs, bindStateListeners } from "./ui/ui.js";
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
  const citiesConfig = ["Aquila", "Vega", "Orione"];
  resetState(diffCfg, citiesConfig);
  ui.next.disabled = false;
  setOverlay("Difese pronte", "Spendi il credito costruzione, poi avvia la prossima ondata.");
  openBuildDialog(true);
  updateUi();
  logger.log("info", "Game reset", { difficulty: diffCfg.label, mode: getMode() });
}

// --- Main update loop ---

function update(dt) {
  if (!state.running || state.paused) return;
  dt *= state.gameSpeed;
  const seconds = dt / 1000;
  const diffCfg = getDifficultyCfg();

  // Cooldowns and heat decay
  state.cities.forEach((city) => {
    city.disabled = Math.max(0, city.disabled - dt);
    installedSlots(city).forEach((slot) => {
      slot.cooldown = Math.max(0, slot.cooldown - dt);
      if (slot.role === "turret") slot.heat = Math.max(0, slot.heat - seconds * 16);
    });
  });

  // Wave spawning
  if (!state.betweenWaves) {
    state.spawnTimer -= dt;
    if (state.enemiesToSpawn > 0 && state.spawnTimer <= 0) {
      spawnEnemy(state.wave, diffCfg);
      state.enemiesToSpawn -= 1;
      state.spawnTimer = Math.max(160, 980 - state.wave * 34 + Math.random() * 420);
    }
    updateAi(dt, getMode(), diffCfg);
  }

  // Player turret control
  updatePlayerTurret(dt, getMode(), state.turretCurve, state.turretSensitivity, state.keys);

  // Physics
  updateMissiles();
  updateBullets(dt);
  updateEnemies(dt, diffCfg, state.trailDuration);
  updateBlasts(dt);
  updateParticles(dt);
  cleanup();

  // Wave complete?
  if (!state.betweenWaves && state.enemiesToSpawn <= 0 && state.enemies.length === 0) {
    const { produced, factoryProduction } = finishWave(diffCfg, updateUi);
    setOverlay(
      `Ondata ${state.wave - 1} respinta`,
      `Bonus ${WAVE_CLEAR_BONUS} + produzione fabbriche ${factoryProduction}: +${produced} credito.`
    );
    showCreditBump();
    openBuildDialog();
    ui.next.disabled = false;
  }

  // Game over?
  if (state.running && state.cities.every((city) => city.hp <= 0) && state.factories.every((factory) => factory.hp <= 0)) {
    state.running = false;
    state.betweenWaves = true;
    setOverlay("Citta distrutte", `Punteggio finale: ${state.score}. Premi Avvia per ricominciare.`);
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

  // Bind dialogs — Avvia button resets game and opens build dialog (user clicks "Avvia ondata" to start)
  bindDialogs(() => {
    resetGame();
    // NON chiamare startWave qui: resetGame apre il popup costruzione,
    // l'utente clicca "Avvia ondata" per far partire l'ondata
  });

  // Initial reset (shows build dialog, user must click "Avvia ondata")
  resetGame();

  // First draw
  draw(ctx, getMode());

  // Start loop
  requestAnimationFrame(loop);

  logger.log("info", "Game booted", { version: "0.2.0-refactored" });
}

boot();
