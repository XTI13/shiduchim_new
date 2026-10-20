// Authentication & Session Manager
class AuthManager {
  constructor() {
    this.currentUser = null;
  }

  async init() {
    const token = localStorage.getItem('shiduchim_token');
    if (!token) {
      this.showLoginModal();
      return false;
    }

    try {
      const data = await window.api.getMe();
      if (data && data.user) {
        this.currentUser = data.user;
        this.updateUserUI();
        this.hideLoginModal();
        return true;
      } else {
        this.showLoginModal();
        return false;
      }
    } catch (e) {
      this.showLoginModal();
      return false;
    }
  }

  showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
      modal.classList.add('active');
      const userInput = document.getElementById('loginUsername');
      if (userInput) userInput.focus();
    }
  }

  hideLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('active');
  }

  updateUserUI() {
    const userBadge = document.getElementById('userBadgeName');
    if (userBadge && this.currentUser) {
      userBadge.textContent = this.currentUser.full_name || this.currentUser.username;
    }
  }

  async login(username, password) {
    try {
      const res = await window.api.login(username, password);
      this.currentUser = res.user;
      this.updateUserUI();
      this.hideLoginModal();
      window.showToast('ברוך הבא! התחברת בהצלחה', 'success');
      if (window.app) {
        window.app.loadDashboard();
      }
      return true;
    } catch (err) {
      const errorEl = document.getElementById('loginError');
      if (errorEl) {
        errorEl.textContent = err.message || 'שם משתמש או סיסמה שגויים';
        errorEl.style.display = 'block';
      }
      return false;
    }
  }

  async logout() {
    await window.api.logout();
    this.currentUser = null;
    this.showLoginModal();
    window.showToast('התנתקת מהמערכת', 'info');
  }
}

window.auth = new AuthManager();
