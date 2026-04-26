export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const GROUND_Y = CANVAS_HEIGHT - 72;

export const SLOT_OFFSETS = {
  missile: [-24, 24],
  turret: [-18, 18],
};

export const DIFFICULTY = {
  cadet: { label: "Cadetto", speed: 0.78, count: 0.78, build: 1.25, ai: 0.9, cityHp: 120 },
  normal: { label: "Normale", speed: 1, count: 1, build: 1, ai: 1.25, cityHp: 100 },
  veteran: { label: "Veterano", speed: 1.18, count: 1.25, build: 0.86, ai: 1.65, cityHp: 90 },
  nightmare: { label: "Incubo", speed: 1.36, count: 3, build: 0.72, ai: 2.1, cityHp: 80 },
};

export const MISSILE_DEFS = {
  ballistic: {
    label: "Razzo balistico",
    color: "#e9f6ff",
    levels: [
      { cost: 1, speed: 5.2, radius: 40, damage: 1, cooldown: 520 },
      { cost: 1, speed: 5.05, radius: 54, damage: 1, cooldown: 470 },
      { cost: 2, speed: 4.85, radius: 70, damage: 1.15, cooldown: 430 },
    ],
  },
  seeker: {
    label: "Razzo seeker",
    color: "#73a9ff",
    levels: [
      { cost: 1, speed: 5.35, radius: 34, damage: 0.95, cooldown: 1120, turn: 0.095, lead: 14 },
      { cost: 1, speed: 5.95, radius: 42, damage: 1, cooldown: 980, turn: 0.13, lead: 22 },
      { cost: 2, speed: 6.55, radius: 52, damage: 1.1, cooldown: 840, turn: 0.17, lead: 30 },
    ],
  },
};

export const TURRET_DEFS = {
  cannon: {
    label: "Cannoncino",
    color: "#f8d16b",
    levels: [
      { cooldown: 500, heat: 14, damage: 1.3, speed: 8.6, ammoCost: 1, radius: 4 },
      { cooldown: 430, heat: 15, damage: 1.6, speed: 9, ammoCost: 1, radius: 4.5 },
      { cooldown: 360, heat: 17, damage: 2, speed: 9.3, ammoCost: 1, radius: 5 },
    ],
  },
  mg: {
    label: "Mitragliatrice",
    color: "#d8f2ff",
    levels: [
      { cooldown: 96, heat: 6, damage: 0.34, speed: 11, ammoCost: 1, radius: 2.4 },
      { cooldown: 78, heat: 6.5, damage: 0.42, speed: 11.4, ammoCost: 1, radius: 2.6 },
      { cooldown: 62, heat: 7, damage: 0.5, speed: 11.8, ammoCost: 1, radius: 2.8 },
    ],
  },
  laser: {
    label: "Laser",
    color: "#67e6ff",
    levels: [
      { cooldown: 220, heat: 14, damage: 0.12, speed: 0, ammoCost: 1, width: 15 },
      { cooldown: 195, heat: 13, damage: 0.15, speed: 0, ammoCost: 1, width: 18 },
      { cooldown: 170, heat: 12, damage: 0.18, speed: 0, ammoCost: 1, width: 21 },
    ],
  },
};

export const ENEMY_DEFS = {
  missile: { hp: 1, damage: 26, score: 25, color: "#ff6565", radius: 7 },
  mirv: { hp: 1.2, damage: 22, score: 70, color: "#ff9a57", radius: 8 },
  armored: { hp: 2.4, damage: 36, score: 90, color: "#ff4d7e", radius: 10 },
  hypersonic: { hp: 0.8, damage: 28, score: 80, color: "#ffffff", radius: 5 },
  drone: { hp: 0.38, damage: 7, score: 35, color: "#7cffbf", radius: 4 },
  jammer: { hp: 0.9, damage: 8, score: 60, color: "#c794ff", radius: 8 },
  bomber: { hp: 2.1, damage: 0, score: 120, color: "#86a3b8", radius: 14 },
  bomb: { hp: 1.25, damage: 68, score: 75, color: "#d8c783", radius: 11 },
};

export const UPGRADE_COSTS = {
  repair: 2,
  factory: 4,
  launcher: 3,
  seeker: 5,
  cannon: 3,
  mg: 3,
  laser: 5,
  shield: 4,
  ammo: 1,
  magazine: 6,
  blastRadius: 8,
  blastLife: 8,
};
