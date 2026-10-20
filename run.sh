#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "================================================="
echo "    💍 שידוכים Studio - מערכת ניהול שידוכים"
echo "================================================="
echo ""

# וידוא מסד נתונים וזריעת נתונים אם לא קיים
if [ ! -f "$DIR/shiduchim.db" ]; then
    echo "מאתחל מסד נתונים ונתוני פתיחה..."
    /usr/bin/python3 "$DIR/seed_data.py"
fi

echo "מפעיל את השרת על http://localhost:8080..."
echo "שם משתמש: 123"
echo "סיסמה: 123"
echo ""

# הפעלת קישור ציבורי לאינטרנט אם cloudflared קיים
if [ -x "$DIR/cloudflared" ]; then
    echo "מפעיל חיבור מאובטח לאינטרנט (Cloudflare Tunnel)..."
    "$DIR/cloudflared" tunnel --url http://localhost:8080 > "$DIR/tunnel.log" 2>&1 &
    TUNNEL_PID=$!
    trap "kill $TUNNEL_PID 2>/dev/null" EXIT
    (
      sleep 3
      URL=$(grep -o "https://[a-zA-Z0-9.-]*\.trycloudflare\.com" "$DIR/tunnel.log" | head -n 1)
      if [ -n "$URL" ]; then
          echo ""
          echo "================================================="
          echo " 🌐 כתובת ציבורית לאינטרנט (לפתיחה מכל מקום):"
          echo "    $URL"
          echo "================================================="
          echo ""
      fi
    ) &
fi

# פתיחת דפדפן בעוד שניה
(sleep 1 && open "http://localhost:8080") &

# הרצת שרת הפייתון
/usr/bin/python3 "$DIR/server.py"
