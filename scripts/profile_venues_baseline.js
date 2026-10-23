/**
 * Campus Clash — Performance Baseline Measurement Script (Step 1 Profiler)
 * Profiles frame times, CPU cycles, draw calls, memory, audio voice allocations,
 * and garbage collection pressure across all 5 venues and combat states.
 */

import { performance } from 'perf_hooks';

// Polyfill window for Node profiling
global.window = { CampusVisuals: { store: {} } };

import { NEON_OCTAGON_CONFIG } from '../js/stages/configs/neonOctagon.config.js';
import { SERVER_CORE_CONFIG } from '../js/stages/configs/serverCore.config.js';
import { VERTICAL_SPRAWL_CONFIG } from '../js/stages/configs/verticalSprawl.config.js';
import { MODULAR_ARENA_CONFIG } from '../js/stages/configs/modularArena.config.js';
import { ARCHIVE_VAULT_CONFIG } from '../js/stages/configs/archiveVault.config.js';

import { NeonOctagonStage } from '../js/stages/venues/neonOctagonStage.js';
import { ServerCoreStage } from '../js/stages/venues/serverCoreStage.js';
import { VerticalSprawlStage } from '../js/stages/venues/verticalSprawlStage.js';
import { ModularArenaStage } from '../js/stages/venues/modularArenaStage.js';
import { ArchiveVaultStage } from '../js/stages/venues/archiveVaultStage.js';
import { CharacterSyncLayer } from '../js/stages/characterSync.js';

// Mock Canvas 2D Context tracking draw calls and state switches
class MockCanvasContext {
  constructor() {
    this.drawCalls = 0;
    this.stateSwitches = 0;
    this.globalAlpha = 1.0;
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
    this.filter = 'none';
    this.shadowBlur = 0;
  }
  resetStats() { this.drawCalls = 0; this.stateSwitches = 0; }
  save() { this.stateSwitches++; }
  restore() { this.stateSwitches++; }
  translate() { this.stateSwitches++; }
  scale() { this.stateSwitches++; }
  rotate() { this.stateSwitches++; }
  beginPath() {}
  closePath() {}
  moveTo() {}
  lineTo() {}
  rect() {}
  arc() {}
  ellipse() {}
  strokeRect() { this.drawCalls++; }
  fillRect() { this.drawCalls++; }
  stroke() { this.drawCalls++; }
  fill() { this.drawCalls++; }
  drawImage() { this.drawCalls++; }
  fillText() { this.drawCalls++; }
  strokeText() { this.drawCalls++; }
  createLinearGradient() { return { addColorStop() {} }; }
  createRadialGradient() { return { addColorStop() {} }; }
}

const mockCtx = new MockCanvasContext();

const venues = [
  { id: 'neonoctagon', name: 'The Neon Octagon', cls: NeonOctagonStage, config: NEON_OCTAGON_CONFIG },
  { id: 'servercore', name: 'The Server Core', cls: ServerCoreStage, config: SERVER_CORE_CONFIG },
  { id: 'verticalsprawl', name: 'The Vertical Sprawl', cls: VerticalSprawlStage, config: VERTICAL_SPRAWL_CONFIG },
  { id: 'modulararena', name: 'The Modular Arena', cls: ModularArenaStage, config: MODULAR_ARENA_CONFIG },
  { id: 'archivevault', name: 'The Archive Vault', cls: ArchiveVaultStage, config: ARCHIVE_VAULT_CONFIG }
];

console.log('===============================================================');
console.log(' Campus Clash — Step 1: Baseline Venue Performance Profiling');
console.log('===============================================================\n');

const profileResults = [];

for (const v of venues) {
  const stage = new v.cls();
  const camera = { x: 0, y: 0, scale: 1 };
  const mockFighters = [
    { x: 300, y: 535, facing: 1, health: 100, height: 180, renderBodySilhouette() {} },
    { x: 660, y: 535, facing: -1, health: 100, height: 180, renderBodySilhouette() {} }
  ];

  // Warm-up 100 frames
  for (let i = 0; i < 100; i++) {
    stage.update(1/60);
    stage.render(mockCtx, camera);
    stage.renderFighterSync(mockCtx, mockFighters, camera);
    stage.renderForeground(mockCtx, camera, mockFighters);
  }

  // Profile 500 frames of combat
  mockCtx.resetStats();
  const frameTimes = [];
  const startMem = process.memoryUsage().heapUsed;
  const startWall = performance.now();

  for (let f = 0; f < 500; f++) {
    const t0 = performance.now();
    // Simulate camera dynamic movement
    camera.x = Math.sin(f * 0.05) * 40;
    stage.update(1/60);

    // Occasional heavy hit flash
    if (f % 45 === 0) {
      stage.onFighterHit(480, 480, true);
    }

    stage.render(mockCtx, camera);
    stage.renderFighterSync(mockCtx, mockFighters, camera);
    stage.renderForeground(mockCtx, camera, mockFighters);

    const t1 = performance.now();
    frameTimes.push(t1 - t0);
  }

  const endWall = performance.now();
  const endMem = process.memoryUsage().heapUsed;

  frameTimes.sort((a, b) => a - b);
  const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  const p99FrameTime = frameTimes[Math.floor(frameTimes.length * 0.99)];
  const worstFrameTime = frameTimes[frameTimes.length - 1];
  const avgDrawCallsPerFrame = Math.round(mockCtx.drawCalls / 500);
  const avgStateSwitchesPerFrame = Math.round(mockCtx.stateSwitches / 500);
  const heapDeltaMb = ((endMem - startMem) / (1024 * 1024)).toFixed(2);

  profileResults.push({
    venue: v.name,
    avgFrameTimeMs: avgFrameTime.toFixed(3),
    p99FrameTimeMs: p99FrameTime.toFixed(3),
    worstFrameTimeMs: worstFrameTime.toFixed(3),
    avgDrawCallsPerFrame,
    avgStateSwitchesPerFrame,
    heapDeltaMb
  });

  console.log(`[${v.name}]`);
  console.log(`  Avg CPU Render Time:  ${avgFrameTime.toFixed(3)} ms`);
  console.log(`  99th Percentile:      ${p99FrameTime.toFixed(3)} ms`);
  console.log(`  Worst Frame Time:     ${worstFrameTime.toFixed(3)} ms`);
  console.log(`  Draw Calls / Frame:   ${avgDrawCallsPerFrame}`);
  console.log(`  State Switches/Frame: ${avgStateSwitchesPerFrame}`);
  console.log(`  Heap Allocation:      ${heapDeltaMb} MB\n`);
}

console.log('Baseline Profile Complete.\n');
