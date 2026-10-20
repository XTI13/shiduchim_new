// Candidates Management Module
class CandidatesManager {
  constructor() {
    this.candidates = [];
    this.currentFilterGender = '';
    this.searchQuery = '';
    this.filterHashkafa = '';
    this.filterStatus = '';
    this.currentCandidate = null;
  }

  async loadCandidates() {
    try {
      const params = {};
      if (this.currentFilterGender) params.gender = this.currentFilterGender;
      if (this.searchQuery) params.search = this.searchQuery;
      if (this.filterHashkafa) params.hashkafa = this.filterHashkafa;
      if (this.filterStatus) params.status = this.filterStatus;

      const data = await window.api.getCandidates(params);
      this.candidates = data || [];
      this.renderGrid();
    } catch (err) {
      window.showToast('שגיאה בטעינת מאגר המועמדים: ' + err.message, 'error');
    }
  }

  setGenderFilter(gender) {
    this.currentFilterGender = gender;
    document.querySelectorAll('.gender-segment-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.gender === gender);
    });
    this.loadCandidates();
  }

  setSearchQuery(q) {
    this.searchQuery = q.trim();
    this.loadCandidates();
  }

  setHashkafaFilter(hashkafa) {
    this.filterHashkafa = hashkafa;
    this.loadCandidates();
  }

  setStatusFilter(status) {
    this.filterStatus = status;
    this.loadCandidates();
  }

  renderGrid() {
    const grid = document.getElementById('candidatesGrid');
    const emptyState = document.getElementById('candidatesEmptyState');
    if (!grid) return;

    if (this.candidates.length === 0) {
      grid.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';

    grid.innerHTML = this.candidates.map(c => this.createCardHTML(c)).join('');
  }

  createCardHTML(c) {
    const isBoy = c.gender === 'boy';
    const genderClass = isBoy ? 'card-boy' : 'card-girl';
    const genderIcon = isBoy ? '👨' : '👩';
    const genderLabel = isBoy ? 'בחור' : 'בחורה';
    const initial = c.name ? c.name.charAt(0) : '?';
    
    // Status text & class
    const statusMap = {
      'available': { text: 'פנוי/ה להצעות', class: 'badge-available' },
      'dating': { text: 'בתהליך שידוך', class: 'badge-dating' },
      'paused': { text: 'בהקפאה', class: 'badge-paused' },
      'engaged': { text: 'מאורס/ת 💍', class: 'badge-engaged' }
    };
    const statusInfo = statusMap[c.status] || statusMap['available'];

    return `
      <div class="candidate-card ${genderClass} animate-slide-up" data-id="${c.id}">
        <div class="card-top-strip"></div>
        <div class="card-body">
          <div class="candidate-header-row">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="candidate-avatar">${initial}</div>
              <div class="candidate-main-info">
                <h3 class="candidate-name">${escapeHTML(c.name)}</h3>
                <div class="candidate-quick-meta">
                  ${genderLabel} • ${c.age ? c.age + ' שנים' : ''} ${c.city ? '• ' + escapeHTML(c.city) : ''}
                </div>
              </div>
            </div>
            <span class="pill-badge ${statusInfo.class}">${statusInfo.text}</span>
          </div>

          <div class="candidate-tags">
            ${c.hashkafa ? `<span class="card-tag">🙏 ${escapeHTML(c.hashkafa)}</span>` : ''}
            ${c.origin ? `<span class="card-tag">✨ ${escapeHTML(c.origin)}</span>` : ''}
            ${c.height ? `<span class="card-tag">📏 ${c.height} מ׳</span>` : ''}
            ${c.build ? `<span class="card-tag">🎀 ${escapeHTML(c.build)}</span>` : ''}
            ${c.phone_type ? `<span class="card-tag">📞 ${escapeHTML(c.phone_type)}</span>` : ''}
          </div>

          ${c.about_me ? `
            <div class="candidate-snippet">
              "${escapeHTML(c.about_me)}"
            </div>
          ` : ''}

          <div class="card-footer">
            <button class="btn-apple btn-secondary btn-sm" onclick="window.candidates.showFullProfile(${c.id})">
              👁️ כרטיס מלא
            </button>
            <button class="btn-apple btn-primary btn-sm" onclick="window.matches.openNewMatchModalWithCandidate(${c.id}, '${c.gender}', '${escapeHTML(c.name)}')">
              💍 הצע שידוך
            </button>
            <button class="icon-btn" title="עריכה" style="width: 32px; height: 32px; font-size: 0.85rem;" onclick="window.candidates.openEditModal(${c.id})">
              ✏️
            </button>
            <button class="icon-btn" title="מחיקה" style="width: 32px; height: 32px; font-size: 0.85rem; color: var(--accent-red);" onclick="window.candidates.confirmDelete(${c.id})">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  }

  async showFullProfile(id) {
    try {
      const c = await window.api.getCandidate(id);
      if (!c) return;
      this.currentCandidate = c;

      const modal = document.getElementById('candidateProfileModal');
      const body = document.getElementById('candidateProfileModalBody');
      if (!modal || !body) return;

      const isBoy = c.gender === 'boy';
      const initial = c.name ? c.name.charAt(0) : '?';
      const avatarClass = isBoy ? 'card-boy' : 'card-girl';

      // Load previous matches for this candidate
      const matches = await window.api.getCandidateMatches(id);

      body.innerHTML = `
        <div class="profile-hero ${avatarClass}" style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; padding: 1.25rem; background: var(--bg-input); border-radius: var(--radius-lg); margin-bottom: 1.5rem;">
          <div style="display: flex; align-items: center; gap: 1.25rem;">
            <div class="candidate-avatar" style="width: 64px; height: 64px; font-size: 1.6rem;">${initial}</div>
            <div>
              <h2 style="font-size: 1.5rem; font-weight: 700; margin-bottom: 2px;">${escapeHTML(c.name)}</h2>
              <div style="color: var(--text-secondary); font-size: 0.95rem;">
                ${isBoy ? 'בחור ישיבה' : 'בחורה'} • גיל ${c.age || '-'} • ${c.marital_status || 'רווק/ה'} • ${c.city || 'לא צוין'}
              </div>
            </div>
          </div>
          <div style="display: flex; gap: 0.5rem; align-items: center;">
            <button class="btn-apple btn-secondary btn-sm" onclick="window.print()">
              🖨️ הדפסה / PDF
            </button>
            <button class="btn-apple btn-primary btn-sm" onclick="window.matches.openNewMatchModalWithCandidate(${c.id}, '${c.gender}', '${escapeHTML(c.name)}')">
              💍 הצע שידוך
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
          <!-- עמודה 1: פרטים טכניים והשקפה -->
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem;">
              <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 1rem; color: var(--accent-blue); display: flex; align-items: center; gap: 0.4rem;">
                👤 פרטי יסוד ומראה
              </h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.88rem;">
                <div><span style="color: var(--text-tertiary);">עדה:</span> <strong>${escapeHTML(c.origin || 'לא צוין')}</strong></div>
                <div><span style="color: var(--text-tertiary);">גובה:</span> <strong>${c.height ? c.height + ' מ׳' : 'לא צוין'}</strong></div>
                <div><span style="color: var(--text-tertiary);">מבנה כללי:</span> <strong>${escapeHTML(c.build || 'רגיל')}</strong></div>
                <div><span style="color: var(--text-tertiary);">תאריך לידה:</span> <strong>${escapeHTML(c.birth_date || 'לא צוין')}</strong></div>
                <div><span style="color: var(--text-tertiary);">מגורים:</span> <strong>${escapeHTML(c.city || 'לא צוין')}</strong></div>
                <div><span style="color: var(--text-tertiary);">מצב משפחתי:</span> <strong>${escapeHTML(c.marital_status || 'רווק/ה')}</strong></div>
              </div>
            </div>

            <div style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem;">
              <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 1rem; color: var(--accent-blue); display: flex; align-items: center; gap: 0.4rem;">
                🕊️ השקפה ואורח חיים
              </h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; font-size: 0.88rem;">
                <div><span style="color: var(--text-tertiary);">השקפה:</span> <strong>${escapeHTML(c.hashkafa || 'לא צוין')}</strong></div>
                <div><span style="color: var(--text-tertiary);">שומר/ת נגיעה:</span> <strong>${escapeHTML(c.shomer_negiah || 'כן')}</strong></div>
                <div><span style="color: var(--text-tertiary);">מעשן/ת:</span> <strong>${escapeHTML(c.smoker || 'לא')}</strong></div>
                <div><span style="color: var(--text-tertiary);">סוג טלפון:</span> <strong>${escapeHTML(c.phone_type || 'כשר')}</strong></div>
              </div>
            </div>

            <div style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem;">
              <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 1rem; color: var(--accent-blue); display: flex; align-items: center; gap: 0.4rem;">
                🎓 לימודים, שירות ומשפחה
              </h4>
              <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.88rem;">
                <div>
                  <div style="color: var(--text-tertiary); font-size: 0.8rem;">שירות צבאי / לאומי / ישיבה:</div>
                  <div style="font-weight: 500; margin-top: 2px;">${escapeHTML(c.military_service || 'לא צוין')}</div>
                </div>
                <div>
                  <div style="color: var(--text-tertiary); font-size: 0.8rem;">עיסוק ושאיפה לעתיד:</div>
                  <div style="font-weight: 500; margin-top: 2px;">${escapeHTML(c.occupation || 'לא צוין')}</div>
                </div>
                <div>
                  <div style="color: var(--text-tertiary); font-size: 0.8rem;">תיאור המשפחה:</div>
                  <div style="font-weight: 500; margin-top: 2px;">${escapeHTML(c.family_description || 'לא צוין')}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- עמודה 2: עולם פנימי ובירורים -->
          <div style="display: flex; flex-direction: column; gap: 1.25rem;">
            <div style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem;">
              <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 0.6rem; color: var(--accent-blue);">
                🌟 קצת עלי
              </h4>
              <div style="font-size: 0.9rem; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; background: var(--bg-input); padding: 0.85rem; border-radius: var(--radius-sm);">
                ${escapeHTML(c.about_me || 'טרם עודכן')}
              </div>
            </div>

            <div style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem;">
              <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 0.6rem; color: var(--accent-gold);">
                🎯 מה אני מחפש/ת
              </h4>
              <div style="font-size: 0.9rem; line-height: 1.6; color: var(--text-primary); white-space: pre-wrap; background: var(--bg-input); padding: 0.85rem; border-radius: var(--radius-sm);">
                ${escapeHTML(c.looking_for || 'טרם עודכן')}
              </div>
            </div>

            <div style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem;">
              <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 0.6rem; color: var(--accent-blue);">
                📞 יצירת קשר ובירורים
              </h4>
              <div style="display: flex; flex-direction: column; gap: 0.5rem; font-size: 0.88rem;">
                <div><span style="color: var(--text-tertiary);">טלפון איש קשר / הורים:</span> <strong>${escapeHTML(c.contact_phone || 'לא צוין')}</strong></div>
                <div><span style="color: var(--text-tertiary);">ממליצים ורבנים:</span> <strong>${escapeHTML(c.referrals || 'לא צוין')}</strong></div>
              </div>
            </div>

            ${c.internal_notes ? `
              <div class="secret-notes-section" style="background: rgba(255, 149, 0, 0.08); border: 1px dashed rgba(255, 149, 0, 0.3); border-radius: var(--radius-md); padding: 1.25rem;">
                <h4 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.4rem; color: var(--accent-orange); display: flex; align-items: center; gap: 0.4rem;">
                  🔒 הערות פנימיות של השדכן (חסוי)
                </h4>
                <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
                  ${escapeHTML(c.internal_notes)}
                </div>
              </div>
            ` : ''}
          </div>
        </div>

        <!-- היסטוריית שידוכים של המועמד -->
        <div style="margin-top: 1.5rem; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem;">
          <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 0.85rem; color: var(--text-primary);">
            📜 היסטוריית הצעות ושידוכים (${matches ? matches.length : 0})
          </h4>
          ${matches && matches.length > 0 ? `
            <div style="display: flex; flex-direction: column; gap: 0.6rem;">
              ${matches.map(m => {
                const partnerName = isBoy ? m.girl_name : m.boy_name;
                const partnerAge = isBoy ? m.girl_age : m.boy_age;
                const partnerCity = isBoy ? m.girl_city : m.boy_city;
                return `
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.85rem; background: var(--bg-input); border-radius: var(--radius-sm); font-size: 0.85rem;">
                    <div>
                      <strong>${escapeHTML(partnerName)}</strong> (גיל ${partnerAge || '-'}, ${escapeHTML(partnerCity || '')})
                      ${m.current_step_notes ? `<span style="color: var(--text-tertiary); margin-right: 0.5rem;">• ${escapeHTML(m.current_step_notes)}</span>` : ''}
                    </div>
                    <button class="btn-apple btn-secondary btn-sm" onclick="window.matches.openMatchDetail(${m.id})">
                      צפה ביומן השידוך
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          ` : `
            <div style="color: var(--text-tertiary); font-size: 0.85rem;">אין עדיין היסטוריית הצעות עבור מועמד זה.</div>
          `}
        </div>
      `;

      modal.classList.add('active');
    } catch (err) {
      window.showToast('שגיאה בטעינת פרופיל: ' + err.message, 'error');
    }
  }

  closeProfileModal() {
    const modal = document.getElementById('candidateProfileModal');
    if (modal) modal.classList.remove('active');
  }

  openAddModal() {
    this.currentCandidate = null;
    const modal = document.getElementById('candidateFormModal');
    const form = document.getElementById('candidateForm');
    const title = document.getElementById('candidateFormModalTitle');
    if (!modal || !form) return;

    title.textContent = '✨ הוספת מועמד/ת חדש/ה למאגר';
    form.reset();
    document.getElementById('cand_id').value = '';
    document.getElementById('cand_gender').value = 'boy';
    document.getElementById('cand_status').value = 'available';
    document.getElementById('cand_shomer_negiah').value = 'כן';
    document.getElementById('cand_smoker').value = 'לא';
    document.getElementById('cand_phone_type').value = 'כשר';

    modal.classList.add('active');
  }

  async openEditModal(id) {
    try {
      const c = await window.api.getCandidate(id);
      if (!c) return;
      this.currentCandidate = c;

      const modal = document.getElementById('candidateFormModal');
      const form = document.getElementById('candidateForm');
      const title = document.getElementById('candidateFormModalTitle');
      if (!modal || !form) return;

      title.textContent = `✏️ עריכת כרטיס: ${c.name}`;
      
      document.getElementById('cand_id').value = c.id;
      document.getElementById('cand_name').value = c.name || '';
      document.getElementById('cand_gender').value = c.gender || 'boy';
      document.getElementById('cand_origin').value = c.origin || '';
      document.getElementById('cand_age').value = c.age || '';
      document.getElementById('cand_birth_date').value = c.birth_date || '';
      document.getElementById('cand_height').value = c.height || '';
      document.getElementById('cand_build').value = c.build || 'רגיל';
      document.getElementById('cand_marital_status').value = c.marital_status || 'רווק/ה';
      document.getElementById('cand_city').value = c.city || '';
      document.getElementById('cand_hashkafa').value = c.hashkafa || '';
      document.getElementById('cand_family_description').value = c.family_description || '';
      document.getElementById('cand_military_service').value = c.military_service || '';
      document.getElementById('cand_occupation').value = c.occupation || '';
      document.getElementById('cand_about_me').value = c.about_me || '';
      document.getElementById('cand_looking_for').value = c.looking_for || '';
      document.getElementById('cand_shomer_negiah').value = c.shomer_negiah || 'כן';
      document.getElementById('cand_smoker').value = c.smoker || 'לא';
      document.getElementById('cand_phone_type').value = c.phone_type || 'כשר';
      document.getElementById('cand_contact_phone').value = c.contact_phone || '';
      document.getElementById('cand_referrals').value = c.referrals || '';
      document.getElementById('cand_status').value = c.status || 'available';
      document.getElementById('cand_internal_notes').value = c.internal_notes || '';

      modal.classList.add('active');
    } catch (err) {
      window.showToast('שגיאה בפתיחת עריכה: ' + err.message, 'error');
    }
  }

  closeFormModal() {
    const modal = document.getElementById('candidateFormModal');
    if (modal) modal.classList.remove('active');
  }

  async saveCandidate(formData) {
    try {
      const id = formData.id;
      let res;
      if (id) {
        res = await window.api.updateCandidate(id, formData);
        window.showToast('כרטיס המועמד עודכן בהצלחה', 'success');
      } else {
        res = await window.api.createCandidate(formData);
        window.showToast('המועמד/ת נוספו בהצלחה למאגר', 'success');
      }
      this.closeFormModal();
      this.loadCandidates();
      if (window.app) window.app.loadDashboard();
      return res;
    } catch (err) {
      window.showToast('שגיאה בשמירת פרטים: ' + err.message, 'error');
    }
  }

  async confirmDelete(id) {
    if (confirm('האם אתה בטוח שברצונך למחוק מועמד/ת זה ממאגר השידוכים? פעולה זו תמחק גם שידוכים הקשורים אליהם.')) {
      try {
        await window.api.deleteCandidate(id);
        window.showToast('המועמד נמחק בהצלחה מהמאגר', 'info');
        this.loadCandidates();
        if (window.app) window.app.loadDashboard();
      } catch (err) {
        window.showToast('שגיאה במחיקת מועמד: ' + err.message, 'error');
      }
    }
  }
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.candidates = new CandidatesManager();
