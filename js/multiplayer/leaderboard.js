/**
 * Campus Clash 2D — Leaderboard UI & Controller
 * Integrates Supabase real-time high score rankings and configuration modal
 * @module js/multiplayer/leaderboard
 */

import { supabaseService } from '../database/supabaseClient.js';
import { getSupabaseCredentials, saveSupabaseCredentials } from '../database/supabaseConfig.js';

export class LeaderboardManager {
  constructor(game) {
    this.game = game;
    this.modalEl = document.getElementById('leaderboard-modal');
    this.tableBodyEl = document.getElementById('leaderboard-table-body');
    this.statusPillEl = document.getElementById('db-status-pill');
    this.statusTextEl = document.getElementById('db-status-text');
    this.tabScoresBtn = document.getElementById('tab-scores-btn');
    this.tabConfigBtn = document.getElementById('tab-config-btn');
    this.scoresView = document.getElementById('leaderboard-scores-view');
    this.configView = document.getElementById('leaderboard-config-view');
    this.closeBtn = document.getElementById('leaderboard-close-btn');

    // Config form inputs
    this.urlInput = document.getElementById('supabase-url-input');
    this.keyInput = document.getElementById('supabase-key-input');
    this.saveConfigBtn = document.getElementById('supabase-save-btn');
    this.testConfigBtn = document.getElementById('supabase-test-btn');
    this.configResultEl = document.getElementById('supabase-config-result');

    this.isOpen = false;
    this.initEventListeners();
    this.updateStatusBadge();
  }

  initEventListeners() {
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => this.close());
    }

    if (this.tabScoresBtn && this.tabConfigBtn) {
      this.tabScoresBtn.addEventListener('click', () => this.switchTab('scores'));
      this.tabConfigBtn.addEventListener('click', () => this.switchTab('config'));
    }

    if (this.saveConfigBtn) {
      this.saveConfigBtn.addEventListener('click', () => this.saveConfig());
    }

    if (this.testConfigBtn) {
      this.testConfigBtn.addEventListener('click', () => this.testConfig());
    }

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  switchTab(tab) {
    if (tab === 'scores') {
      this.tabScoresBtn.classList.add('active');
      this.tabConfigBtn.classList.remove('active');
      this.scoresView.style.display = 'block';
      this.configView.style.display = 'none';
      this.refreshScores();
    } else {
      this.tabScoresBtn.classList.remove('active');
      this.tabConfigBtn.classList.add('active');
      this.scoresView.style.display = 'none';
      this.configView.style.display = 'flex';

      const creds = getSupabaseCredentials();
      if (this.urlInput) this.urlInput.value = creds.url || '';
      if (this.keyInput) this.keyInput.value = creds.anonKey || '';
    }
  }

  async updateStatusBadge() {
    if (!this.statusPillEl || !this.statusTextEl) return;

    const creds = getSupabaseCredentials();
    if (!creds.url || !creds.anonKey) {
      this.statusPillEl.className = 'db-status-pill';
      this.statusTextEl.textContent = 'LOCAL CACHE MODE';
      return;
    }

    const test = await supabaseService.testConnection();
    if (test.success) {
      this.statusPillEl.className = 'db-status-pill connected';
      this.statusTextEl.textContent = '🟢 SUPABASE CONNECTED';
    } else {
      this.statusPillEl.className = 'db-status-pill';
      this.statusTextEl.textContent = '🟡 OFFLINE / STANDBY';
    }
  }

  async open() {
    if (!this.modalEl) return;
    this.isOpen = true;
    this.modalEl.classList.remove('hidden');
    this.switchTab('scores');
    await this.updateStatusBadge();
    await this.refreshScores();
  }

  close() {
    if (!this.modalEl) return;
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
  }

  async refreshScores() {
    if (!this.tableBodyEl) return;
    this.tableBodyEl.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px; color: #00e5ff;">Loading SRM Champions...</td></tr>';

    const result = await supabaseService.getLeaderboard(10);
    const data = result.data || [];

    if (data.length === 0) {
      this.tableBodyEl.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 24px;">No scores logged yet. Be the first to enter the fray!</td></tr>';
      return;
    }

    const fighterEmojis = {
      topper: '🎓',
      backbencher: '🔥',
      hosteler: '🍲',
      senior: '☕',
      placementWarrior: '💼',
      sportsStar: '⚡',
      cypher: '💻',
      gavel: '⚖️',
      bolt: '⚡',
      palette: '🎨'
    };

    let html = '';
    data.forEach((entry, index) => {
      const rank = index + 1;
      let rankDisplay = `#${rank}`;
      let rankClass = '';
      if (rank === 1) { rankDisplay = '👑 1ST'; rankClass = 'rank-1'; }
      else if (rank === 2) { rankDisplay = '🥈 2ND'; rankClass = 'rank-2'; }
      else if (rank === 3) { rankDisplay = '🥉 3RD'; rankClass = 'rank-3'; }

      const emoji = fighterEmojis[entry.fighter_id] || '🥊';
      const formattedDate = entry.created_at ? new Date(entry.created_at).toLocaleDateString() : 'Recent';

      html += `
        <tr>
          <td><span class="rank-badge ${rankClass}">${rankDisplay}</span></td>
          <td style="font-weight: 700; color: #ffffff;">${entry.player_name || 'Brawler'}</td>
          <td><span class="fighter-tag">${emoji} ${entry.fighter_name || entry.fighter_id || 'Fighter'}</span></td>
          <td><span class="score-num">${entry.score || 0}</span></td>
          <td style="color: #94a3b8; font-family: monospace;">${entry.max_combo ? entry.max_combo + 'x' : '-'} • ${formattedDate}</td>
        </tr>
      `;
    });

    this.tableBodyEl.innerHTML = html;
  }

  async saveConfig() {
    const url = this.urlInput ? this.urlInput.value.trim() : '';
    const key = this.keyInput ? this.keyInput.value.trim() : '';

    if (!url || !key) {
      if (this.configResultEl) {
        this.configResultEl.innerHTML = '<span style="color: #ff5252;">⚠️ Please fill in both URL and Anon Key.</span>';
      }
      return;
    }

    saveSupabaseCredentials(url, key);
    if (this.configResultEl) {
      this.configResultEl.innerHTML = '<span style="color: #00e5ff;">Testing connection to Supabase...</span>';
    }

    const test = await supabaseService.configure(url, key);
    await this.updateStatusBadge();

    if (test.success) {
      if (this.configResultEl) {
        this.configResultEl.innerHTML = '<span style="color: #00ff41;">✅ Successfully connected to Supabase database!</span>';
      }
    } else {
      if (this.configResultEl) {
        this.configResultEl.innerHTML = `<span style="color: #ff5252;">❌ Error: ${test.message}</span>`;
      }
    }
  }

  async testConfig() {
    if (this.configResultEl) {
      this.configResultEl.innerHTML = '<span style="color: #00e5ff;">Checking Supabase connectivity...</span>';
    }
    const test = await supabaseService.testConnection();
    await this.updateStatusBadge();

    if (test.success) {
      if (this.configResultEl) {
        this.configResultEl.innerHTML = '<span style="color: #00ff41;">✅ Supabase is online and responding!</span>';
      }
    } else {
      if (this.configResultEl) {
        this.configResultEl.innerHTML = `<span style="color: #ff5252;">❌ Connection failed: ${test.message}</span>`;
      }
    }
  }
}
