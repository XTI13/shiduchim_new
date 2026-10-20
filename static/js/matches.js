// Matches & Pipeline Management Module
class MatchesManager {
  constructor() {
    this.matches = [];
    this.currentMatch = null;
    this.currentStatusFilter = '';
  }

  async loadMatches() {
    try {
      const params = {};
      if (this.currentStatusFilter) params.status = this.currentStatusFilter;
      const data = await window.api.getMatches(params);
      this.matches = data || [];
      this.renderPipeline();
    } catch (err) {
      window.showToast('שגיאה בטעינת שידוכים: ' + err.message, 'error');
    }
  }

  setStatusFilter(status) {
    this.currentStatusFilter = status;
    this.loadMatches();
  }

  renderPipeline() {
    const container = document.getElementById('pipelineBoard');
    if (!container) return;

    const stages = [
      { id: 'idea', title: '💡 רעיון ובדיקה', color: 'var(--text-secondary)' },
      { id: 'waiting_girl', title: '⏳ ממתין לבחורה', color: 'var(--accent-pink)' },
      { id: 'waiting_boy', title: '⏳ ממתינה לבחור', color: 'var(--accent-blue)' },
      { id: 'approved', title: '🤝 אושר לפגישה', color: 'var(--accent-green)' },
      { id: 'meeting_1', title: '☕ פגישה 1', color: 'var(--accent-gold)' },
      { id: 'meeting_2', title: '☕ פגישה 2', color: 'var(--accent-gold)' },
      { id: 'meeting_3_plus', title: '🌟 פגישה 3+', color: 'var(--accent-purple)' },
      { id: 'advanced', title: '🚀 מתקדם ברצינות', color: 'var(--accent-blue)' },
      { id: 'engaged', title: '💍 מאורסים!', color: 'var(--accent-gold)' },
      { id: 'closed', title: '❌ ירד מהפרק', color: 'var(--accent-red)' }
    ];

    container.innerHTML = stages.map(stage => {
      const stageMatches = this.matches.filter(m => m.status === stage.id);
      return `
        <div class="pipeline-col">
          <div class="pipeline-col-header">
            <span style="color: ${stage.color};">${stage.title}</span>
            <span class="col-badge">${stageMatches.length}</span>
          </div>
          <div class="pipeline-cards-list">
            ${stageMatches.map(m => this.createKanbanCardHTML(m)).join('')}
            ${stageMatches.length === 0 ? `<div style="text-align: center; color: var(--text-tertiary); font-size: 0.8rem; padding: 1.5rem 0;">אין שידוכים בשלב זה</div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  createKanbanCardHTML(m) {
    return `
      <div class="match-kanban-card" onclick="window.matches.openMatchDetail(${m.id})">
        <div class="match-pair-row">
          <div class="match-person">
            <span class="match-person-name">👨 ${escapeHTML(m.boy_name)}</span>
            <span class="match-person-meta">${m.boy_age ? m.boy_age + ' • ' : ''}${escapeHTML(m.boy_city || '')}</span>
          </div>
          <div class="match-connector">💍</div>
          <div class="match-person" style="text-align: left;">
            <span class="match-person-name">👩 ${escapeHTML(m.girl_name)}</span>
            <span class="match-person-meta">${m.girl_age ? m.girl_age + ' • ' : ''}${escapeHTML(m.girl_city || '')}</span>
          </div>
        </div>
        ${m.current_step_notes ? `
          <div class="match-card-note">
            📝 ${escapeHTML(m.current_step_notes)}
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.6rem; font-size: 0.75rem; color: var(--text-tertiary);">
          <span>${m.meeting_count ? `פגישות: ${m.meeting_count}` : 'טרם נפגשו'}</span>
          <span>עודכן: ${formatDate(m.updated_at)}</span>
        </div>
      </div>
    `;
  }

  async openMatchDetail(id) {
    try {
      const match = await window.api.getMatch(id);
      if (!match) return;
      this.currentMatch = match;

      const modal = document.getElementById('matchDetailModal');
      const body = document.getElementById('matchDetailModalBody');
      if (!modal || !body) return;

      const statusMap = {
        'idea': '💡 רעיון ראשוני / בבדיקה',
        'waiting_girl': '⏳ ממתין לבחורה',
        'waiting_boy': '⏳ ממתינה לבחור',
        'approved': '🤝 אושר להחלפת פרטים / פגישה',
        'meeting_1': '☕ פגישה 1',
        'meeting_2': '☕ פגישה 2',
        'meeting_3_plus': '🌟 פגישה 3+',
        'advanced': '🚀 מתקדם ברצינות',
        'engaged': '💍 מאורסים! מזל טוב!',
        'closed': '❌ ירד מהפרק / לא התאים'
      };

      body.innerHTML = `
        <!-- כותרת הזוג המשתדך -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 1.25rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem;">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="text-align: right;">
              <h3 style="font-size: 1.15rem; font-weight: 600; color: var(--accent-blue);">👨 ${escapeHTML(match.boy_name)}</h3>
              <div style="font-size: 0.82rem; color: var(--text-secondary);">
                גיל ${match.boy_age || '-'} • ${escapeHTML(match.boy_city || '')} • ${escapeHTML(match.boy_hashkafa || '')}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 2px;">
                📞 ${escapeHTML(match.boy_phone || 'אין טלפון')}
              </div>
            </div>
          </div>

          <div style="font-size: 1.5rem; color: var(--accent-gold);">💍</div>

          <div style="display: flex; align-items: center; gap: 1rem;">
            <div style="text-align: left;">
              <h3 style="font-size: 1.15rem; font-weight: 600; color: var(--accent-pink);">👩 ${escapeHTML(match.girl_name)}</h3>
              <div style="font-size: 0.82rem; color: var(--text-secondary);">
                גיל ${match.girl_age || '-'} • ${escapeHTML(match.girl_city || '')} • ${escapeHTML(match.girl_hashkafa || '')}
              </div>
              <div style="font-size: 0.8rem; color: var(--text-tertiary); margin-top: 2px;">
                📞 ${escapeHTML(match.girl_phone || 'אין טלפון')}
              </div>
            </div>
          </div>
        </div>

        <!-- עריכת סטטוס ופרטים מהירים -->
        <div style="background: var(--bg-input); border-radius: var(--radius-md); padding: 1rem; display: flex; flex-wrap: wrap; gap: 1rem; align-items: center; justify-content: space-between;">
          <div style="display: flex; align-items: center; gap: 0.75rem; flex: 1; min-width: 250px;">
            <label style="font-size: 0.85rem; font-weight: 600;">סטטוס נוכחי:</label>
            <select id="quickMatchStatus" class="select-apple" style="flex: 1;">
              ${Object.entries(statusMap).map(([val, label]) => `
                <option value="${val}" ${match.status === val ? 'selected' : ''}>${label}</option>
              `).join('')}
            </select>
          </div>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <label style="font-size: 0.85rem; font-weight: 600;">מספר פגישות:</label>
            <input type="number" id="quickMeetingCount" class="form-input" style="width: 80px;" value="${match.meeting_count || 0}" min="0">
          </div>

          <button class="btn-apple btn-primary btn-sm" onclick="window.matches.saveQuickStatus(${match.id})">
            💾 עדכן סטטוס
          </button>
        </div>

        <!-- הוספת הערת פגישה / מעקב לציר הזמן -->
        <div style="background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 1.25rem;">
          <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--accent-blue); display: flex; align-items: center; gap: 0.4rem;">
            ✍️ הוספת סיכום פגישה / עדכון מעקב
          </h4>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex; gap: 0.75rem;">
              <input type="text" id="newTimelineTitle" class="form-input" placeholder="כותרת (למשל: סיכום פגישה 1, שיחה עם אם הבחור...)" style="flex: 2;">
              <input type="date" id="newTimelineDate" class="form-input" style="flex: 1;" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <textarea id="newTimelineNotes" class="form-textarea" placeholder="רשמים מהפגישה, תגובות שני הצדדים, אתגרים שעלו, המלצות לשלב הבא..."></textarea>
            <div style="text-align: left;">
              <button class="btn-apple btn-primary btn-sm" onclick="window.matches.addTimelineEntry(${match.id})">
                ➕ הוסף לציר הזמן
              </button>
            </div>
          </div>
        </div>

        <!-- ציר הזמן והיסטוריית השידוך -->
        <div>
          <h4 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-primary);">
            ⏳ יומן ציר הזמן (${match.timeline ? match.timeline.length : 0})
          </h4>
          <div class="timeline-list">
            ${match.timeline && match.timeline.length > 0 ? match.timeline.map(t => `
              <div class="timeline-entry">
                <div class="timeline-entry-header">
                  <span class="timeline-entry-title">${escapeHTML(t.title)}</span>
                  <span class="timeline-entry-date">${t.meeting_date ? 'תאריך פגישה: ' + t.meeting_date : formatDate(t.created_at)}</span>
                </div>
                <div class="timeline-entry-content">${escapeHTML(t.notes || '')}</div>
              </div>
            `).join('') : `
              <div style="color: var(--text-tertiary); font-size: 0.85rem; padding: 1rem 0;">אין עדיין רישומים ביומן.</div>
            `}
          </div>
        </div>

        <!-- כפתורי פעולה תחתונים -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-light); padding-top: 1rem;">
          <button class="btn-apple btn-danger btn-sm" onclick="window.matches.confirmDeleteMatch(${match.id})">
            🗑️ מחק שידוך זה
          </button>
          <button class="btn-apple btn-secondary btn-sm" onclick="window.matches.closeMatchModal()">
            סגור
          </button>
        </div>
      `;

      modal.classList.add('active');
    } catch (err) {
      window.showToast('שגיאה בטעינת פרטי שידוך: ' + err.message, 'error');
    }
  }

  closeMatchModal() {
    const modal = document.getElementById('matchDetailModal');
    if (modal) modal.classList.remove('active');
  }

  async saveQuickStatus(matchId) {
    const status = document.getElementById('quickMatchStatus').value;
    const meetingCount = parseInt(document.getElementById('quickMeetingCount').value) || 0;
    try {
      await window.api.updateMatchStatus(matchId, {
        status: status,
        meeting_count: meetingCount
      });
      window.showToast('סטטוס השידוך עודכן בהצלחה', 'success');
      this.openMatchDetail(matchId);
      this.loadMatches();
      if (window.app) window.app.loadDashboard();
    } catch (err) {
      window.showToast('שגיאה בעדכון סטטוס: ' + err.message, 'error');
    }
  }

  async addTimelineEntry(matchId) {
    const title = document.getElementById('newTimelineTitle').value.trim() || 'עדכון פגישה';
    const date = document.getElementById('newTimelineDate').value;
    const notes = document.getElementById('newTimelineNotes').value.trim();

    if (!notes && !title) {
      window.showToast('נא למלא תוכן להערה', 'error');
      return;
    }

    try {
      await window.api.addMatchTimeline(matchId, {
        title: title,
        meeting_date: date,
        notes: notes
      });
      window.showToast('ההערה נוספה בהצלחה ליומן השידוך', 'success');
      this.openMatchDetail(matchId);
      this.loadMatches();
    } catch (err) {
      window.showToast('שגיאה בהוספת הערה: ' + err.message, 'error');
    }
  }

  // פתיחת מודאל שידוך חדש
  async openNewMatchModal(preselectBoyId = null, preselectGirlId = null) {
    const modal = document.getElementById('newMatchModal');
    const boySelect = document.getElementById('matchBoySelect');
    const girlSelect = document.getElementById('matchGirlSelect');
    if (!modal || !boySelect || !girlSelect) return;

    try {
      const candidates = await window.api.getCandidates();
      const boys = candidates.filter(c => c.gender === 'boy');
      const girls = candidates.filter(c => c.gender === 'girl');

      boySelect.innerHTML = '<option value="">-- בחר בחור מהמאגר --</option>' +
        boys.map(b => `<option value="${b.id}" ${b.id === preselectBoyId ? 'selected' : ''}>${escapeHTML(b.name)} (גיל ${b.age || '-'}, ${escapeHTML(b.city || '')}, ${escapeHTML(b.hashkafa || '')})</option>`).join('');

      girlSelect.innerHTML = '<option value="">-- בחר בחורה מהמאגר --</option>' +
        girls.map(g => `<option value="${g.id}" ${g.id === preselectGirlId ? 'selected' : ''}>${escapeHTML(g.name)} (גיל ${g.age || '-'}, ${escapeHTML(g.city || '')}, ${escapeHTML(g.hashkafa || '')})</option>`).join('');

      document.getElementById('matchInitialNotes').value = '';
      modal.classList.add('active');
    } catch (err) {
      window.showToast('שגיאה בטעינת מועמדים לשידוך: ' + err.message, 'error');
    }
  }

  // פתיחה ישירה מתוך כרטיס מועמד
  openNewMatchModalWithCandidate(candidateId, gender, candidateName) {
    if (gender === 'boy') {
      this.openNewMatchModal(candidateId, null);
    } else {
      this.openNewMatchModal(null, candidateId);
    }
  }

  closeNewMatchModal() {
    const modal = document.getElementById('newMatchModal');
    if (modal) modal.classList.remove('active');
  }

  async createNewMatch(formData) {
    try {
      const res = await window.api.createMatch(
        formData.boy_id,
        formData.girl_id,
        formData.initial_notes
      );
      window.showToast('השידוך נוצר בהצלחה!', 'success');
      this.closeNewMatchModal();
      this.loadMatches();
      if (window.app) window.app.loadDashboard();
      this.openMatchDetail(res.id);
    } catch (err) {
      window.showToast(err.message || 'שגיאה ביצירת שידוך', 'error');
    }
  }

  async confirmDeleteMatch(id) {
    if (confirm('האם אתה בטוח שברצונך למחוק רשומת שידוך זו? כל יומן הפגישות יימחק לצמיתות.')) {
      try {
        await window.api.deleteMatch(id);
        window.showToast('השידוך נמחק בהצלחה', 'info');
        this.closeMatchModal();
        this.loadMatches();
        if (window.app) window.app.loadDashboard();
      } catch (err) {
        window.showToast('שגיאה במחיקת שידוך: ' + err.message, 'error');
      }
    }
  }
}

function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' });
  } catch (e) {
    return isoStr;
  }
}

window.matches = new MatchesManager();
