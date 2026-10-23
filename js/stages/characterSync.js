/**
 * Campus Clash — Character-Sync Layer
 * Unifies ground contact, planar floor reflections, directional contact shadows,
 * dynamic venue rim lighting, and foreground occlusion handling.
 * @module stages/characterSync
 */

export class CharacterSyncLayer {
  /**
   * Renders directional contact shadows beneath each active fighter.
   * Matches venue key light angle and scales inversely with jump height.
   */
  static renderContactShadows(ctx, fighters, groundY, lightingPreset) {
    if (!fighters || !lightingPreset) return;
    const shadowAlpha = lightingPreset.shadowAlpha !== undefined ? lightingPreset.shadowAlpha : 0.6;
    const keyAngle = lightingPreset.keyLight?.angle !== undefined ? lightingPreset.keyLight.angle : 1.2;

    for (const fighter of fighters) {
      if (!fighter || fighter.health <= 0) continue;

      const distFromGround = Math.max(0, groundY - fighter.y);
      // As fighter jumps higher, shadow expands and fades
      const heightFactor = Math.max(0.1, 1 - distFromGround / 280);
      const radiusX = (38 + heightFactor * 16) * (fighter.facing || 1);
      const radiusY = 10 * heightFactor;

      // Slight directional shift based on key light angle
      const offsetX = Math.cos(keyAngle) * Math.min(24, distFromGround * 0.15);

      ctx.save();
      ctx.translate(fighter.x + offsetX, groundY);

      const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, Math.abs(radiusX));
      grad.addColorStop(0, `rgba(0, 0, 0, ${shadowAlpha * heightFactor})`);
      grad.addColorStop(0.5, `rgba(2, 6, 16, ${shadowAlpha * heightFactor * 0.5})`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, Math.abs(radiusX), radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  /**
   * Renders planar floor reflections for fighters on glossy or wet surfaces.
   * Inverts fighter vertically, applies vertical gradient fade, and masks with floor reflectivity.
   */
  static renderFloorReflections(ctx, fighters, groundY, lightingPreset, qualityTier = 'high') {
    if (!fighters || !lightingPreset || qualityTier === 'low') return;
    const reflectivity = lightingPreset.floorReflectivity || 0.35;
    if (reflectivity <= 0.02) return;

    ctx.save();
    for (const fighter of fighters) {
      if (!fighter || fighter.health <= 0) continue;

      const distFromGround = Math.max(0, groundY - fighter.y);
      // If fighter is too high, reflection fades away
      if (distFromGround > 220) continue;
      const heightAlpha = Math.max(0, 1 - distFromGround / 220);
      const finalAlpha = reflectivity * heightAlpha;

      ctx.save();
      // Mirror vertically across ground line
      ctx.translate(fighter.x, groundY);
      ctx.scale(fighter.facing || 1, -0.62); // Compressed vertical reflection
      ctx.globalAlpha = finalAlpha;
      if (qualityTier === 'high') {
        ctx.filter = 'blur(1.5px)';
      }

      // Draw reflection using fighter's real sprite or silhouette
      let spriteDrawn = false;
      if (window.CampusVisuals && window.CampusVisuals.store) {
        let charId = fighter.charId || (fighter.config && fighter.config.id);
        if (charId === 'placementWarrior') charId = 'placement';
        if (charId === 'sportsStar') charId = 'sports';
        const entry = window.CampusVisuals.store[charId];
        if (entry && entry.ready) {
          const state = window.CampusVisuals.mapState ? window.CampusVisuals.mapState(fighter.state) : 'idle';
          const set = entry.states[state] || entry.states.idle;
          if (set && set.img) {
            const H = fighter.height || 180;
            const w = H * (set.fw || set.img.width) / (set.fh || set.img.height);
            ctx.drawImage(set.img, 0, 0, set.fw || set.img.width, set.fh || set.img.height, -w / 2, -H, w, H);
            spriteDrawn = true;
          }
        }
      }

      if (!spriteDrawn) {
        if (fighter.renderBodySilhouette) {
          ctx.fillStyle = lightingPreset.rimLight?.color || '#00e5ff';
          fighter.renderBodySilhouette(ctx);
        } else if (fighter.drawSprite) {
          fighter.drawSprite(ctx);
        }
      }

      ctx.restore();

      // Soft ground water puddle sheen overlay (cached to eliminate per-frame gradient allocation)
      ctx.save();
      ctx.translate(fighter.x, groundY);
      if (!CharacterSyncLayer._puddleGrad) {
        CharacterSyncLayer._puddleGrad = ctx.createLinearGradient(0, 0, 0, 80);
        CharacterSyncLayer._puddleGrad.addColorStop(0, 'rgba(255, 255, 255, 0.12)');
        CharacterSyncLayer._puddleGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      }
      ctx.globalAlpha = finalAlpha;
      ctx.fillStyle = CharacterSyncLayer._puddleGrad;
      ctx.fillRect(-60, 0, 120, 70);
      ctx.restore();
    }
    ctx.restore();
  }

  /**
   * Evaluates foreground element occlusion and fades elements that intersect fighter bounds.
   * Ensures foreground framing never blocks player visibility.
   */
  static getOcclusionAlpha(elementX, elementWidth, fighters, defaultAlpha = 1.0) {
    if (!fighters || fighters.length === 0) return defaultAlpha;

    const elLeft = elementX - elementWidth / 2;
    const elRight = elementX + elementWidth / 2;

    for (const fighter of fighters) {
      if (!fighter) continue;
      const fLeft = fighter.x - 45;
      const fRight = fighter.x + 45;

      // Check horizontal overlap
      if (elRight >= fLeft && elLeft <= fRight) {
        return 0.18; // Fade out to transparent silhouette
      }
    }

    return defaultAlpha;
  }
}
