// =============================================================================
// Input — Keyboard and mouse event handling
// =============================================================================

import { state } from "../state.js";
import { CANVAS_WIDTH, CANVAS_HEIGHT } from "../config.js";
import { aimPlayerTurretsAt, firePlayerTurrets, launchMissile } from "../entities/weapons.js";
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

// --- Mouse handlers ---

function playerTurretUsesMouse(mode) {
  return mode === "turret" && state.turretInputMode === "mouse";
}

export function handleCanvasMouseDown(event, canvas, mode) {
  if (event.target !== canvas) return;
  const point = canvasPoint(event, canvas);
  if (playerTurretUsesMouse(mode)) {
    event.preventDefault();
    aimPlayerTurretsAt(point, state.turretAimMode);
    firePlayerTurrets(16);
    logger.log("debug", "Player turret mouse fire", { ...point, aim: state.turretAimMode });
    return;
  }
  if (mode === "turret") return;
  launchMissile(point);
  logger.log("debug", "Player clicked", point);
}

export function handleCanvasMouseMove(event, canvas, mode) {
  if (event.target !== canvas || !playerTurretUsesMouse(mode)) return;
  aimPlayerTurretsAt(canvasPoint(event, canvas), state.turretAimMode);
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
  canvas.addEventListener("mousedown", (event) => handleCanvasMouseDown(event, canvas, getMode()));
  canvas.addEventListener("mousemove", (event) => handleCanvasMouseMove(event, canvas, getMode()));
  document.addEventListener("keydown", handleKeyDown);
  document.addEventListener("keyup", handleKeyUp);
}
