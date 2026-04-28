const STORAGE_KEY = "missile-defence-audio";

export const SOUNDTRACK = [
  "Crateri di Polvere.mp3",
  "Fortezza di Vetro.mp3",
  "Commando Notturno.mp3",
  "Comando di Luna.mp3",
  "Allarme Missile.mp3",
  "Riflessi di guerra.mp3",
  "Neon.mp3",
  "Scia di Cuba.mp3",
  "Scudo Rosso.mp3",
];

const DEFAULT_SETTINGS = {
  track: "Crateri di Polvere.mp3",
  volume: 0.42,
  muted: false,
  disabled: false,
};

const listeners = new Set();
const audio = new Audio();
let userActivated = false;
let settings = loadSettings();

audio.loop = true;
audio.preload = "auto";

applyTrack();
applyVolume();

export function trackTitle(fileName = settings.track) {
  return fileName.replace(/\.mp3$/i, "");
}

export function audioSettings() {
  return { ...settings };
}

export function onAudioChange(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function ensureMusicPlaying() {
  userActivated = true;
  if (settings.disabled) return;
  applyVolume();
  try {
    await audio.play();
  } catch {
    // Browser autoplay policy can still reject until a direct user gesture lands.
  }
}

export function setTrack(track) {
  if (!SOUNDTRACK.includes(track) || track === settings.track) return;
  settings = { ...settings, track };
  applyTrack();
  saveSettings();
  notify();
  if (userActivated) ensureMusicPlaying();
}

export function setVolume(volume) {
  settings = { ...settings, volume: clampVolume(volume) };
  applyVolume();
  saveSettings();
  notify();
}

export function setMusicMuted(muted) {
  settings = { ...settings, muted };
  applyVolume();
  saveSettings();
  notify();
}

export function toggleMusicMuted() {
  setMusicMuted(!settings.muted);
}

export function setMusicDisabled(disabled) {
  settings = { ...settings, disabled };
  applyVolume();
  if (disabled) audio.pause();
  saveSettings();
  notify();
  if (!disabled && userActivated) ensureMusicPlaying();
}

export function nextTrack({ userRequested = true } = {}) {
  if (userRequested) userActivated = true;
  const index = SOUNDTRACK.indexOf(settings.track);
  const nextIndex = index >= 0 ? (index + 1) % SOUNDTRACK.length : 0;
  settings = { ...settings, track: SOUNDTRACK[nextIndex] };
  applyTrack();
  saveSettings();
  notify();
  if (!settings.disabled && userActivated) ensureMusicPlaying();
}

function loadSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    const track = SOUNDTRACK.includes(stored.track) ? stored.track : DEFAULT_SETTINGS.track;
    return {
      track,
      volume: clampVolume(stored.volume ?? DEFAULT_SETTINGS.volume),
      muted: Boolean(stored.muted),
      disabled: Boolean(stored.disabled),
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function applyTrack() {
  audio.src = `soundtrack/${encodeURIComponent(settings.track)}`;
  audio.load();
}

function applyVolume() {
  audio.muted = settings.muted || settings.disabled;
  audio.volume = settings.disabled ? 0 : settings.volume;
}

function clampVolume(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_SETTINGS.volume;
  return Math.max(0, Math.min(1, number));
}

function notify() {
  listeners.forEach((listener) => listener(audioSettings()));
}
