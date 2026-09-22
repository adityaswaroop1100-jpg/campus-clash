/**
 * Campus Clash 2D — Supabase Database Client
 * Handles real-time leaderboards, score submissions, and match analytics
 * @module database/supabaseClient
 */

import { getSupabaseCredentials, saveSupabaseCredentials } from './supabaseConfig.js';

class SupabaseService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.lastError = null;
    this.init();
  }

  init() {
    const creds = getSupabaseCredentials();
    if (creds.url && creds.anonKey) {
      try {
        if (typeof window !== 'undefined' && typeof window.supabase !== 'undefined' && typeof window.supabase.createClient === 'function') {
          this.client = window.supabase.createClient(creds.url, creds.anonKey);
          this.isConnected = true;
          console.log('[Supabase] Initialized with credentials for:', creds.url);
        } else {
          console.warn('[Supabase] CDN library not loaded yet; will retry on demand.');
        }
      } catch (err) {
        console.error('[Supabase Init Error]', err);
        this.isConnected = false;
        this.lastError = err.message;
      }
    }
  }

  ensureClient() {
    if (!this.client) {
      this.init();
    }
    return this.client;
  }

  /**
   * Connect or reconfigure credentials at runtime
   */
  async configure(url, anonKey) {
    saveSupabaseCredentials(url, anonKey);
    this.init();
    return await this.testConnection();
  }

  /**
   * Test database connectivity
   */
  async testConnection() {
    const client = this.ensureClient();
    if (!client) {
      return { success: false, message: 'Please provide Supabase Project URL and Anon Key' };
    }

    try {
      const { data, error } = await client
        .from('campus_clash_leaderboard')
        .select('id')
        .limit(1);

      if (error) {
        this.isConnected = false;
        this.lastError = error.message;
        return { success: false, message: error.message };
      }

      this.isConnected = true;
      this.lastError = null;
      return { success: true, message: 'Connected successfully to Supabase!' };
    } catch (err) {
      this.isConnected = false;
      this.lastError = err.message;
      return { success: false, message: err.message };
    }
  }

  /**
   * Fetch top leaderboard scores
   */
  async getLeaderboard(limit = 10) {
    const client = this.ensureClient();

    if (client && this.isConnected) {
      try {
        const { data, error } = await client
          .from('campus_clash_leaderboard')
          .select('*')
          .order('score', { ascending: false })
          .limit(limit);

        if (!error && data && data.length > 0) {
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('campus_clash_cached_leaderboard', JSON.stringify(data));
          }
          return { source: 'supabase', data };
        }
      } catch (err) {
        console.warn('[Supabase getLeaderboard Error]', err);
      }
    }

    // Fallback: cached or default SRM Champions roster
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem('campus_clash_cached_leaderboard');
      if (cached) {
        try {
          return { source: 'cache', data: JSON.parse(cached) };
        } catch (e) {}
      }
    }

    // Default Seed Top 5
    return {
      source: 'local',
      data: [
        { player_name: 'Aarav Pro (AI)', fighter_id: 'topper', fighter_name: 'Aarav (Topper)', score: 4520, max_combo: 14, damage_dealt: 480, created_at: new Date().toISOString() },
        { player_name: 'Kabir Chaos', fighter_id: 'backbencher', fighter_name: 'Kabir (Backbencher)', score: 3980, max_combo: 11, damage_dealt: 420, created_at: new Date().toISOString() },
        { player_name: 'Priya Dev', fighter_id: 'placementWarrior', fighter_name: 'Priya (Placement)', score: 3750, max_combo: 12, damage_dealt: 410, created_at: new Date().toISOString() },
        { player_name: 'Cypher Root', fighter_id: 'cypher', fighter_name: 'Cypher (Hacker)', score: 3400, max_combo: 9, damage_dealt: 390, created_at: new Date().toISOString() },
        { player_name: 'Arjun Striker', fighter_id: 'sportsStar', fighter_name: 'Arjun (Sports)', score: 3100, max_combo: 8, damage_dealt: 350, created_at: new Date().toISOString() }
      ]
    };
  }

  /**
   * Submit match score to Supabase
   */
  async submitScore(entry) {
    const payload = {
      player_name: entry.playerName || 'SRM Brawler',
      fighter_id: entry.fighterId || 'topper',
      fighter_name: entry.fighterName || 'Topper',
      score: entry.score || 0,
      damage_dealt: entry.damageDealt || 0,
      max_combo: entry.maxCombo || 0,
      rounds_won: entry.roundsWon || 0,
      arena_id: entry.arenaId || 'techpark'
    };

    const client = this.ensureClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('campus_clash_leaderboard')
          .insert([payload]);

        if (!error) {
          console.log('[Supabase] Score submitted successfully:', payload);
          return { success: true };
        } else {
          console.warn('[Supabase Submit Error]', error);
        }
      } catch (err) {
        console.warn('[Supabase Submit Exception]', err);
      }
    }

    // Save locally as fallback
    if (typeof localStorage !== 'undefined') {
      const local = JSON.parse(localStorage.getItem('campus_clash_local_scores') || '[]');
      local.push({ ...payload, created_at: new Date().toISOString() });
      localStorage.setItem('campus_clash_local_scores', JSON.stringify(local));
    }

    return { success: true, localOnly: true };
  }

  /**
   * Log match telemetry
   */
  async logMatch(matchStats) {
    const client = this.ensureClient();
    if (!client) return;

    try {
      await client.from('campus_clash_matches').insert([{
        mode: matchStats.mode || 'pvp',
        winner: matchStats.winner || 'P1',
        loser: matchStats.loser || 'P2',
        p1_fighter: matchStats.p1Fighter || 'topper',
        p2_fighter: matchStats.p2Fighter || 'backbencher',
        p1_damage: matchStats.p1Damage || 0,
        p2_damage: matchStats.p2Damage || 0,
        max_combo: matchStats.maxCombo || 0,
        arena_id: matchStats.arenaId || 'techpark',
      }]);
    } catch (err) {
      console.warn('[Supabase logMatch Error]', err.message);
    }
  }

  /**
   * Register or update participant in Supabase
   */
  async registerParticipant(participant) {
    const payload = {
      name: participant.name ? participant.name.trim() : 'Participant',
      registration_number: participant.regNo ? participant.regNo.trim().toUpperCase() : '',
      srm_mail_id: participant.srmMail ? participant.srmMail.trim().toLowerCase() : '',
      participation_id: participant.partId ? participant.partId.trim().toUpperCase() : '',
      phone_number: participant.phone ? participant.phone.trim() : '',
      last_active_at: new Date().toISOString()
    };

    // Save to localStorage immediately so user info persists on device
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('campus_clash_current_participant', JSON.stringify(payload));
    }

    const client = this.ensureClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('campus_clash_participants')
          .insert([payload]);

        if (!error) {
          console.log('[Supabase] Participant registered successfully:', payload.registration_number);
          return { success: true, data };
        } else {
          console.warn('[Supabase Participant Error]', error.message);
          return { success: true, localOnly: true, error: error.message };
        }
      } catch (err) {
        console.warn('[Supabase Participant Exception]', err.message);
        return { success: true, localOnly: true, error: err.message };
      }
    }

    return { success: true, localOnly: true };
  }

  /**
   * Get cached participant
   */
  getCurrentParticipant() {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('campus_clash_current_participant');
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (e) {}
      }
    }
    return null;
  }
}

export const supabaseService = new SupabaseService();
