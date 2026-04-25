// =============================================================================
// Wave — Wave start/finish, spawn timing, credit production
// =============================================================================

import { state, WAVE_CLEAR_BONUS, installedSlots, maxAmmo, replenishAmmo, turretSlots, factoriesForBase } from "../state.js";
import * as logger from "../debug/logger.js";

// --- Start a new wave ---

export function startWave(difficultyCfg, uiCallbacks = {}) {
  if (!state.running) return; // resetGame must be called first
  state.betweenWaves = false;
  state.enemiesToSpawn = Math.ceil((8 + state.wave * 2.15) * difficultyCfg.count);
  state.spawnTimer = 350;
  state.aiMissileTimer = 0;
  state.aiTurretTimer = 0;
  state.friendlyMissiles = [];
  state.friendlyBullets = [];
  state.blasts = [];
  // Chiudi popup costruzione e pulisci overlay
  if (uiCallbacks.closeBuildDialog) uiCallbacks.closeBuildDialog();
  if (uiCallbacks.setOverlay) uiCallbacks.setOverlay("", "");
  logger.log("info", `Wave ${state.wave} started`, { enemiesToSpawn: state.enemiesToSpawn });
}

// --- Finish current wave ---
// Returns { produced, factoryProduction } for UI message

export function finishWave(difficultyCfg, onUpdateUi) {
  state.betweenWaves = true;
  const factoryProduction = state.factories.reduce((sum, factory) => {
    if (factory.hp <= 0) return sum;
    const damagePenalty = factory.hp / factory.maxHp < 0.5 ? 0.5 : 1;
    return sum + Math.ceil(factory.level * difficultyCfg.build * damagePenalty);
  }, 0);
  const produced = WAVE_CLEAR_BONUS + factoryProduction;
  state.build += produced;
  state.cities.forEach((city) => {
    if (city.hp > 0) {
      installedSlots(city).forEach((slot) => {
        slot.ammo = Math.min(maxAmmo(city, slot), slot.ammo + replenishAmmo(slot));
        slot.cooldown = 0;
      });
      city.disabled = 0;
      turretSlots(city).forEach((slot) => {
        slot.heat = Math.max(0, slot.heat - 40);
      });
      city.shield = Math.min(city.shield, 1);
    }
  });
  state.wave += 1;
  logger.log("info", `Wave ${state.wave - 1} cleared`, { produced, factoryProduction, build: state.build });
  onUpdateUi?.();
  return { produced, factoryProduction };
}

export { WAVE_CLEAR_BONUS };
