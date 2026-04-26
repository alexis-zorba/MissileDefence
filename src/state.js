// =============================================================================
// GameState — Centralized, observable game state
// =============================================================================
// All game state lives here. Modules read/write via exported methods.
// An event emitter notifies subscribers of changes (used by UI and debug logger).
// =============================================================================

import { DIFFICULTY, MISSILE_DEFS, TURRET_DEFS, UPGRADE_COSTS, CANVAS_WIDTH, GROUND_Y } from "./config.js";
import { makeId } from "./utils.js";

// --- Constants (only used internally by state) ---
const DEFAULT_GAME_SPEED = 1.25;
const DEFAULT_VISUAL_SCALE = 0.45;
const WAVE_CLEAR_BONUS = 6;
const INITIAL_BUILD_CREDIT = 6;
const MAX_FACTORIES_PER_BASE = 3;
const MAX_WEAPON_LEVEL = 3;

const FACTORY_LAYOUT = [
  { dx: -58, y: GROUND_Y },
  { dx: 58, y: GROUND_Y },
  { dx: 0, y: GROUND_Y },
];

const AI_SKILLS = {
  normal: { delay: 0.95, aimNoise: 34, lead: 1.0 },
  expert: { delay: 0.72, aimNoise: 16, lead: 1.0 },
  pro: { delay: 0.52, aimNoise: 5, lead: 1.05 },
};

// --- Event Emitter ---
const listeners = {};

function on(event, fn) {
  (listeners[event] ||= []).push(fn);
  return () => off(event, fn);
}

function off(event, fn) {
  const list = listeners[event];
  if (list) listeners[event] = list.filter((f) => f !== fn);
}

function emit(event, payload) {
  (listeners[event] || []).forEach((fn) => fn(payload));
}

// --- State object ---
const state = {
  running: false,
  paused: false,
  betweenWaves: true,
  wave: 1,
  score: 0,
  build: 0,
  selectedCity: 0,
  keys: new Set(),
  lastTime: 0,
  spawnTimer: 0,
  enemiesToSpawn: 0,
  aiMissileTimer: 0,
  aiTurretTimer: 0,
  turretTurnVelocity: 0,
  globalTurretAngle: -Math.PI / 2,
  turretSensitivity: 1.7,
  turretCurve: 1,
  turretInputMode: "keyboard",
  turretAimMode: "parallel",
  aiSkill: "normal",
  aiTurretAimMode: "independent",
  trailDuration: 2.2,
  cloudsEnabled: true,
  debugMode: false,
  gameSpeed: DEFAULT_GAME_SPEED,
  visualScale: DEFAULT_VISUAL_SCALE,
  playerTurretIndex: 1,
  cities: [],
  factories: [],
  friendlyMissiles: [],
  friendlyBullets: [],
  enemies: [],
  blasts: [],
  particles: [],
};

// --- Slot / Factory / Weapon helpers ---

export function createWeaponSlot(role, index) {
  return {
    id: `${role}-${index}`,
    role,
    index,
    type: null,
    level: 0,
    ammo: 0,
    cooldown: 0,
    heat: 0,
  };
}

export function installSlot(slot, type) {
  slot.type = type;
  slot.level = 1;
  slot.ammo = 0;
  slot.cooldown = 0;
  slot.heat = 0;
  return slot;
}

export function initialWeaponSlots(baseIndex) {
  const slots = [
    createWeaponSlot("missile", 0),
    createWeaponSlot("missile", 1),
    createWeaponSlot("turret", 0),
    createWeaponSlot("turret", 1),
  ];
  if (baseIndex === 0) installSlot(slots[0], "ballistic");
  if (baseIndex === 1) installSlot(slots[2], "cannon");
  if (baseIndex === 2) installSlot(slots[2], "mg");
  return slots;
}

export function createFactory(baseIndex, slot, hp) {
  const base = state.cities[baseIndex];
  const layout = FACTORY_LAYOUT[slot] || FACTORY_LAYOUT[0];
  return {
    id: makeId(),
    name: `F${baseIndex + 1}.${slot + 1}`,
    baseIndex,
    slot,
    x: base.x + layout.dx,
    y: layout.y,
    hp,
    maxHp: hp,
    level: 1,
    ruinSeed: Math.random(),
  };
}

// --- Slot queries ---

export function installedSlots(city, role = null) {
  return (city?.slots || []).filter((slot) => slot.type && (!role || slot.role === role));
}

export function missileSlots(city) {
  return installedSlots(city, "missile");
}

export function turretSlots(city) {
  return installedSlots(city, "turret");
}

export function firstTurret(city) {
  return turretSlots(city)[0];
}

export function factoriesForBase(baseIndex) {
  return state.factories.filter((factory) => factory.baseIndex === baseIndex);
}

export function factorySummary(baseIndex) {
  const factories = factoriesForBase(baseIndex);
  const living = factories.filter((factory) => factory.hp > 0);
  const production = living.reduce((sum, factory) => sum + factory.level, 0);
  return `Fab ${living.length}/${factories.length} P${production}`;
}

// --- Stats helpers ---

export function missileStats(slot) {
  const def = MISSILE_DEFS[slot.type];
  return def?.levels[Math.max(0, slot.level - 1)] || null;
}

export function turretStats(slot) {
  const def = TURRET_DEFS[slot.type];
  return def?.levels[Math.max(0, slot.level - 1)] || null;
}

export function maxAmmo(city, slot) {
  if (!slot?.type) return 0;
  const magazineLevel = city.magazineLevel || 1;
  if (slot.type === "ballistic") return 24 + slot.level * 8 + magazineLevel * 8;
  if (slot.type === "seeker") return 9 + slot.level * 4 + magazineLevel * 4;
  if (slot.type === "cannon") return 46 + slot.level * 12 + magazineLevel * 14;
  if (slot.type === "mg") return 170 + slot.level * 34 + magazineLevel * 46;
  if (slot.type === "laser") return 76 + slot.level * 20 + magazineLevel * 26;
  return 0;
}

export function replenishAmmo(slot) {
  if (slot.type === "ballistic") return 12;
  if (slot.type === "seeker") return 5;
  if (slot.type === "cannon") return 20;
  if (slot.type === "mg") return 68;
  if (slot.type === "laser") return 30;
  return 0;
}

export function seedAmmo(city, slot) {
  slot.ammo = Math.max(slot.ammo, Math.ceil(maxAmmo(city, slot) * 0.45));
}

export function weaponLabel(id) {
  return MISSILE_DEFS[id]?.label || TURRET_DEFS[id]?.label || "Nessuna";
}

export function slotLabel(slot) {
  return slot?.type ? `${weaponLabel(slot.type)} L${slot.level}` : "Slot vuoto";
}

export function activeAmmoText(city) {
  if (!city || city.hp <= 0) return "Distrutta";
  const slots = installedSlots(city);
  if (!slots.length) return "Senza armi";
  const ammo = slots.reduce((sum, slot) => sum + slot.ammo, 0);
  const max = slots.reduce((sum, slot) => sum + maxAmmo(city, slot), 0);
  return `Mun. ${ammo}/${max}`;
}

export function weaponColor(weapon) {
  if (weapon === "ballistic") return MISSILE_DEFS.ballistic.color;
  if (weapon === "seeker") return MISSILE_DEFS.seeker.color;
  return TURRET_DEFS[weapon]?.color || "#d6dfe3";
}

export function primaryWeaponType(city) {
  return installedSlots(city)[0]?.type || null;
}

// --- State reset ---

export function resetState(difficultyCfg, citiesConfig) {
  const hp = difficultyCfg.cityHp;
  const factoryHp = Math.round(hp * 0.58);
  state.running = true;
  state.paused = false;
  state.betweenWaves = true;
  state.wave = 1;
  state.score = 0;
  state.build = INITIAL_BUILD_CREDIT;
  state.selectedCity = 0;
  state.playerTurretIndex = 1;
  state.turretTurnVelocity = 0;
  state.globalTurretAngle = -Math.PI / 2;
  state.friendlyMissiles = [];
  state.friendlyBullets = [];
  state.enemies = [];
  state.blasts = [];
  state.particles = [];
  state.cities = citiesConfig.map((name, i) => ({
    name,
    x: CANVAS_WIDTH * (0.22 + i * 0.28),
    y: GROUND_Y,
    hp,
    maxHp: hp,
    slots: initialWeaponSlots(i),
    magazineLevel: 1,
    blastRadiusLevel: 1,
    blastLifeLevel: 1,
    shield: 0,
    turretAngle: state.globalTurretAngle,
    ruinSeed: Math.random(),
    disabled: 0,
  }));
  state.cities.forEach((city) => installedSlots(city).forEach((slot) => {
    slot.ammo = Math.ceil(maxAmmo(city, slot) * 0.65);
  }));
  state.factories = state.cities.map((_, i) => createFactory(i, 0, factoryHp));
  emit("reset", { state });
}

// --- Public API ---

export { state, on, off, emit, DIFFICULTY, MISSILE_DEFS, TURRET_DEFS, UPGRADE_COSTS, AI_SKILLS, MAX_FACTORIES_PER_BASE, MAX_WEAPON_LEVEL, WAVE_CLEAR_BONUS, DEFAULT_GAME_SPEED, DEFAULT_VISUAL_SCALE };
