export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const GROUND_Y = CANVAS_HEIGHT - 72;

export const DIFFICULTY = {
  cadet: { label: "Cadetto", speed: 0.78, count: 0.78, build: 1.25, ai: 0.9, cityHp: 120 },
  normal: { label: "Normale", speed: 1, count: 1, build: 1, ai: 1.25, cityHp: 100 },
  veteran: { label: "Veterano", speed: 1.18, count: 1.25, build: 0.86, ai: 1.65, cityHp: 90 },
  nightmare: { label: "Incubo", speed: 1.36, count: 1.52, build: 0.72, ai: 2.1, cityHp: 80 },
};

export const MISSILE_DEFS = {
  standard: { label: "Standard", cost: 1, speed: 5.3, radius: 42, damage: 1, color: "#e9f6ff", unlock: 1 },
  he: { label: "HE", cost: 2, speed: 4.25, radius: 68, damage: 1, color: "#ffcf5a", unlock: 2 },
  frag: { label: "Frammentazione", cost: 2, speed: 4.7, radius: 30, damage: 1, color: "#99f5cd", unlock: 2 },
  guided: { label: "Guidato", cost: 2, speed: 5.15, radius: 38, damage: 1, color: "#73a9ff", unlock: 3 },
  emp: { label: "EMP", cost: 2, speed: 4.75, radius: 55, damage: 0.4, color: "#b18cff", unlock: 4 },
};

export const TURRET_DEFS = {
  cannon: { label: "Cannoncino", cooldown: 420, heat: 10, damage: 1.25, speed: 9, color: "#f8d16b", unlock: 1 },
  mg: { label: "Mitragliatrice", cooldown: 82, heat: 7, damage: 0.34, speed: 11, color: "#d8f2ff", unlock: 1 },
  laser: { label: "Laser", cooldown: 45, heat: 13, damage: 0.08, speed: 0, color: "#67e6ff", unlock: 2 },
};

export const ENEMY_DEFS = {
  missile: { hp: 1, damage: 26, score: 25, color: "#ff6565", radius: 7 },
  mirv: { hp: 1.2, damage: 22, score: 70, color: "#ff9a57", radius: 8 },
  armored: { hp: 2.4, damage: 36, score: 90, color: "#ff4d7e", radius: 10 },
  hypersonic: { hp: 0.8, damage: 28, score: 80, color: "#ffffff", radius: 5 },
  drone: { hp: 0.6, damage: 10, score: 35, color: "#7cffbf", radius: 6 },
  jammer: { hp: 0.9, damage: 8, score: 60, color: "#c794ff", radius: 8 },
  bomber: { hp: 2.1, damage: 0, score: 120, color: "#86a3b8", radius: 14 },
  bomb: { hp: 0.7, damage: 24, score: 40, color: "#f4f17a", radius: 6 },
};

export const UPGRADE_COSTS = {
  repair: 2,
  factory: 4,
  launcher: 3,
  cannon: 3,
  mg: 3,
  laser: 5,
  shield: 4,
  ammo: 2,
};
