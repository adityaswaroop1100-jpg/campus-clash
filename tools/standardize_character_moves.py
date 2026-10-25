#!/usr/bin/env python3
"""
Standardize all 10 character move configurations:
- Guarantees point-blank hit reliability:
  * light: x: 20, y: -95, w: 75, h: 42
  * heavy: x: 22, y: -115, w: 95, h: 75
  * ultimate: x: 15, y: -130, w: 180, h: 120
- Ensures explicit category: 'light', 'heavy', 'ultimate', 'special'.
- Ensures unique special move for each character.
"""

import os, re

SPECIAL_MOVES = {
    'topper': {
        'name': 'Equation Beam',
        'type': 'equation',
        'damage': 12,
        'hitstun': 16,
        'knockback': {'x': 7, 'y': -2},
        'hitbox': {'x': 20, 'y': -90, 'w': 110, 'h': 45},
        'particles': 'formula_burst',
        'color': '#00F0FF',
        'glowColor': '#00E5FF'
    },
    'backbencher': {
        'name': 'Paper Snipe',
        'type': 'paper_snipe',
        'damage': 12,
        'hitstun': 16,
        'knockback': {'x': 8, 'y': -2},
        'hitbox': {'x': 20, 'y': -90, 'w': 110, 'h': 45},
        'particles': 'paper_flutter',
        'color': '#FF6B35',
        'glowColor': '#00D4AA'
    },
    'hosteler': {
        'name': 'Chai Toss',
        'type': 'chai_toss',
        'damage': 14,
        'hitstun': 18,
        'knockback': {'x': 6, 'y': -3},
        'hitbox': {'x': 20, 'y': -95, 'w': 95, 'h': 50},
        'particles': 'chai_steam',
        'color': '#FF6A3D',
        'glowColor': '#FFD700'
    },
    'sportsStar': {
        'name': 'Spike Serve',
        'type': 'spike',
        'damage': 13,
        'hitstun': 15,
        'knockback': {'x': 9, 'y': -2},
        'hitbox': {'x': 20, 'y': -90, 'w': 115, 'h': 45},
        'particles': 'sports_sparks',
        'color': '#2E8BFF',
        'glowColor': '#FFD23F'
    },
    'bolt': {
        'name': 'Sonic Flash',
        'type': 'flash',
        'damage': 11,
        'hitstun': 14,
        'knockback': {'x': 8, 'y': 0},
        'hitbox': {'x': 20, 'y': -90, 'w': 120, 'h': 40},
        'particles': 'lightning_arcs',
        'color': '#29B6FF',
        'glowColor': '#FFD700'
    },
    'placementWarrior': {
        'name': 'Offer Volley',
        'type': 'offer_volley',
        'damage': 12,
        'hitstun': 16,
        'knockback': {'x': 8, 'y': -2},
        'hitbox': {'x': 20, 'y': -90, 'w': 110, 'h': 45},
        'particles': 'code_glyph',
        'color': '#4F6BFF',
        'glowColor': '#00E5FF'
    },
    'senior': {
        'name': 'Tea Breaker',
        'type': 'tea_breaker',
        'damage': 11,
        'hitstun': 15,
        'knockback': {'x': 7, 'y': -2},
        'hitbox': {'x': 20, 'y': -90, 'w': 100, 'h': 45},
        'particles': 'steam_rings',
        'color': '#2FBF71',
        'glowColor': '#FFD700'
    },
    'cypher': {
        'name': 'Firewall Glitch',
        'type': 'firewall',
        'damage': 12,
        'hitstun': 16,
        'knockback': {'x': 8, 'y': -2},
        'hitbox': {'x': 20, 'y': -90, 'w': 115, 'h': 45},
        'particles': 'binary_splash',
        'color': '#00FF41',
        'glowColor': '#00E5FF'
    },
    'gavel': {
        'name': 'Injunction Wave',
        'type': 'injunction',
        'damage': 14,
        'hitstun': 18,
        'knockback': {'x': 9, 'y': -3},
        'hitbox': {'x': 20, 'y': -95, 'w': 105, 'h': 50},
        'particles': 'gold_scales',
        'color': '#C8A84B',
        'glowColor': '#FFD700'
    },
    'palette': {
        'name': 'Splatter Burst',
        'type': 'splatter',
        'damage': 12,
        'hitstun': 16,
        'knockback': {'x': 8, 'y': -2},
        'hitbox': {'x': 20, 'y': -90, 'w': 110, 'h': 45},
        'particles': 'color_burst',
        'color': '#FF1493',
        'glowColor': '#00E5FF'
    }
}

def update_character(char_file):
    with open(char_file, 'r') as f:
        content = f.read()

    char_key = None
    for k in SPECIAL_MOVES.keys():
        if k in char_file:
            char_key = k
            break
    if not char_key:
        print(f"Skipping unknown character {char_file}")
        return

    # Replace hitbox in light: block
    def replace_move_hitbox(text, move_name, new_hitbox):
        pattern = rf'({move_name}:\s*\{{.*?(?:hitbox:\s*\{{))[^}}]+(\}})'
        return re.sub(pattern, rf'\g<1> {new_hitbox} \2', text, flags=re.DOTALL)

    content = replace_move_hitbox(content, 'light', 'x: 20, y: -95, w: 75, h: 42')
    content = replace_move_hitbox(content, 'heavy', 'x: 22, y: -115, w: 95, h: 75')
    content = replace_move_hitbox(content, 'ultimate', 'x: 15, y: -130, w: 180, h: 120')

    # Add special move if missing
    if 'special:' not in content:
        spec = SPECIAL_MOVES[char_key]
        special_code = f"""    special: {{
      category: 'special',
      name: '{spec["name"]}',
      type: '{spec["type"]}',
      trajectory: 'straight',
      hitStop: 6,
      whiffRecovery: 8,
      trailStyle: 'splatter',
      sparkType: 'blob',
      color: '{spec["color"]}',
      glowColor: '{spec["glowColor"]}',
      trailWidth: 6,
      trailLength: 22,
      glowRadius: 18,
      startup: 9,
      active: 5,
      recovery: 11,
      damage: {spec["damage"]},
      hitstun: {spec["hitstun"]},
      knockback: {{ x: {spec["knockback"]["x"]}, y: {spec["knockback"]["y"]} }},
      hitbox: {{ x: {spec["hitbox"]["x"]}, y: {spec["hitbox"]["y"]}, w: {spec["hitbox"]["w"]}, h: {spec["hitbox"]["h"]} }},
      particles: '{spec["particles"]}',
      blockable: true
    }},
"""
        content = content.replace("    ultimate: {", special_code + "    ultimate: {")

    with open(char_file, 'w') as f:
        f.write(content)
    print(f"✓ Standardized {char_file}")

def main():
    import glob
    for f in sorted(glob.glob('js/entities/characters/*.js')):
        update_character(f)

if __name__ == '__main__':
    main()
