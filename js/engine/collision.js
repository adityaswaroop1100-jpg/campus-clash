/**
 * Campus Clash — AABB Collision Detection & Stage Clamping
 * @module engine/collision
 */

export class CollisionSystem {
  /**
   * Tests AABB intersection between two rectangles
   * @param {{x: number, y: number, w: number, h: number}} rectA
   * @param {{x: number, y: number, w: number, h: number}} rectB
   * @returns {boolean}
   */
  static checkAABB(rectA, rectB) {
    return (
      rectA.x < rectB.x + rectB.w &&
      rectA.x + rectA.w > rectB.x &&
      rectA.y < rectB.y + rectB.h &&
      rectA.y + rectA.h > rectB.y
    );
  }

  /**
   * Clamps fighter position within arena boundaries
   * @param {Object} fighter
   * @param {number} minX - Left stage limit
   * @param {number} maxX - Right stage limit
   * @param {number} groundY - Floor Y level
   */
  static clampFighter(fighter, minX, maxX, groundY) {
    // Floor physics
    if (fighter.y >= groundY) {
      fighter.y = groundY;
      fighter.vy = 0;
      fighter.isGrounded = true;
    } else {
      fighter.isGrounded = false;
    }

    // Horizontal bounds
    const halfWidth = fighter.width / 2;
    if (fighter.x - halfWidth < minX) {
      fighter.x = minX + halfWidth;
      fighter.vx = 0;
    } else if (fighter.x + halfWidth > maxX) {
      fighter.x = maxX - halfWidth;
      fighter.vx = 0;
    }
  }

  /**
   * Resolves body push between two fighters so they don't overlap completely
   * @param {Object} fighterA
   * @param {Object} fighterB
   */
  static resolveBodyPush(fighterA, fighterB) {
    const minDistance = (fighterA.width + fighterB.width) * 0.38;
    const diff = fighterB.x - fighterA.x;
    const dist = Math.abs(diff);

    if (dist < minDistance && dist > 0.001) {
      const overlap = minDistance - dist;
      const pushDir = diff > 0 ? 1 : -1;
      fighterA.x -= (overlap / 2) * pushDir;
      fighterB.x += (overlap / 2) * pushDir;
    }
  }
}
