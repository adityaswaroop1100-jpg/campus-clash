/**
 * Campus Clash — Input Handling Subsystem
 * @module engine/input
 */

import { INPUT_ACTIONS } from '../utils/constants.js';

export const DEFAULT_CONTROLS = {
  P1: {
    KeyW: INPUT_ACTIONS.UP,
    KeyS: INPUT_ACTIONS.DOWN,
    KeyA: INPUT_ACTIONS.LEFT,
    KeyD: INPUT_ACTIONS.RIGHT,
    KeyJ: INPUT_ACTIONS.LIGHT,
    KeyK: INPUT_ACTIONS.HEAVY,
    KeyL: INPUT_ACTIONS.BLOCK,
    Space: INPUT_ACTIONS.DODGE
  },
  P2: {
    ArrowUp: INPUT_ACTIONS.UP,
    ArrowDown: INPUT_ACTIONS.DOWN,
    ArrowLeft: INPUT_ACTIONS.LEFT,
    ArrowRight: INPUT_ACTIONS.RIGHT,
    // Laptop / Top row numbers
    Digit1: INPUT_ACTIONS.LIGHT,
    Digit2: INPUT_ACTIONS.HEAVY,
    Digit3: INPUT_ACTIONS.BLOCK,
    Digit0: INPUT_ACTIONS.DODGE,
    // Numpad numbers
    Numpad1: INPUT_ACTIONS.LIGHT,
    Numpad2: INPUT_ACTIONS.HEAVY,
    Numpad3: INPUT_ACTIONS.BLOCK,
    Numpad0: INPUT_ACTIONS.DODGE,
    // Ergonomic right-hand letters
    KeyI: INPUT_ACTIONS.LIGHT,
    KeyO: INPUT_ACTIONS.HEAVY,
    KeyP: INPUT_ACTIONS.BLOCK,
    ShiftRight: INPUT_ACTIONS.DODGE,
    Enter: INPUT_ACTIONS.DODGE
  }
};


export class InputHandler {
  /**
   * Initializes input listeners for both players
   */
  constructor() {
    this.rawKeys = new Set();
    this.justPressedKeys = new Set();
    this.previousKeys = new Set();

    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);

    this.attachListeners();
  }

  /**
   * Attaches window keyboard event listeners
   */
  attachListeners() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  /**
   * Removes event listeners for cleanup
   */
  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.rawKeys.clear();
    this.justPressedKeys.clear();
    this.previousKeys.clear();
  }

  /**
   * Handles keydown event
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    // Never intercept or preventDefault keystrokes if user is interacting with an input/form
    const targetTag = (event.target && event.target.tagName) ? event.target.tagName.toLowerCase() : '';
    if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || (event.target && event.target.isContentEditable)) {
      return;
    }

    if (!this.rawKeys.has(event.code)) {
      this.justPressedKeys.add(event.code);
    }
    this.rawKeys.add(event.code);

    // Prevent scrolling and default browser shortcuts for game controls
    const monitoredCodes = [
      'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', 'ShiftRight',
      'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyJ', 'KeyK', 'KeyL',
      'Digit1', 'Digit2', 'Digit3', 'Digit0',
      'Numpad1', 'Numpad2', 'Numpad3', 'Numpad0',
      'KeyI', 'KeyO', 'KeyP'
    ];
    if (monitoredCodes.includes(event.code)) {
      event.preventDefault();
    }
  }

  /**
   * Handles keyup event
   * @param {KeyboardEvent} event
   */
  handleKeyUp(event) {
    const targetTag = (event.target && event.target.tagName) ? event.target.tagName.toLowerCase() : '';
    if (targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || (event.target && event.target.isContentEditable)) {
      return;
    }

    this.rawKeys.delete(event.code);
    this.justPressedKeys.delete(event.code);
  }

  /**
   * Called at the end of each frame update to clear single-frame press states
   */
  endFrame() {
    this.justPressedKeys.clear();
  }

  /**
   * Checks if an action is currently held down for a player
   * @param {string} action - Action name from INPUT_ACTIONS
   * @param {'P1'|'P2'} [player='P1'] - Player ID
   * @returns {boolean}
   */
  isActionActive(action, player = 'P1') {
    const controls = DEFAULT_CONTROLS[player] || DEFAULT_CONTROLS.P1;

    // Check simultaneous press for Ultimate
    if (action === INPUT_ACTIONS.ULTIMATE) {
      if (player === 'P1') {
        return this.rawKeys.has('KeyJ') && this.rawKeys.has('KeyK');
      }
      // P2: Support Digit1+2, Numpad1+2, or KeyI+KeyO
      return (this.rawKeys.has('Digit1') && this.rawKeys.has('Digit2')) ||
             (this.rawKeys.has('Numpad1') && this.rawKeys.has('Numpad2')) ||
             (this.rawKeys.has('KeyI') && this.rawKeys.has('KeyO'));
    }

    for (const [code, mappedAction] of Object.entries(controls)) {
      if (mappedAction === action && this.rawKeys.has(code)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Checks if an action was pressed on this exact frame
   * @param {string} action - Action name from INPUT_ACTIONS
   * @param {'P1'|'P2'} [player='P1'] - Player ID
   * @returns {boolean}
   */
  isActionJustPressed(action, player = 'P1') {
    const controls = DEFAULT_CONTROLS[player] || DEFAULT_CONTROLS.P1;

    if (action === INPUT_ACTIONS.ULTIMATE) {
      if (player === 'P1') {
        return (this.justPressedKeys.has('KeyJ') && this.rawKeys.has('KeyK')) ||
               (this.justPressedKeys.has('KeyK') && this.rawKeys.has('KeyJ'));
      }
      // P2: Digit1+2, Numpad1+2, or KeyI+KeyO
      return (this.justPressedKeys.has('Digit1') && this.rawKeys.has('Digit2')) ||
             (this.justPressedKeys.has('Digit2') && this.rawKeys.has('Digit1')) ||
             (this.justPressedKeys.has('Numpad1') && this.rawKeys.has('Numpad2')) ||
             (this.justPressedKeys.has('Numpad2') && this.rawKeys.has('Numpad1')) ||
             (this.justPressedKeys.has('KeyI') && this.rawKeys.has('KeyO')) ||
             (this.justPressedKeys.has('KeyO') && this.rawKeys.has('KeyI'));
    }

    for (const [code, mappedAction] of Object.entries(controls)) {
      if (mappedAction === action && this.justPressedKeys.has(code)) {
        return true;
      }
    }
    return false;
  }
}
