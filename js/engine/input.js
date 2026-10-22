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
   * Initializes input listeners for both players (Keyboard + Gamepad + Virtual Touch)
   */
  constructor() {
    this.rawKeys = new Set();
    this.justPressedKeys = new Set();
    this.previousKeys = new Set();

    // Gamepad state
    this.gamepadConnected = [false, false];
    this.prevGamepadButtons = [{}, {}];
    this.currGamepadButtons = [{}, {}];
    this.currGamepadAxes = [{ x: 0, y: 0 }, { x: 0, y: 0 }];

    // Virtual Touch state (for mobile / arcade kiosk touch screens)
    this.touchActionsActive = { P1: new Set(), P2: new Set() };
    this.touchActionsJustPressed = { P1: new Set(), P2: new Set() };

    this.onKeyDown = this.handleKeyDown.bind(this);
    this.onKeyUp = this.handleKeyUp.bind(this);
    this.onGamepadConnected = this.handleGamepadConnected.bind(this);
    this.onGamepadDisconnected = this.handleGamepadDisconnected.bind(this);

    this.attachListeners();
  }

  /**
   * Attaches window keyboard and gamepad event listeners
   */
  attachListeners() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('gamepadconnected', this.onGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected);
  }

  handleGamepadConnected(e) {
    const pad = e.gamepad;
    console.log(`[Input] Gamepad connected at index ${pad.index}: ${pad.id}`);
    this.showGamepadToast(`🎮 Gamepad ${pad.index + 1} Connected: ${pad.id.slice(0, 24)}...`);
  }

  handleGamepadDisconnected(e) {
    const pad = e.gamepad;
    console.log(`[Input] Gamepad disconnected from index ${pad.index}`);
    this.showGamepadToast(`⚠️ Gamepad ${pad.index + 1} Disconnected`);
  }

  showGamepadToast(message) {
    let toast = document.getElementById('gamepad-hud-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'gamepad-hud-toast';
      toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(4,14,30,0.92);border:1px solid #00e5ff;color:#00e5ff;padding:8px 18px;border-radius:20px;font-family:Orbitron,monospace;font-size:12px;font-weight:700;letter-spacing:1px;box-shadow:0 0 15px rgba(0,229,255,0.4);z-index:999999;transition:opacity 0.4s, transform 0.4s;pointer-events:none;display:flex;align-items:center;gap:8px;';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      if (toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(12px)';
      }
    }, 3200);
  }

  /**
   * Polls gamepads on every frame update
   */
  pollGamepads() {
    if (!navigator.getGamepads) return;
    const gamepads = navigator.getGamepads();
    for (let playerIdx = 0; playerIdx < 2; playerIdx++) {
      const pad = gamepads[playerIdx];
      if (!pad) {
        this.gamepadConnected[playerIdx] = false;
        continue;
      }
      this.gamepadConnected[playerIdx] = true;

      // Store previous state for edge detection
      this.prevGamepadButtons[playerIdx] = { ...this.currGamepadButtons[playerIdx] };

      // Poll buttons
      const btnState = {};
      for (let b = 0; b < pad.buttons.length; b++) {
        btnState[b] = pad.buttons[b].pressed;
      }
      this.currGamepadButtons[playerIdx] = btnState;

      // Poll axes with 0.35 deadzone
      const deadzone = 0.35;
      const rawX = pad.axes[0] || 0;
      const rawY = pad.axes[1] || 0;
      this.currGamepadAxes[playerIdx] = {
        x: Math.abs(rawX) > deadzone ? rawX : 0,
        y: Math.abs(rawY) > deadzone ? rawY : 0
      };
    }
  }

  /**
   * Removes event listeners for cleanup
   */
  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('gamepadconnected', this.onGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected);
    this.rawKeys.clear();
    this.justPressedKeys.clear();
    this.previousKeys.clear();
  }

  /**
   * Handles keydown event
   * @param {KeyboardEvent} event
   */
  handleKeyDown(event) {
    // 1. If Entry Portal modal is displayed, ignore all game controls
    const portal = document.getElementById('entry-portal');
    if (portal && !portal.classList.contains('hidden')) {
      return;
    }

    // 2. Never intercept keystrokes if focused on any input or form element
    const activeEl = document.activeElement;
    const activeTag = (activeEl && activeEl.tagName) ? activeEl.tagName.toLowerCase() : '';
    const targetTag = (event.target && event.target.tagName) ? event.target.tagName.toLowerCase() : '';
    if (
      targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || (event.target && event.target.isContentEditable) ||
      activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || (activeEl && activeEl.isContentEditable)
    ) {
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
    const portal = document.getElementById('entry-portal');
    if (portal && !portal.classList.contains('hidden')) {
      return;
    }

    const activeEl = document.activeElement;
    const activeTag = (activeEl && activeEl.tagName) ? activeEl.tagName.toLowerCase() : '';
    const targetTag = (event.target && event.target.tagName) ? event.target.tagName.toLowerCase() : '';
    if (
      targetTag === 'input' || targetTag === 'textarea' || targetTag === 'select' || (event.target && event.target.isContentEditable) ||
      activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || (activeEl && activeEl.isContentEditable)
    ) {
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
    this.touchActionsJustPressed.P1.clear();
    this.touchActionsJustPressed.P2.clear();
  }

  /**
   * Helper to check gamepad action hold state
   */
  isGamepadActionActive(action, padIdx) {
    if (!this.gamepadConnected[padIdx]) return false;
    const btns = this.currGamepadButtons[padIdx] || {};
    const axes = this.currGamepadAxes[padIdx] || { x: 0, y: 0 };

    switch (action) {
      case INPUT_ACTIONS.UP:
        return !!btns[12] || axes.y < -0.4;
      case INPUT_ACTIONS.DOWN:
        return !!btns[13] || axes.y > 0.4;
      case INPUT_ACTIONS.LEFT:
        return !!btns[14] || axes.x < -0.4;
      case INPUT_ACTIONS.RIGHT:
        return !!btns[15] || axes.x > 0.4;
      case INPUT_ACTIONS.LIGHT:
        return !!btns[0]; // A / Cross
      case INPUT_ACTIONS.HEAVY:
        return !!btns[2]; // X / Square
      case INPUT_ACTIONS.BLOCK:
        return !!btns[1]; // B / Circle
      case INPUT_ACTIONS.DODGE:
        return !!btns[3]; // Y / Triangle
      case INPUT_ACTIONS.ULTIMATE:
        return !!btns[4] || !!btns[5] || !!btns[6] || !!btns[7] || (!!btns[0] && !!btns[2]);
      default:
        return false;
    }
  }

  /**
   * Helper to check gamepad action just-pressed state (edge trigger)
   */
  isGamepadActionJustPressed(action, padIdx) {
    if (!this.gamepadConnected[padIdx]) return false;
    const curr = this.currGamepadButtons[padIdx] || {};
    const prev = this.prevGamepadButtons[padIdx] || {};
    const justPress = (b) => !!curr[b] && !prev[b];

    switch (action) {
      case INPUT_ACTIONS.UP:
        return justPress(12);
      case INPUT_ACTIONS.DOWN:
        return justPress(13);
      case INPUT_ACTIONS.LEFT:
        return justPress(14);
      case INPUT_ACTIONS.RIGHT:
        return justPress(15);
      case INPUT_ACTIONS.LIGHT:
        return justPress(0);
      case INPUT_ACTIONS.HEAVY:
        return justPress(2);
      case INPUT_ACTIONS.BLOCK:
        return justPress(1);
      case INPUT_ACTIONS.DODGE:
        return justPress(3);
      case INPUT_ACTIONS.ULTIMATE:
        return justPress(4) || justPress(5) || justPress(6) || justPress(7) ||
               (justPress(0) && !!curr[2]) || (justPress(2) && !!curr[0]);
      default:
        return false;
    }
  }

  /**
   * Checks if an action is currently held down for a player (Keyboard + Gamepad + Touch)
   * @param {string} action - Action name from INPUT_ACTIONS
   * @param {'P1'|'P2'} [player='P1'] - Player ID
   * @returns {boolean}
   */
  isActionActive(action, player = 'P1') {
    const padIdx = player === 'P1' ? 0 : 1;

    // Check Gamepad
    if (this.isGamepadActionActive(action, padIdx)) {
      return true;
    }

    // Check Virtual Touch
    if (this.touchActionsActive[player] && this.touchActionsActive[player].has(action)) {
      return true;
    }

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
   * Checks if an action was pressed on this exact frame (Keyboard + Gamepad + Touch)
   * @param {string} action - Action name from INPUT_ACTIONS
   * @param {'P1'|'P2'} [player='P1'] - Player ID
   * @returns {boolean}
   */
  isActionJustPressed(action, player = 'P1') {
    const padIdx = player === 'P1' ? 0 : 1;

    // Check Gamepad
    if (this.isGamepadActionJustPressed(action, padIdx)) {
      return true;
    }

    // Check Virtual Touch
    if (this.touchActionsJustPressed[player] && this.touchActionsJustPressed[player].has(action)) {
      return true;
    }

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
