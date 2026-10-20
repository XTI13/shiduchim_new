// API Client module
const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('shiduchim_token') || null;
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('shiduchim_token', token);
    } else {
      localStorage.removeItem('shiduchim_token');
    }
  }

  getHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...(options.headers || {})
      }
    };

    try {
      const res = await fetch(url, config);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'אירעה שגיאה בבקשה');
      }
      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'} ${endpoint}]:`, err);
      throw err;
    }
  }

  // Auth
  async login(username, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    this.setToken(res.token);
    return res;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Stats
  async getStats() {
    return this.request('/stats');
  }

  // Candidates
  async getCandidates(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    });
    const qs = query.toString();
    return this.request(`/candidates${qs ? '?' + qs : ''}`);
  }

  async getCandidate(id) {
    return this.request(`/candidates/${id}`);
  }

  async createCandidate(candidateData) {
    return this.request('/candidates', {
      method: 'POST',
      body: JSON.stringify(candidateData)
    });
  }

  async updateCandidate(id, candidateData) {
    return this.request(`/candidates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(candidateData)
    });
  }

  async deleteCandidate(id) {
    return this.request(`/candidates/${id}`, {
      method: 'DELETE'
    });
  }

  async getCandidateMatches(id) {
    return this.request(`/candidates/${id}/matches`);
  }

  // Matches
  async getMatches(params = {}) {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        query.append(k, v);
      }
    });
    const qs = query.toString();
    return this.request(`/matches${qs ? '?' + qs : ''}`);
  }

  async getMatch(id) {
    return this.request(`/matches/${id}`);
  }

  async createMatch(boyId, girlId, initialNotes = '') {
    return this.request('/matches', {
      method: 'POST',
      body: JSON.stringify({
        boy_id: boyId,
        girl_id: girlId,
        initial_notes: initialNotes
      })
    });
  }

  async updateMatchStatus(id, updateData) {
    return this.request(`/matches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  async addMatchTimeline(id, timelineData) {
    return this.request(`/matches/${id}/timeline`, {
      method: 'POST',
      body: JSON.stringify(timelineData)
    });
  }

  async deleteMatch(id) {
    return this.request(`/matches/${id}`, {
      method: 'DELETE'
    });
  }
}

window.api = new ApiClient();
