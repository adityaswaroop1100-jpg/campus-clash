/**
 * Campus Clash — Voice Priority & Polyphony Limiter
 * Ensures strict voice budgets per bus to prevent browser thread stuttering.
 * @module engine/audio/voiceLimiter
 */

export class VoiceLimiter {
  constructor(busLimits = {}) {
    this.busLimits = busLimits;
    this.activeVoices = new Map(); // busId -> [{ id, sourceNode, priority, timestamp }]
  }

  /**
   * Attempts to allocate a voice on the specified bus.
   * If polyphony is exceeded, steals the lowest-priority, oldest voice.
   * @param {string} busId 
   * @param {number} priority 1-10
   * @param {AudioNode} sourceNode 
   * @returns {boolean} true if allocated, false if dropped
   */
  allocateVoice(busId, priority = 5, sourceNode = null) {
    const limit = this.busLimits[busId] || 8;
    if (!this.activeVoices.has(busId)) {
      this.activeVoices.set(busId, []);
    }

    const voices = this.activeVoices.get(busId);

    // If within limit, append directly
    if (voices.length < limit) {
      const voiceEntry = {
        id: Math.random().toString(36).slice(2, 9),
        sourceNode,
        priority,
        timestamp: performance.now()
      };
      voices.push(voiceEntry);
      return voiceEntry;
    }

    // Polyphony reached: check if we can steal an existing voice with lower priority
    let lowestPriorityIndex = -1;
    let lowestPriority = priority; // Only steal if strictly lower than current

    for (let i = 0; i < voices.length; i++) {
      if (voices[i].priority < lowestPriority) {
        lowestPriority = voices[i].priority;
        lowestPriorityIndex = i;
      }
    }

    if (lowestPriorityIndex !== -1) {
      // Steal this voice
      const stolen = voices.splice(lowestPriorityIndex, 1)[0];
      if (stolen.sourceNode) {
        try {
          stolen.sourceNode.stop();
        } catch (e) {}
      }

      const voiceEntry = {
        id: Math.random().toString(36).slice(2, 9),
        sourceNode,
        priority,
        timestamp: performance.now()
      };
      voices.push(voiceEntry);
      return voiceEntry;
    }

    // Could not allocate (all active voices have equal or higher priority)
    return null;
  }

  /**
   * Releases a voice when playback completes
   */
  releaseVoice(busId, voiceEntry) {
    if (!voiceEntry || !this.activeVoices.has(busId)) return;
    const voices = this.activeVoices.get(busId);
    const index = voices.findIndex(v => v.id === voiceEntry.id);
    if (index !== -1) {
      voices.splice(index, 1);
    }
  }

  clear() {
    this.activeVoices.clear();
  }
}
