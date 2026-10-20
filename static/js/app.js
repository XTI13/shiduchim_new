// Main Application Coordinator
class App {
  constructor() {
    this.currentView = 'dashboard';
  }

  async init() {
    this.initTheme();
    this.initEventListeners();

    const authenticated = await window.auth.init();
    if (authenticated) {
      this.loadDashboard();
      window.candidates.loadCandidates();
      window.matches.loadMatches();
    }
  }

  initTheme() {
    const savedTheme = localStorage.getItem('shiduchim_theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', savedTheme);
    this.updateThemeButtonIcon(savedTheme);
  }

  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('shiduchim_theme', newTheme);
    this.updateThemeButtonIcon(newTheme);
  }

  updateThemeButtonIcon(theme) {
    const btn = document.getElementById('themeToggleBtn');
    if (btn) {
      btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
    }
  }

  navigate(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewName);
    });

    document.querySelectorAll('.app-section').forEach(section => {
      section.style.display = section.id === `section-${viewName}` ? 'block' : 'none';
    });

    if (viewName === 'dashboard') {
      this.loadDashboard();
    } else if (viewName === 'candidates') {
      window.candidates.loadCandidates();
    } else if (viewName === 'matches') {
      window.matches.loadMatches();
    }
  }

  async loadDashboard() {
    try {
      const stats = await window.api.getStats();
      if (!stats) return;

      document.getElementById('statTotalCandidates').textContent = stats.total_candidates || 0;
      document.getElementById('statBoysCount').textContent = stats.boys_count || 0;
      document.getElementById('statGirlsCount').textContent = stats.girls_count || 0;
      document.getElementById('statActiveMatches').textContent = stats.active_matches || 0;
      document.getElementById('statEngagedMatches').textContent = stats.engaged_matches || 0;

      // טעינת רשימת שידוכים פעילים קצרים לדשבורד
      const activeList = await window.api.getMatches({ status: '' });
      const recentContainer = document.getElementById('dashboardRecentMatches');
      if (recentContainer && activeList) {
        const activeOnly = activeList.filter(m => m.status !== 'closed').slice(0, 5);
        if (activeOnly.length === 0) {
          recentContainer.innerHTML = '<div style="color: var(--text-tertiary); font-size: 0.9rem; text-align: center; padding: 1.5rem;">אין כרגע שידוכים פעילים. התחל לשדך!</div>';
        } else {
          recentContainer.innerHTML = activeOnly.map(m => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.85rem 1rem; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-md); box-shadow: var(--shadow-sm); cursor: pointer;" onclick="window.matches.openMatchDetail(${m.id})">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 1.25rem;">💍</span>
                <div>
                  <div style="font-weight: 600; font-size: 0.95rem;">${escapeHTML(m.boy_name)} & ${escapeHTML(m.girl_name)}</div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary);">${m.current_step_notes || 'שידוך פעיל בתהליך'}</div>
                </div>
              </div>
              <button class="btn-apple btn-secondary btn-sm">
                פרטים ועדכון ←
              </button>
            </div>
          `).join('');
        }
      }
    } catch (e) {
      console.error('Error loading dashboard stats:', e);
    }
  }

  initEventListeners() {
    // Theme toggle
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Nav tabs
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const view = btn.dataset.view;
        if (view) this.navigate(view);
      });
    });

    // Login Form Submit
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const u = document.getElementById('loginUsername').value.trim();
        const p = document.getElementById('loginPassword').value.trim();
        await window.auth.login(u, p);
      });
    }

    // Candidate Form Submit
    const candForm = document.getElementById('candidateForm');
    if (candForm) {
      candForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('cand_id').value;
        const formData = {
          name: document.getElementById('cand_name').value.trim(),
          gender: document.getElementById('cand_gender').value,
          origin: document.getElementById('cand_origin').value.trim(),
          age: document.getElementById('cand_age').value,
          birth_date: document.getElementById('cand_birth_date').value,
          height: document.getElementById('cand_height').value,
          build: document.getElementById('cand_build').value,
          marital_status: document.getElementById('cand_marital_status').value,
          city: document.getElementById('cand_city').value.trim(),
          hashkafa: document.getElementById('cand_hashkafa').value.trim(),
          family_description: document.getElementById('cand_family_description').value.trim(),
          military_service: document.getElementById('cand_military_service').value.trim(),
          occupation: document.getElementById('cand_occupation').value.trim(),
          about_me: document.getElementById('cand_about_me').value.trim(),
          looking_for: document.getElementById('cand_looking_for').value.trim(),
          shomer_negiah: document.getElementById('cand_shomer_negiah').value,
          smoker: document.getElementById('cand_smoker').value,
          phone_type: document.getElementById('cand_phone_type').value,
          contact_phone: document.getElementById('cand_contact_phone').value.trim(),
          referrals: document.getElementById('cand_referrals').value.trim(),
          status: document.getElementById('cand_status').value,
          internal_notes: document.getElementById('cand_internal_notes').value.trim()
        };
        if (id) formData.id = id;
        await window.candidates.saveCandidate(formData);
      });
    }

    // New Match Form Submit
    const newMatchForm = document.getElementById('newMatchForm');
    if (newMatchForm) {
      newMatchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const boyId = document.getElementById('matchBoySelect').value;
        const girlId = document.getElementById('matchGirlSelect').value;
        const notes = document.getElementById('matchInitialNotes').value.trim();
        if (!boyId || !girlId) {
          window.showToast('נא לבחור גם בחור וגם בחורה', 'error');
          return;
        }
        await window.matches.createNewMatch({
          boy_id: parseInt(boyId),
          girl_id: parseInt(girlId),
          initial_notes: notes
        });
      });
    }

    // Candidate Search Input Debounce
    const searchInput = document.getElementById('candidateSearchInput');
    if (searchInput) {
      let timeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          window.candidates.setSearchQuery(e.target.value);
        }, 300);
      });
    }

    // Candidate Hashkafa Filter
    const hashkafaFilter = document.getElementById('filterHashkafa');
    if (hashkafaFilter) {
      hashkafaFilter.addEventListener('change', (e) => {
        window.candidates.setHashkafaFilter(e.target.value);
      });
    }

    // Candidate Status Filter
    const statusFilter = document.getElementById('filterStatus');
    if (statusFilter) {
      statusFilter.addEventListener('change', (e) => {
        window.candidates.setStatusFilter(e.target.value);
      });
    }

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('האם אתה בטוח שברצונך להתנתק?')) {
          window.auth.logout();
        }
      });
    }
  }
}

// Global Toast System
window.showToast = function(message, type = 'info') {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
};

// Share Candidate Registration Link Helpers
window.openShareLinkModal = function() {
  const modal = document.getElementById('shareLinkModal');
  const input = document.getElementById('shareLinkInput');
  if (!modal || !input) return;

  const joinUrl = `${window.location.origin}/join`;
  input.value = joinUrl;
  modal.classList.add('active');
};

window.closeShareLinkModal = function() {
  const modal = document.getElementById('shareLinkModal');
  if (modal) modal.classList.remove('active');
};

window.copyShareLink = function() {
  const input = document.getElementById('shareLinkInput');
  if (!input) return;
  input.select();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(input.value).then(() => {
      window.showToast('הקישור הועתק בהצלחה ללוח!', 'success');
    }).catch(() => {
      document.execCommand('copy');
      window.showToast('הקישור הועתק בהצלחה!', 'success');
    });
  } else {
    document.execCommand('copy');
    window.showToast('הקישור הועתק בהצלחה!', 'success');
  }
};

window.shareOnWhatsApp = function() {
  const input = document.getElementById('shareLinkInput');
  const url = input ? input.value : `${window.location.origin}/join`;
  const text = `שלום וברכה, מצורף קישור למילוי שאלון אישי דיסקרטי למאגר השידוכים של יצחק וליאן בטיטו:\n${url}`;
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
};

// Global fallback listener for any share-link button click
document.addEventListener('click', function(e) {
  const target = e.target.closest('button');
  if (target && target.textContent && target.textContent.includes('שאלון למועמד')) {
    e.preventDefault();
    window.openShareLinkModal();
  }
});

window.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
  window.app.init();
});
