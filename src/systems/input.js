// =============================================================================
// Input — Keyboard and mouse event handling
// =============================================================================

import { state } from "../state.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../config.js";
import { launchMissile } from "../entities/weapons.js";
import * as logger from "../debug/logger.js";

const W = CANVAS_WIDTH;
const H = CANVAS_HEIGHT;

// --- Canvas coordinate from mouse event ---

export function canvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * W,
    y: ((event.clientY - rect.top) / rect.height) * H,
  };
}

// --- Mouse click handler ---

export function handleCanvasClick(event, canvas, mode) {
  if (event.target !== canvas) return;
  if (mode === "turret") return;
  const point = canvasPoint(event, canvas);
  launchMissile(point);
  logger.log("debug", "Player clicked", point);
}

// --- Keyboard handlers ---

export function handleKeyDown(event) {
  if (["ArrowLeft", "ArrowRight", "Space"].includes(event.code)) event.preventDefault();
  state.keys.add(event.code);
}

export function handleKeyUp(event) {
  state.keys.delete(event.code);
}

// --- Bind all input events ---

export function bindInput(canvas, getMode) {
  canvas.addEventListener("click", (event) => handleCanvasClick(event, canvas, getMode()));
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
}
