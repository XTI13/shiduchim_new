from database import init_db, create_user, add_candidate, get_candidates

def seed():
    init_db()
    
    # 1. יצירת משתמש מנהל / שדכן
    admin = create_user("123", "123", "יצחק וליאן בטיטו שידוכים")
    if admin:
        print(f"Created admin user: {admin['username']} / 123")
    else:
        print("Admin user already exists")

    # 2. הוספת המועמד האמיתי שהמשתמש ביקש בלבד (אם טרם קיים)
    existing = get_candidates({"search": "אור החיים כהן"})
    if not existing:
        real_candidate = {
            "name": "אור החיים כהן",
            "gender": "boy",
            "origin": "מרוקאי ועיראקי",
            "age": 22,
            "birth_date": "2004-03-15",
            "height": 1.72,
            "build": "רגיל",
            "marital_status": "רווק/ה",
            "city": "גני תקווה",
            "hashkafa": "חרדי",
            "family_description": "משפחה דתיה חמה ואוהבת",
            "military_service": "ישיבה 6 שנים",
            "occupation": "ישיבה, אחרי חתונה שואף להיות אברך, אבל עם ראש על הכתפיים לעבוד במידת הצורך..",
            "about_me": "אני בחור מאוד אכפתי ומכבד, שחשוב לו מאוד הקשר עם בורא עולם ושמירה על תורה ומצוות ואורח חיים חרדי. אני רוצה לבנות זוגיות בריאה ולעשות את אשתי מאושרת, ולבנות בית נאמן בישראל שעובד את בורא עולם מתוך אהבה אמיתית בלי להתפשר ובלי לעגל פינות..",
            "looking_for": "בחורה צנועה עם יראת שמים, שנראית טוב, עם שמחת חיים ואהבת התורה, ששואפת להקים בית אמיתי וערכי, ושכמובן אנחנו רואים את אותו כיוון לעתיד שלנו ביחד בעזרת השם.",
            "shomer_negiah": "כן",
            "smoker": "לא",
            "phone_type": "כשר",
            "contact_phone": "",
            "referrals": "",
            "status": "available",
            "internal_notes": ""
        }
        res = add_candidate(real_candidate)
        print(f"Added real candidate: {res['name']} (ID: {res['id']})")
    else:
        print("Real candidate already exists")

if __name__ == '__main__':
    seed()
