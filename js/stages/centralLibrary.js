/**
 * Campus Clash — Stage: Architecture Block (Formerly Central Library)
 * Re-exported for backwards compatibility.
 * @module stages/centralLibrary
 */

import { ArchitectureBlockStage } from './architectureBlock.js';

export class CentralLibraryStage extends ArchitectureBlockStage {
  constructor() {
    super();
    this.id = 'architectureblock';
  }
}

export { ArchitectureBlockStage };
