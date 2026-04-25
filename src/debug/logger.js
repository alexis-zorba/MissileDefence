// =============================================================================
// Logger — Debug infrastructure with levels, snapshots, and metrics
// =============================================================================
// Activated via settings → "Debug calibrazione" checkbox.
// Provides: state snapshots, FPS counter, entity counts, event log.
// =============================================================================

const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
let currentLevel = LEVELS.WARN;
let enabled = false;
const history = [];
const MAX_HISTORY = 500;

const fps = { frames: 0, lastTime: 0, value: 0 };

export function enable() {
  enabled = true;
  currentLevel = LEVELS.DEBUG;
  log("debug", "Logger enabled");
}

export function disable() {
  log("debug", "Logger disabled");
  enabled = false;
  currentLevel = LEVELS.WARN;
}

export function setLevel(level) {
  currentLevel = LEVELS[level.toUpperCase()] ?? LEVELS.WARN;
}

export function log(level, message, data = null) {
  if (!enabled && level !== "error") return;
  if (LEVELS[level.toUpperCase()] < currentLevel) return;
  const entry = {
    ts: performance.now(),
    level,
    message,
    data: data ? structuredClone?.(data) ?? JSON.parse(JSON.stringify(data)) : null,
  };
  history.push(entry);
  if (history.length > MAX_HISTORY) history.shift();
  const style = level === "error" ? "color:#ff5f5f" : level === "warn" ? "color:#f4bf54" : level === "info" ? "color:#55d6be" : "color:#95aab3";
  if (data) console.log(`%c[${level.toUpperCase()}] ${message}`, style, data);
  else console.log(`%c[${level.toUpperCase()}] ${message}`, style);
}

export function snapshot(state) {
  if (!enabled) return;
  log("debug", "State snapshot", {
    wave: state.wave,
    score: state.score,
    build: state.build,
    enemies: state.enemies.length,
    missiles: state.friendlyMissiles.length,
    bullets: state.friendlyBullets.length,
    blasts: state.blasts.length,
    particles: state.particles.length,
    cities: state.cities.map((c) => ({ name: c.name, hp: c.hp, disabled: c.disabled })),
    factories: state.factories.map((f) => ({ name: f.name, hp: f.hp, level: f.level })),
    fps: fps.value,
    paused: state.paused,
    betweenWaves: state.betweenWaves,
  });
}

export function tickFps(now) {
  fps.frames += 1;
  if (now - fps.lastTime >= 1000) {
    fps.value = fps.frames;
    fps.frames = 0;
    fps.lastTime = now;
  }
}

export function getFps() {
  return fps.value;
}

export function getHistory(level = null) {
  return level ? history.filter((e) => e.level === level) : [...history];
}

export function clearHistory() {
  history.length = 0;
}

export function metric(state) {
  return {
    fps: fps.value,
    entities: {
      enemies: state.enemies.length,
      missiles: state.friendlyMissiles.length,
      bullets: state.friendlyBullets.length,
      blasts: state.blasts.length,
      particles: state.particles.length,
    },
    total: state.enemies.length + state.friendlyMissiles.length + state.friendlyBullets.length + state.blasts.length + state.particles.length,
  };
}
