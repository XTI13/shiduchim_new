import unittest
import json
import io
import os
import database as db
from server import ShiduchimHandler

class MockSocket:
    def __init__(self, request_bytes):
        self.rfile = io.BytesIO(request_bytes)
        self.output = io.BytesIO()

    def makefile(self, mode, *args, **kwargs):
        if 'r' in mode:
            return self.rfile
        return self.output

    def sendall(self, data):
        self.output.write(data)

    def close(self):
        pass

class MockServer:
    def __init__(self):
        self.server_name = 'localhost'
        self.server_port = 8080

def execute_request(method, path, body=None, headers=None):
    if headers is None:
        headers = {}
    
    body_bytes = b''
    if body is not None:
        if isinstance(body, (dict, list)):
            body_bytes = json.dumps(body).encode('utf-8')
            headers['Content-Type'] = 'application/json'
        elif isinstance(body, str):
            body_bytes = body.encode('utf-8')
        elif isinstance(body, bytes):
            body_bytes = body
        headers['Content-Length'] = str(len(body_bytes))

    lines = [f"{method} {path} HTTP/1.1", f"Host: localhost"]
    for k, v in headers.items():
        lines.append(f"{k}: {v}")
    lines.append("")
    lines.append("")
    
    req_header_bytes = "\r\n".join(lines).encode('utf-8')
    raw_input = req_header_bytes + body_bytes

    sock = MockSocket(raw_input)
    handler = ShiduchimHandler(sock, ('127.0.0.1', 12345), MockServer())

    # קריאת התגובה מ-output
    response_bytes = sock.output.getvalue()
    if not response_bytes:
        return 500, {}

    header_part, _, body_part = response_bytes.partition(b'\r\n\r\n')
    header_lines = header_part.decode('utf-8', errors='ignore').split('\r\n')
    status_line = header_lines[0]
    parts = status_line.split(' ', 2)
    status_code = int(parts[1]) if len(parts) > 1 else 500

    resp_headers = {}
    for line in header_lines[1:]:
        if ':' in line:
            hk, hv = line.split(':', 1)
            resp_headers[hk.strip().lower()] = hv.strip()

    try:
        parsed_body = json.loads(body_part.decode('utf-8'))
    except Exception:
        parsed_body = body_part.decode('utf-8', errors='ignore')

    return status_code, parsed_body

class ShiduchimAppTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db.init_db()

    def test_01_static_serving(self):
        status, body = execute_request('GET', '/')
        self.assertEqual(status, 200)
        self.assertIn('שידוכים Studio', body)

        status, body = execute_request('GET', '/join')
        self.assertEqual(status, 200)
        self.assertIn('שאלון הצטרפות למאגר שידוכים', body)

        status, body = execute_request('GET', '/css/apple-theme.css')
        self.assertEqual(status, 200)
        self.assertIn('--font-family', body)

        status, body = execute_request('GET', '/js/app.js')
        self.assertEqual(status, 200)
        self.assertIn('class App', body)

    def test_02_auth_and_login(self):
        # התחברות עם משתמש 123
        status, res = execute_request('POST', '/api/auth/login', {
            'username': '123',
            'password': '123'
        })
        self.assertEqual(status, 200)
        self.assertIn('token', res)
        self.assertIn('user', res)
        self.assertEqual(res['user']['username'], '123')

        # בדיקת סיסמה שגויה
        bad_status, bad_res = execute_request('POST', '/api/auth/login', {
            'username': '123',
            'password': 'wrongpassword'
        })
        self.assertEqual(bad_status, 401)
        self.assertIn('error', bad_res)

    def test_03_candidate_crud(self):
        # 1. יצירת מועמד חדש
        candidate_payload = {
            "name": "משה ישראלי",
            "gender": "boy",
            "origin": "ספרדי",
            "age": 25,
            "height": 1.78,
            "build": "רגיל",
            "marital_status": "רווק/ה",
            "city": "ירושלים",
            "hashkafa": "חרדי",
            "family_description": "משפחה חמה ותומכת",
            "military_service": "ישיבה",
            "occupation": "אברך",
            "about_me": "בחור רציני, שמח ואכפתי",
            "looking_for": "בחורה בעלת מידות טובות",
            "shomer_negiah": "כן",
            "smoker": "לא",
            "phone_type": "כשר",
            "contact_phone": "050-0000000",
            "referrals": "הרב לוי",
            "status": "available",
            "internal_notes": "הערה פנימית לבדיקה"
        }
        status, created = execute_request('POST', '/api/candidates', candidate_payload)
        self.assertEqual(status, 201)
        self.assertEqual(created['name'], "משה ישראלי")
        cand_id = created['id']

        # 2. שליפת המועמד
        status, fetched = execute_request('GET', f'/api/candidates/{cand_id}')
        self.assertEqual(status, 200)
        self.assertEqual(fetched['name'], "משה ישראלי")
        self.assertEqual(fetched['height'], 1.78)

        # 3. עדכון פרטים
        candidate_payload['city'] = "בני ברק"
        candidate_payload['age'] = 26
        status, updated = execute_request('PUT', f'/api/candidates/{cand_id}', candidate_payload)
        self.assertEqual(status, 200)
        self.assertEqual(updated['city'], "בני ברק")
        self.assertEqual(updated['age'], 26)

        # 4. מחיקת המועמד
        status, del_res = execute_request('DELETE', f'/api/candidates/{cand_id}')
        self.assertEqual(status, 200)
        self.assertTrue(del_res['ok'])

        # וידוא שלא נמצא
        status, _ = execute_request('GET', f'/api/candidates/{cand_id}')
        self.assertEqual(status, 404)

    def test_04_matches_workflow(self):
        # יצירת מועמדים זמניים לבדיקה
        _, test_boy = execute_request('POST', '/api/candidates', {'name': 'בחור בדיקה', 'gender': 'boy'})
        _, test_girl = execute_request('POST', '/api/candidates', {'name': 'בחורה בדיקה', 'gender': 'girl'})
        boy_id = test_boy['id']
        girl_id = test_girl['id']

        # יצירת שידוך
        status, match = execute_request('POST', '/api/matches', {
            'boy_id': boy_id,
            'girl_id': girl_id,
            'initial_notes': 'בדיקת התאמה עבור טסט'
        })
        self.assertEqual(status, 201)
        match_id = match['id']
        self.assertEqual(match['status'], 'idea')

        # עדכון שלב לפגישה 1
        status, updated_match = execute_request('PUT', f'/api/matches/{match_id}', {
            'status': 'meeting_1',
            'notes': 'נפגשו במלון, השיחה זרמה',
            'meeting_count': 1
        })
        self.assertEqual(status, 200)
        self.assertEqual(updated_match['status'], 'meeting_1')
        self.assertEqual(updated_match['meeting_count'], 1)

        # הוספת הערה לציר הזמן
        status, timeline_res = execute_request('POST', f'/api/matches/{match_id}/timeline', {
            'title': 'סיכום פגישה 1',
            'notes': 'שני הצדדים הביעו עניין להמשיך לפגישה 2',
            'meeting_date': '2026-10-16'
        })
        self.assertEqual(status, 200)
        self.assertTrue(len(timeline_res['timeline']) >= 2)

        # בדיקת סטטיסטיקות
        status, stats = execute_request('GET', '/api/stats')
        self.assertEqual(status, 200)
        self.assertTrue(stats['active_matches'] > 0)

        # מחיקת שידוך ומועמדי בדיקה
        status, del_res = execute_request('DELETE', f'/api/matches/{match_id}')
        self.assertEqual(status, 200)
        execute_request('DELETE', f'/api/candidates/{boy_id}')
        execute_request('DELETE', f'/api/candidates/{girl_id}')

    def test_05_public_candidate_registration(self):
        payload = {
            "name": "שירה כהן",
            "gender": "girl",
            "age": 21,
            "city": "פתח תקווה",
            "hashkafa": "חרדי"
        }
        status, res = execute_request('POST', '/api/candidates/public', payload)
        self.assertEqual(status, 201)
        self.assertEqual(res['name'], "שירה כהן")
        self.assertEqual(res['status'], "available")

        # Cleanup
        execute_request('DELETE', f"/api/candidates/{res['id']}")

if __name__ == '__main__':
    unittest.main()
