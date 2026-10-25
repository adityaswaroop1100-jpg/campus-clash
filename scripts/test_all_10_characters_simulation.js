/**
 * Comprehensive Simulation Test Suite for all 10 Campus Clash Characters
 */

import { TOPPER_CONFIG } from '../js/entities/characters/topper.js';
import { BACKBENCHER_CONFIG } from '../js/entities/characters/backbencher.js';
import { HOSTELER_CONFIG } from '../js/entities/characters/hosteler.js';
import { SENIOR_CONFIG } from '../js/entities/characters/senior.js';
import { PLACEMENT_WARRIOR_CONFIG } from '../js/entities/characters/placementWarrior.js';
import { SPORTS_STAR_CONFIG } from '../js/entities/characters/sportsStar.js';
import { CYPHER_CONFIG } from '../js/entities/characters/cypher.js';
import { GAVEL_CONFIG } from '../js/entities/characters/gavel.js';
import { BOLT_CONFIG } from '../js/entities/characters/bolt.js';
import { PALETTE_CONFIG } from '../js/entities/characters/palette.js';
import { Fighter } from '../js/entities/fighter.js';
import { FIGHTER_STATES } from '../js/utils/constants.js';

const ROSTER = [
  { name: 'Topper', config: TOPPER_CONFIG },
  { name: 'Backbencher', config: BACKBENCHER_CONFIG },
  { name: 'Hosteler', config: HOSTELER_CONFIG },
  { name: 'Senior', config: SENIOR_CONFIG },
  { name: 'Placement Warrior', config: PLACEMENT_WARRIOR_CONFIG },
  { name: 'Sports Star', config: SPORTS_STAR_CONFIG },
  { name: 'Cypher', config: CYPHER_CONFIG },
  { name: 'Gavel', config: GAVEL_CONFIG },
  { name: 'Bolt', config: BOLT_CONFIG },
  { name: 'Palette', config: PALETTE_CONFIG }
];

console.log('====================================================');
console.log(' Campus Clash — 10-Character Complete Combat Simulation');
console.log('====================================================');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
  } else {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  }
}

for (const entry of ROSTER) {
  const { name, config } = entry;
  console.log(`\nTesting Fighter: ${name} (${config.id})...`);

  // 1. Instantiation
  const fighter = new Fighter(config, 200, 535, 1, 'P1');
  assert(fighter.x === 200 && fighter.y === 535, `${name}: Spawn coordinates calibrated`);
  assert(fighter.height === 175, `${name}: Height standardized to 175px`);
  assert(fighter.stateMachine.getState() === FIGHTER_STATES.IDLE, `${name}: Initial state is IDLE`);

  // 2. Standing Hurtbox
  assert(fighter.hurtbox.h === 165, `${name}: Standing hurtbox height is 165px`);

  // 3. Crouch Hurtbox Reduction
  fighter.stateMachine.changeState(FIGHTER_STATES.CROUCHING);
  fighter.update(1 / 60);
  assert(fighter.hurtbox.h === 115, `${name}: Ducking hurtbox height drops to 115px (duck under jabs)`);

  // 4. Block & Hex Shield
  fighter.stateMachine.changeState(FIGHTER_STATES.BLOCKING);
  fighter.update(1 / 60);
  assert(fighter.isBlocking === true, `${name}: isBlocking is true when in BLOCKING state`);
  assert(fighter.hurtbox.h === 115, `${name}: Blocking hurtbox height is 115px`);

  // 5. Jump
  fighter.vy = -12;
  fighter.isGrounded = false;
  fighter.stateMachine.changeState(FIGHTER_STATES.JUMPING);
  fighter.update(1 / 60);
  assert(fighter.y < 535, `${name}: Airborne physics operational`);
  fighter.y = 535;
  fighter.vy = 0;
  fighter.isGrounded = true;
  fighter.stateMachine.changeState(FIGHTER_STATES.IDLE);

  // 6. Test Move Sets: Light, Heavy, Special, Ultimate
  const moves = ['light', 'heavy', 'special', 'ultimate'];
  for (const moveName of moves) {
    assert(config.moves[moveName] !== undefined, `${name}: Has move definition for '${moveName}'`);
    const moveData = config.moves[moveName];
    assert(moveData.hitbox !== undefined, `${name}: Move '${moveName}' has defined hitbox`);
    assert(moveData.hitbox.w > 0 && moveData.hitbox.h > 0, `${name}: Move '${moveName}' has positive hitbox dimensions`);
    assert(moveData.damage > 0, `${name}: Move '${moveName}' deals damage (${moveData.damage})`);

    // Execute move
    fighter.stateMachine.changeState(FIGHTER_STATES.IDLE);
    fighter.startAttack(moveData);
    assert(fighter.stateMachine.getState() === FIGHTER_STATES.ATTACKING, `${name}: Successfully initiated '${moveName}' attack`);
    assert(fighter.isBlocking === false, `${name}: Initiating '${moveName}' clears block state`);

    // Advance frames to active window
    const activeStartFrame = moveData.startup;
    for (let frame = 0; frame <= activeStartFrame + 1; frame++) {
      fighter.update(1 / 60);
    }
    
    // In active window, hitbox must be active
    const hitboxes = fighter.activeHitboxes;
    assert(hitboxes && hitboxes.length > 0, `${name}: '${moveName}' generates active hitbox during active frames`);
    if (hitboxes && hitboxes.length > 0) {
      assert(hitboxes[0].w >= 50, `${name}: '${moveName}' hitbox width is solid (${hitboxes[0].w}px)`);
    }
  }

  // 7. Damage, Hitstun & KO
  fighter.stateMachine.changeState(FIGHTER_STATES.IDLE);
  const hpBefore = fighter.health;
  fighter.takeDamage(20, 16, { x: 3, y: -2 }, false);
  assert(fighter.health === hpBefore - 20, `${name}: Takes unblocked damage properly`);
  assert(fighter.hitstunTimer > 0, `${name}: Enters hitstun upon taking damage`);
  assert(fighter.isBlocking === false, `${name}: Cannot block while in hitstun`);

  console.log(`✓ ${name} fully verified!`);
}

console.log('\n====================================================');
console.log(`Simulation Complete: ${passedTests}/${totalTests} tests passed!`);
console.log('====================================================');
