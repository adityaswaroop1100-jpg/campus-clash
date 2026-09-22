/**
 * Campus Clash — Fighter Finite State Machine
 * @module engine/stateMachine
 */

import { FIGHTER_STATES } from '../utils/constants.js';

export class StateMachine {
  /**
   * @param {Object} owner - The entity that owns this state machine (e.g. Fighter)
   */
  constructor(owner) {
    this.owner = owner;
    this.currentState = FIGHTER_STATES.IDLE;
    this.stateTimer = 0;
    this.stateData = null;
  }

  /**
   * Transitions to a new state
   * @param {string} newState - State name from FIGHTER_STATES
   * @param {Object} [data=null] - Optional transition data
   */
  changeState(newState, data = null) {
    if (this.currentState === newState && !data?.force) return;

    this.exitState(this.currentState);
    this.currentState = newState;
    this.stateTimer = 0;
    this.stateData = data;
    this.enterState(newState, data);
  }

  /**
   * Called when entering a state
   * @param {string} state
   * @param {Object} [data]
   */
  enterState(state, data) {
    if (state === FIGHTER_STATES.ATTACKING && data?.move) {
      this.owner.currentMove = data.move;
      this.owner.moveFrame = 0;
    }
  }

  /**
   * Called when exiting a state
   * @param {string} state
   */
  exitState(state) {
    if (state === FIGHTER_STATES.ATTACKING) {
      this.owner.currentMove = null;
      this.owner.activeHitboxes = [];
    }
  }

  /**
   * Updates state timer
   * @param {number} dt
   */
  update(dt) {
    this.stateTimer += dt;
  }

  /**
   * Returns current state name
   * @returns {string}
   */
  getState() {
    return this.currentState;
  }

  /**
   * Checks if fighter is currently actionable (can walk, jump, attack, block, dodge)
   * @returns {boolean}
   */
  isActionable() {
    return (
      this.currentState === FIGHTER_STATES.IDLE ||
      this.currentState === FIGHTER_STATES.WALKING
    );
  }
}
