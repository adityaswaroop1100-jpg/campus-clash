/**
 * Campus Clash — Stage: Vendhar Square (Formerly Java Green Food Court)
 * Re-exported for backwards compatibility.
 * @module stages/canteen
 */

import { VendharSquareStage } from './vendarSquare.js';

export class CanteenStage extends VendharSquareStage {
  constructor() {
    super();
    // Allow matching both IDs
    this.id = 'vendharsquare';
  }
}

export { VendharSquareStage };
