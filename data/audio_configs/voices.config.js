/**
 * Campus Clash — Voice & Announcer ("The Proctor") Configuration
 * 100% Original voice design — NO franchise sound-alikes (Street Fighter, Tekken, etc.)
 * @module data/audio_configs/voices.config
 */

export const VOICES_CONFIG = {
  announcer: {
    name: 'The Proctor',
    style: 'Authoritative, sharp esports academic adjudicator',
    chimeFreq: 520, // Clean dual-tone harmonic chime preceding voice
    lines: {
      round1:      ['ROUND ONE... COMMENCE!', 'FIRST SEMESTER... BEGIN!', 'ROUND ONE... ENGAGE!'],
      round2:      ['ROUND TWO... RESUME!', 'SECOND SEMESTER... ADVANCE!'],
      roundFinal:  ['FINAL SEMESTER... DECISIVE ROUND!', 'FINAL ROUND... NO MERCY!'],
      fight:       ['BRAWL!', 'ENGAGE!', 'FIGHT!'],
      ko:          ['SHUTDOWN! K.O.!', 'SEMESTER TERMINATED! K.O.!', 'KNOCKOUT!'],
      perfect:     ['FLAWLESS SEMESTER! 10 CGPA!', 'PERFECT VICTORY! ZERO DEFECTS!'],
      timeUp:      ['TIME CONCLUDED! EVALUATING MARKS!', 'TIME UP!'],
      p1Wins:      ['PLAYER ONE CLAIMS TOP HONORS!', 'PLAYER ONE VICTORIOUS!'],
      p2Wins:      ['PLAYER TWO CLAIMS TOP HONORS!', 'PLAYER TWO VICTORIOUS!']
    }
  },

  // Per-Archetype Character Voice Grunt Tuning (pitch, duration, resonant frequencies)
  archetypes: {
    topper: {
      pitch: 1.15,
      attackFreq: 440,
      hitFreq: 280,
      quote: 'Syllabus fears me.'
    },
    backbencher: {
      pitch: 0.90,
      attackFreq: 220,
      hitFreq: 140,
      quote: 'Attendance is a suggestion.'
    },
    hosteler: {
      pitch: 0.85,
      attackFreq: 180,
      hitFreq: 120,
      quote: 'Mess food built this.'
    },
    senior: {
      pitch: 1.00,
      attackFreq: 330,
      hitFreq: 210,
      quote: 'I have seen this exam before.'
    },
    placementWarrior: {
      pitch: 1.05,
      attackFreq: 380,
      hitFreq: 240,
      quote: 'Tell me about yourself.'
    },
    sportsStar: {
      pitch: 1.10,
      attackFreq: 400,
      hitFreq: 260,
      quote: 'Game on.'
    },
    cypher: {
      pitch: 1.25,
      attackFreq: 560,
      hitFreq: 350,
      quote: 'Root access granted.'
    },
    gavel: {
      pitch: 0.92,
      attackFreq: 200,
      hitFreq: 150,
      quote: 'Objection — sustained.'
    },
    bolt: {
      pitch: 1.20,
      attackFreq: 510,
      hitFreq: 320,
      quote: 'Catch me if you can.'
    },
    palette: {
      pitch: 1.18,
      attackFreq: 480,
      hitFreq: 300,
      quote: 'Every stroke is a strike.'
    }
  }
};
