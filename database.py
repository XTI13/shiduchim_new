import sqlite3
import hashlib
import secrets
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shiduchim.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn

def hash_password(password: str, salt: str = None) -> tuple:
    if not salt:
        salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()
    return hashed, salt

def verify_password(password: str, hashed: str, salt: str) -> bool:
    new_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(new_hash, hashed)

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    # טבלת משתמשים / שדכנים
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        full_name TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    ''')

    # טבלת סשנים
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    );
    ''')

    # טבלת מועמדים (בחורים ובחורות)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS candidates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        gender TEXT NOT NULL CHECK(gender IN ('boy', 'girl')),
        origin TEXT,                      -- עדה (מרוקאי, עיראקי, אשכנזי וכו')
        age INTEGER,                      -- גיל
        birth_date TEXT,                  -- תאריך לידה (אופציונלי)
        height REAL,                      -- גובה (במטרים, למשל 1.72)
        build TEXT,                       -- מבנה כללי (רגיל, רזה, ספורטיבי וכו')
        marital_status TEXT DEFAULT 'רווק/ה', -- מצב משפחתי (רווק/ה, גרוש/ה, אלמן/ה)
        city TEXT,                        -- מקום מגורים
        hashkafa TEXT,                    -- השקפה (חרדי, ליטאי, ספרדי, חסידי, דתי לאומי וכו')
        family_description TEXT,          -- תיאור המשפחה בקווים כלליים
        military_service TEXT,            -- שירות צבאי / לאומי / ישיבה
        occupation TEXT,                  -- עיסוק נוכחי ושאיפה לעתיד
        about_me TEXT,                    -- קצת עלי
        looking_for TEXT,                 -- אני מחפש/ת
        shomer_negiah TEXT DEFAULT 'כן',  -- שומר/ת נגיעה
        smoker TEXT DEFAULT 'לא',         -- מעשן/ת
        phone_type TEXT DEFAULT 'כשר',    -- סוג טלפון (כשר, מסונן, חכם)
        contact_phone TEXT,               -- טלפון ליצירת קשר / הורים
        referrals TEXT,                   -- ממליצים / רבנים לבירור
        status TEXT DEFAULT 'available',  -- available, dating, paused, engaged
        internal_notes TEXT,              -- הערות שדכן פנימיות
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );
    ''')

    # טבלת שידוכים (התאמות בין בחור לבחורה)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        boy_id INTEGER NOT NULL,
        girl_id INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'idea',
        -- סטטוסים אפשריים:
        -- idea (רעיון ראשוני / בבדיקה)
        -- waiting_boy (ממתין לתשובת הבחור)
        -- waiting_girl (ממתין לתשובת הבחורה)
        -- approved (אושר להחלפת פרטים / פגישה)
        -- meeting_1 (פגישה 1)
        -- meeting_2 (פגישה 2)
        -- meeting_3_plus (פגישה 3 ומעלה)
        -- advanced (מתקדם ברצינות)
        -- engaged (מאורסים 💍)
        -- closed (לא התאים / ירד מהפרק)
        meeting_count INTEGER DEFAULT 0,
        current_step_notes TEXT,
        closed_reason TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (boy_id) REFERENCES candidates (id) ON DELETE CASCADE,
        FOREIGN KEY (girl_id) REFERENCES candidates (id) ON DELETE CASCADE
    );
    ''')

    # יומן מעקב / פגישות של השידוך
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS match_timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        notes TEXT,
        meeting_date TEXT,
        status_at_time TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (match_id) REFERENCES matches (id) ON DELETE CASCADE
    );
    ''')

    # יצירת אינדקסים לביצועים מהירים
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_candidates_gender ON candidates(gender);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_candidates_city ON candidates(city);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_matches_boy ON matches(boy_id);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_matches_girl ON matches(girl_id);')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);')

    conn.commit()
    conn.close()

# ניהול משתמשים וסשנים
def create_user(username, password, full_name):
    conn = get_db_connection()
    cursor = conn.cursor()
    pwd_hash, salt = hash_password(password)
    now = datetime.now().isoformat()
    try:
        cursor.execute(
            'INSERT INTO users (username, password_hash, salt, full_name, created_at) VALUES (?, ?, ?, ?, ?)',
            (username.strip().lower(), pwd_hash, salt, full_name.strip(), now)
        )
        conn.commit()
        user_id = cursor.lastrowid
        return {'id': user_id, 'username': username, 'full_name': full_name}
    except sqlite3.IntegrityError:
        return None
    finally:
        conn.close()

def authenticate_user(username, password):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM users WHERE username = ?', (username.strip().lower(),))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return None
    if verify_password(password, user['password_hash'], user['salt']):
        return dict(user)
    return None

def create_session(user_id):
    token = secrets.token_hex(32)
    now = datetime.now().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)', (token, user_id, now))
    conn.commit()
    conn.close()
    return token

def get_user_by_session(token):
    if not token:
        return None
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT u.id, u.username, u.full_name, u.created_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ?
    ''', (token,))
    user = cursor.fetchone()
    conn.close()
    return dict(user) if user else None

def delete_session(token):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM sessions WHERE token = ?', (token,))
    conn.commit()
    conn.close()

# ניהול מועמדים (Candidates CRUD)
def get_candidates(filters=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = 'SELECT * FROM candidates WHERE 1=1'
    params = []

    if filters:
        if filters.get('gender'):
            query += ' AND gender = ?'
            params.append(filters['gender'])
        if filters.get('status'):
            query += ' AND status = ?'
            params.append(filters['status'])
        if filters.get('city'):
            query += ' AND city LIKE ?'
            params.append(f"%{filters['city']}%")
        if filters.get('hashkafa'):
            query += ' AND hashkafa LIKE ?'
            params.append(f"%{filters['hashkafa']}%")
        if filters.get('origin'):
            query += ' AND origin LIKE ?'
            params.append(f"%{filters['origin']}%")
        if filters.get('min_age'):
            try:
                query += ' AND age >= ?'
                params.append(int(filters['min_age']))
            except (ValueError, TypeError):
                pass
        if filters.get('max_age'):
            try:
                query += ' AND age <= ?'
                params.append(int(filters['max_age']))
            except (ValueError, TypeError):
                pass
        if filters.get('search'):
            search = f"%{filters['search']}%"
            query += ' AND (name LIKE ? OR origin LIKE ? OR city LIKE ? OR occupation LIKE ? OR about_me LIKE ?)'
            params.extend([search, search, search, search, search])

    query += ' ORDER BY id DESC'
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_candidate(candidate_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM candidates WHERE id = ?', (candidate_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def add_candidate(data):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    fields = [
        'name', 'gender', 'origin', 'age', 'birth_date', 'height', 'build',
        'marital_status', 'city', 'hashkafa', 'family_description',
        'military_service', 'occupation', 'about_me', 'looking_for',
        'shomer_negiah', 'smoker', 'phone_type', 'contact_phone',
        'referrals', 'status', 'internal_notes', 'created_at', 'updated_at'
    ]
    
    age_val = None
    if data.get('age'):
        try:
            age_val = int(data.get('age'))
        except (ValueError, TypeError):
            pass

    height_val = None
    if data.get('height'):
        try:
            height_val = float(data.get('height'))
        except (ValueError, TypeError):
            pass

    values = [
        data.get('name', '').strip(),
        data.get('gender', 'boy'),
        data.get('origin', ''),
        age_val,
        data.get('birth_date', ''),
        height_val,
        data.get('build', 'רגיל'),
        data.get('marital_status', 'רווק/ה'),
        data.get('city', ''),
        data.get('hashkafa', ''),
        data.get('family_description', ''),
        data.get('military_service', ''),
        data.get('occupation', ''),
        data.get('about_me', ''),
        data.get('looking_for', ''),
        data.get('shomer_negiah', 'כן'),
        data.get('smoker', 'לא'),
        data.get('phone_type', 'כשר'),
        data.get('contact_phone', ''),
        data.get('referrals', data.get('references', '')),
        data.get('status', 'available'),
        data.get('internal_notes', ''),
        now,
        now
    ]
    placeholders = ', '.join(['?'] * len(fields))
    columns = ', '.join(fields)
    cursor.execute(f'INSERT INTO candidates ({columns}) VALUES ({placeholders})', values)
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return get_candidate(new_id)

def update_candidate(candidate_id, data):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    fields = [
        'name', 'gender', 'origin', 'age', 'birth_date', 'height', 'build',
        'marital_status', 'city', 'hashkafa', 'family_description',
        'military_service', 'occupation', 'about_me', 'looking_for',
        'shomer_negiah', 'smoker', 'phone_type', 'contact_phone',
        'referrals', 'status', 'internal_notes'
    ]
    set_clauses = [f"{field} = ?" for field in fields]
    set_clauses.append("updated_at = ?")

    age_val = None
    if data.get('age'):
        try:
            age_val = int(data.get('age'))
        except (ValueError, TypeError):
            pass

    height_val = None
    if data.get('height'):
        try:
            height_val = float(data.get('height'))
        except (ValueError, TypeError):
            pass

    values = [
        data.get('name', '').strip(),
        data.get('gender', 'boy'),
        data.get('origin', ''),
        age_val,
        data.get('birth_date', ''),
        height_val,
        data.get('build', 'רגיל'),
        data.get('marital_status', 'רווק/ה'),
        data.get('city', ''),
        data.get('hashkafa', ''),
        data.get('family_description', ''),
        data.get('military_service', ''),
        data.get('occupation', ''),
        data.get('about_me', ''),
        data.get('looking_for', ''),
        data.get('shomer_negiah', 'כן'),
        data.get('smoker', 'לא'),
        data.get('phone_type', 'כשר'),
        data.get('contact_phone', ''),
        data.get('referrals', data.get('references', '')),
        data.get('status', 'available'),
        data.get('internal_notes', ''),
        now,
        candidate_id
    ]

    cursor.execute(f"UPDATE candidates SET {', '.join(set_clauses)} WHERE id = ?", values)
    conn.commit()
    conn.close()
    return get_candidate(candidate_id)

def delete_candidate(candidate_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM candidates WHERE id = ?', (candidate_id,))
    conn.commit()
    conn.close()
    return True

# ניהול שידוכים (Matches)
def get_matches(filters=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    query = '''
        SELECT 
            m.*,
            b.name AS boy_name, b.age AS boy_age, b.city AS boy_city, b.hashkafa AS boy_hashkafa, b.origin AS boy_origin,
            g.name AS girl_name, g.age AS girl_age, g.city AS girl_city, g.hashkafa AS girl_hashkafa, g.origin AS girl_origin
        FROM matches m
        JOIN candidates b ON m.boy_id = b.id
        JOIN candidates g ON m.girl_id = g.id
        WHERE 1=1
    '''
    params = []
    if filters:
        if filters.get('status'):
            query += ' AND m.status = ?'
            params.append(filters['status'])
        if filters.get('candidate_id'):
            query += ' AND (m.boy_id = ? OR m.girl_id = ?)'
            params.extend([filters['candidate_id'], filters['candidate_id']])

    query += ' ORDER BY m.updated_at DESC'
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_match(match_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT 
            m.*,
            b.name AS boy_name, b.age AS boy_age, b.city AS boy_city, b.hashkafa AS boy_hashkafa, b.origin AS boy_origin, b.occupation AS boy_occupation, b.contact_phone AS boy_phone,
            g.name AS girl_name, g.age AS girl_age, g.city AS girl_city, g.hashkafa AS girl_hashkafa, g.origin AS girl_origin, g.occupation AS girl_occupation, g.contact_phone AS girl_phone
        FROM matches m
        JOIN candidates b ON m.boy_id = b.id
        JOIN candidates g ON m.girl_id = g.id
        WHERE m.id = ?
    ''', (match_id,))
    match_row = cursor.fetchone()
    if not match_row:
        conn.close()
        return None

    match_dict = dict(match_row)
    cursor.execute('''
        SELECT * FROM match_timeline WHERE match_id = ? ORDER BY id DESC
    ''', (match_id,))
    timeline_rows = cursor.fetchall()
    match_dict['timeline'] = [dict(t) for t in timeline_rows]
    conn.close()
    return match_dict

def create_match(boy_id, girl_id, initial_notes=""):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute('''
        INSERT INTO matches (boy_id, girl_id, status, meeting_count, current_step_notes, created_at, updated_at)
        VALUES (?, ?, 'idea', 0, ?, ?, ?)
    ''', (boy_id, girl_id, initial_notes, now, now))
    match_id = cursor.lastrowid

    cursor.execute('''
        INSERT INTO match_timeline (match_id, title, notes, status_at_time, created_at)
        VALUES (?, 'יצירת הצעה חדשה', ?, 'idea', ?)
    ''', (match_id, initial_notes or 'נוצרה הצעת שידוך חדשה במערכת', now))

    conn.commit()
    conn.close()
    return get_match(match_id)

def update_match_status(match_id, status, notes="", meeting_count=None, closed_reason=""):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()

    updates = ["status = ?", "updated_at = ?"]
    params = [status, now]

    if notes is not None:
        updates.append("current_step_notes = ?")
        params.append(notes)
    if meeting_count is not None:
        updates.append("meeting_count = ?")
        params.append(meeting_count)
    if closed_reason is not None:
        updates.append("closed_reason = ?")
        params.append(closed_reason)

    params.append(match_id)
    cursor.execute(f"UPDATE matches SET {', '.join(updates)} WHERE id = ?", params)

    status_hebrew_map = {
        'idea': 'רעיון ראשוני / בבדיקה',
        'waiting_girl': 'ממתין לבחורה',
        'waiting_boy': 'ממתינה לבחור',
        'approved': 'אושר על ידי שני הצדדים',
        'meeting_1': 'פגישה ראשונה',
        'meeting_2': 'פגישה שנייה',
        'meeting_3_plus': 'פגישה 3 ומעלה',
        'advanced': 'מתקדם ברצינות',
        'engaged': 'מאורסים! 💍 מזל טוב!',
        'closed': 'לא התאים / ירד מהפרק'
    }
    title = f"עדכון סטטוס: {status_hebrew_map.get(status, status)}"
    cursor.execute('''
        INSERT INTO match_timeline (match_id, title, notes, status_at_time, created_at)
        VALUES (?, ?, ?, ?, ?)
    ''', (match_id, title, notes or (f"סיבה: {closed_reason}" if closed_reason else ''), status, now))

    if status == 'engaged':
        cursor.execute('''
            UPDATE candidates SET status = 'engaged' WHERE id IN (SELECT boy_id FROM matches WHERE id = ?)
        ''', (match_id,))
        cursor.execute('''
            UPDATE candidates SET status = 'engaged' WHERE id IN (SELECT girl_id FROM matches WHERE id = ?)
        ''', (match_id,))

    conn.commit()
    conn.close()
    return get_match(match_id)

def add_match_timeline(match_id, title, notes, meeting_date=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()

    cursor.execute('SELECT status FROM matches WHERE id = ?', (match_id,))
    match = cursor.fetchone()
    current_status = match['status'] if match else 'idea'

    cursor.execute('''
        INSERT INTO match_timeline (match_id, title, notes, meeting_date, status_at_time, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (match_id, title, notes, meeting_date, current_status, now))

    cursor.execute('UPDATE matches SET updated_at = ? WHERE id = ?', (now, match_id))
    conn.commit()
    conn.close()
    return get_match(match_id)

def delete_match(match_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('DELETE FROM matches WHERE id = ?', (match_id,))
    conn.commit()
    conn.close()
    return True

def get_stats():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM candidates")
    total_candidates = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM candidates WHERE gender = 'boy'")
    boys_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM candidates WHERE gender = 'girl'")
    girls_count = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM matches WHERE status NOT IN ('closed', 'engaged')")
    active_matches = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM matches WHERE status = 'engaged'")
    engaged_matches = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM matches WHERE status LIKE 'meeting%' OR status = 'advanced'")
    active_datings = cursor.fetchone()[0]

    conn.close()
    return {
        'total_candidates': total_candidates,
        'boys_count': boys_count,
        'girls_count': girls_count,
        'active_matches': active_matches,
        'engaged_matches': engaged_matches,
        'active_datings': active_datings
    }
