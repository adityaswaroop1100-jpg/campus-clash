/**
 * Campus Clash — Hitbox & Hurtbox System
 * @module engine/hitbox
 */

export class Box {
  /**
   * @param {number} x - Relative offset X
   * @param {number} y - Relative offset Y
   * @param {number} w - Width
   * @param {number} h - Height
   * @param {Object} [props={}] - Move properties (damage, hitstun, knockback, etc.)
   */
  constructor(x, y, w, h, props = {}) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.props = props;
  }

  /**
   * Gets absolute bounding box considering fighter world position and facing direction
   * @param {number} entityX
   * @param {number} entityY
   * @param {number} facing - 1 for right, -1 for left
   * @returns {{x: number, y: number, w: number, h: number}}
   */
  getWorldBounds(entityX, entityY, facing = 1) {
    const boxX = facing === 1 ? entityX + this.x : entityX - this.x - this.w;
    return {
      x: boxX,
      y: entityY + this.y,
      w: this.w,
      h: this.h
    };
  }
}

export class MoveData {
  /**
   * @param {Object} config
   */
  constructor(config) {
    Object.assign(this, config);
    this.name = config.name || 'Attack';
    this.startup = config.startup || 4;     // Frames before hitbox activates
    this.active = config.active || 3;       // Frames hitbox stays active
    this.recovery = config.recovery || 6;   // Frames after active before returning to idle
    this.hitbox = config.hitbox || { x: 40, y: -20, w: 30, h: 20 };
    this.damage = config.damage || 8;
    this.hitstun = config.hitstun || 12;
    this.knockback = config.knockback || { x: 5, y: 0 };
    this.blockable = config.blockable !== false;
    this.isProjectile = !!config.isProjectile;
    this.specialEffect = config.specialEffect || null;
    this.trajectory = config.trajectory || 'thrust';
    this.hitStop = config.hitStop !== undefined ? config.hitStop : 5;
    this.whiffRecovery = config.whiffRecovery !== undefined ? config.whiffRecovery : 0;
    this.duration = config.duration || (this.startup + this.active + this.recovery);
  }

  /**
   * Total frame duration of the attack
   */
  getTotalFrames() {
    return this.startup + this.active + this.recovery;
  }

  /**
   * Checks if move is in active hitbox phase at given frame
   * @param {number} frame
   * @returns {boolean}
   */
  isActiveFrame(frame) {
    return frame >= this.startup && frame < (this.startup + this.active);
  }
}
