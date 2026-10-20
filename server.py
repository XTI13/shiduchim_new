import json
import os
import mimetypes
import re
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

import database as db

PORT = int(os.environ.get('PORT', 8080))
STATIC_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static')

# וידוא שקיימות טבלאות
db.init_db()

class ShiduchimHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        # מניעת שמירה במטמון עבור נתוני API וקבצים סטטיים
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_error_json(self, message, status=400):
        self.send_json({'error': message}, status=status)

    def read_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        try:
            raw_data = self.rfile.read(content_length).decode('utf-8')
            return json.loads(raw_data)
        except Exception as e:
            return None

    def get_auth_token(self):
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            return auth_header[7:].strip()
        # אפשרות לשלוף מעוגייה
        cookies = self.headers.get('Cookie', '')
        for c in cookies.split(';'):
            parts = c.strip().split('=')
            if len(parts) == 2 and parts[0] == 'token':
                return parts[1]
        return None

    def get_current_user(self):
        token = self.get_auth_token()
        if not token:
            return None
        return db.get_user_by_session(token)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)
        filters = {k: v[0] for k, v in qs.items()}

        # 1. API Routes
        if path.startswith('/api/'):
            # בדיקת אימות
            user = self.get_current_user()

            if path == '/api/auth/me':
                if user:
                    return self.send_json({'user': user})
                return self.send_json({'user': None})

            # סטטיסטיקות
            if path == '/api/stats':
                stats = db.get_stats()
                return self.send_json(stats)

            # מועמדים
            if path == '/api/candidates':
                candidates = db.get_candidates(filters)
                return self.send_json(candidates)

            # מועמד בודד לפי ID
            candidate_match = re.match(r'^/api/candidates/(\d+)$', path)
            if candidate_match:
                cand_id = int(candidate_match.group(1))
                cand = db.get_candidate(cand_id)
                if cand:
                    return self.send_json(cand)
                return self.send_error_json('מועמד לא נמצא', 404)

            # שידוכים של מועמד
            candidate_matches = re.match(r'^/api/candidates/(\d+)/matches$', path)
            if candidate_matches:
                cand_id = int(candidate_matches.group(1))
                matches = db.get_matches({'candidate_id': cand_id})
                return self.send_json(matches)

            # רשימת שידוכים
            if path == '/api/matches':
                matches = db.get_matches(filters)
                return self.send_json(matches)

            # שידוך בודד
            match_item = re.match(r'^/api/matches/(\d+)$', path)
            if match_item:
                match_id = int(match_item.group(1))
                m = db.get_match(match_id)
                if m:
                    return self.send_json(m)
                return self.send_error_json('שידוך לא נמצא', 404)

            return self.send_error_json('נתיב API לא נמצא', 404)

        # 2. Static Files
        self.serve_static_file(path)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        data = self.read_json_body()
        if data is None:
            return self.send_error_json('קלט JSON לא תקין', 400)

        # התחברות
        if path == '/api/auth/login':
            username = data.get('username', '')
            password = data.get('password', '')
            user = db.authenticate_user(username, password)
            if not user:
                return self.send_error_json('שם משתמש או סיסמה שגויים', 401)
            token = db.create_session(user['id'])
            user_safe = {
                'id': user['id'],
                'username': user['username'],
                'full_name': user['full_name']
            }
            return self.send_json({'token': token, 'user': user_safe})

        # התנתקות
        if path == '/api/auth/logout':
            token = self.get_auth_token()
            if token:
                db.delete_session(token)
            return self.send_json({'ok': True})

        # יצירת מועמד חדש (דרך המערכת או שאלון ציבורי)
        if path in ('/api/candidates', '/api/candidates/public'):
            if not data.get('name'):
                return self.send_error_json('נא למלא שם מלא עבור המועמד', 400)
            candidate = db.add_candidate(data)
            return self.send_json(candidate, 201)

        # יצירת שידוך חדש
        if path == '/api/matches':
            boy_id = data.get('boy_id')
            girl_id = data.get('girl_id')
            notes = data.get('initial_notes', '')
            if not boy_id or not girl_id:
                return self.send_error_json('יש לבחור בחור ובחורה ליצירת שידוך', 400)
            
            # בדיקה אם כבר קיים שידוך פעיל בין השניים
            existing = db.get_matches({'candidate_id': boy_id})
            for m in existing:
                if (m['boy_id'] == int(boy_id) and m['girl_id'] == int(girl_id)) or \
                   (m['boy_id'] == int(girl_id) and m['girl_id'] == int(boy_id)):
                    if m['status'] not in ('closed', 'engaged'):
                        return self.send_error_json('כבר קיים שידוך פעיל בין מועמדים אלו', 400)

            match = db.create_match(boy_id, girl_id, notes)
            return self.send_json(match, 201)

        # הוספת הערת פגישה / מעקב לציר הזמן של שידוך
        timeline_match = re.match(r'^/api/matches/(\d+)/timeline$', path)
        if timeline_match:
            match_id = int(timeline_match.group(1))
            title = data.get('title', 'עדכון פגישה')
            notes = data.get('notes', '')
            meeting_date = data.get('meeting_date')
            updated = db.add_match_timeline(match_id, title, notes, meeting_date)
            return self.send_json(updated)

        return self.send_error_json('נתיב לא קיים', 404)

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        data = self.read_json_body()
        if data is None:
            return self.send_error_json('קלט JSON לא תקין', 400)

        # עדכון פרטי מועמד
        candidate_match = re.match(r'^/api/candidates/(\d+)$', path)
        if candidate_match:
            cand_id = int(candidate_match.group(1))
            cand = db.get_candidate(cand_id)
            if not cand:
                return self.send_error_json('מועמד לא נמצא', 404)
            updated = db.update_candidate(cand_id, data)
            return self.send_json(updated)

        # עדכון סטטוס שידוך ופרטיו
        match_item = re.match(r'^/api/matches/(\d+)$', path)
        if match_item:
            match_id = int(match_item.group(1))
            status = data.get('status')
            notes = data.get('notes', '')
            meeting_count = data.get('meeting_count')
            closed_reason = data.get('closed_reason', '')
            if not status:
                return self.send_error_json('חובה לציין סטטוס לשידוך', 400)
            updated = db.update_match_status(match_id, status, notes, meeting_count, closed_reason)
            return self.send_json(updated)

        return self.send_error_json('נתיב לא קיים', 404)

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # מחיקת מועמד
        candidate_match = re.match(r'^/api/candidates/(\d+)$', path)
        if candidate_match:
            cand_id = int(candidate_match.group(1))
            db.delete_candidate(cand_id)
            return self.send_json({'ok': True, 'message': 'המועמד נמחק בהצלחה'})

        # מחיקת שידוך
        match_item = re.match(r'^/api/matches/(\d+)$', path)
        if match_item:
            match_id = int(match_item.group(1))
            db.delete_match(match_id)
            return self.send_json({'ok': True, 'message': 'השידוך נמחק בהצלחה'})

        return self.send_error_json('נתיב לא קיים', 404)

    def serve_static_file(self, req_path):
        if req_path == '/' or not req_path:
            req_path = '/index.html'
        elif req_path in ('/join', '/join/'):
            req_path = '/join.html'

        # נטרול ניסיונות path traversal
        clean_path = os.path.normpath(req_path.lstrip('/'))
        full_path = os.path.join(STATIC_DIR, clean_path)

        # אם הנתיב הוא ספרייה, חפש index.html
        if os.path.isdir(full_path):
            full_path = os.path.join(full_path, 'index.html')

        if not os.path.exists(full_path):
            # Fallback ל-index.html עבור SPA
            full_path = os.path.join(STATIC_DIR, 'index.html')

        if not os.path.exists(full_path):
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'404 Not Found')
            return

        mime_type, _ = mimetypes.guess_type(full_path)
        if not mime_type:
            if full_path.endswith('.js'):
                mime_type = 'application/javascript'
            elif full_path.endswith('.css'):
                mime_type = 'text/css'
            elif full_path.endswith('.svg'):
                mime_type = 'image/svg+xml'
            else:
                mime_type = 'text/html'

        with open(full_path, 'rb') as f:
            content = f.read()

        self.send_response(200)
        self.send_header('Content-Type', f"{mime_type}; charset=utf-8" if 'text' in mime_type or 'javascript' in mime_type else mime_type)
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        self.wfile.write(content)

def run():
    server_address = ('', PORT)
    httpd = ThreadingHTTPServer(server_address, ShiduchimHandler)
    print(f"🚀 שרת שידוכים החל לפעול על: http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nהשרת נעצר.")
        httpd.server_close()

if __name__ == '__main__':
    run()
