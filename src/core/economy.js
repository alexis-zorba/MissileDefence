// =============================================================================
// Economy — Credit spending, upgrades, repair, building
// =============================================================================

import {
  state,
  UPGRADE_COSTS,
  MAX_FACTORIES_PER_BASE,
  MAX_WEAPON_LEVEL,
  installedSlots,
  missileSlots,
  factoriesForBase,
  initialWeaponSlots,
  installSlot,
  maxAmmo,
  refreshDurability,
  seedAmmo,
  createFactory,
} from "../state.js";
import { MISSILE_DEFS } from "../config.js";
import * as logger from "../debug/logger.js";

// --- Spend build credit on an upgrade ---

export function spendUpgrade(kind) {
  if (!state.betweenWaves || !state.running) return;
  const cost = UPGRADE_COSTS[kind];
  if (state.build < cost) return;
  const city = state.cities[state.selectedCity];
  if (!city) return;

  if (kind === "repair") {
    if (city.hp <= 0) {
      city.hp = Math.min(city.maxHp * 0.45, city.maxHp);
      city.slots ||= initialWeaponSlots(state.selectedCity);
      city.magazineLevel ||= 1;
      city.blastRadiusLevel ||= 1;
      city.blastLifeLevel ||= 1;
      city.ruinSeed = Math.random();
    } else {
      city.hp = Math.min(city.maxHp, city.hp + 32);
    }
    const damagedFactory = factoriesForBase(state.selectedCity)
      .filter((factory) => factory.hp < factory.maxHp)
      .sort((a, b) => a.hp - b.hp)[0];
    if (damagedFactory) damagedFactory.hp = Math.min(damagedFactory.maxHp, damagedFactory.hp + 24);
  } else if (kind === "factory") {
    if (city.hp <= 0) return;
    const factories = factoriesForBase(state.selectedCity);
    if (factories.length < MAX_FACTORIES_PER_BASE) {
      state.factories.push(createFactory(state.selectedCity, factories.length, Math.round(city.maxHp * 0.58)));
    } else {
      const target = factories
        .filter((factory) => factory.hp > 0)
        .sort((a, b) => a.level - b.level || a.hp - b.hp)[0];
      if (!target || target.level >= 5) return;
      target.level += 1;
      target.maxHp += 10;
      target.hp = target.maxHp;
    }
  } else if (kind === "shield") {
    if (city.hp <= 0) return;
    city.shield = 1;
  } else if (kind === "ammo") {
    const slots = installedSlots(city);
    if (!slots.length) return;
    slots.forEach((slot) => {
      slot.ammo = maxAmmo(city, slot);
    });
  } else if (kind === "magazine") {
    const slots = installedSlots(city);
    if (!slots.length) return;
    city.magazineLevel = Math.min(5, (city.magazineLevel || 1) + 1);
    slots.forEach((slot) => {
      slot.ammo = maxAmmo(city, slot);
    });
  } else if (kind === "blastRadius") {
    if (!missileSlots(city).some((slot) => slot.type === "ballistic")) return;
    city.blastRadiusLevel = Math.min(5, city.blastRadiusLevel + 1);
  } else if (kind === "blastLife") {
    if (!missileSlots(city).some((slot) => slot.type === "ballistic")) return;
    city.blastLifeLevel = Math.min(5, city.blastLifeLevel + 1);
  } else {
    const weaponType = kind === "launcher" ? "ballistic" : kind;
    const role = MISSILE_DEFS[weaponType] ? "missile" : "turret";
    const slots = city.slots.filter((slot) => slot.role === role);
    const existing = slots.find((slot) => slot.type === weaponType && slot.level < MAX_WEAPON_LEVEL);
    const empty = slots.find((slot) => !slot.type);
    const slot = existing || empty;
    if (!slot) return;
    if (slot.type) {
      slot.level = Math.min(MAX_WEAPON_LEVEL, slot.level + 1);
    } else {
      installSlot(slot, weaponType);
    }
    refreshDurability(slot);
    seedAmmo(city, slot);
  }

  state.build -= cost;
  logger.log("debug", `Upgrade spent: ${kind}`, { cost, remaining: state.build, city: city.name });
}
