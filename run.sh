#!/usr/bin/env bash
# run.sh - تشغيل تطبيق AI Talker محلياً (الباك اند والواجهة الأمامية معاً)
#
# الاستخدام:
#   ./run.sh
#   BACKEND_PORT=8010 FRONTEND_PORT=8011 ./run.sh   # لتغيير المنافذ إذا كانت مستخدمة من مشروع آخر
#
# يشغّل سيرفر Django وسيرفر الواجهة الأمامية الثابت معاً، ويوقف الاثنين
# عند الضغط على Ctrl+C.

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_PORT="${BACKEND_PORT:-8003}"
FRONTEND_PORT="${FRONTEND_PORT:-8004}"

if [ ! -d "$BACKEND_DIR/venv" ]; then
    echo "❌ لم يتم العثور على البيئة الافتراضية في backend/venv"
    echo "   قم بإنشائها أولاً:"
    echo "     cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

port_in_use() {
    (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null && { exec 3<&-; exec 3>&-; return 0; } || return 1
}

if port_in_use "$BACKEND_PORT"; then
    echo "❌ المنفذ $BACKEND_PORT مستخدم بالفعل من برنامج آخر (قد يكون مشروعاً آخر يعمل حالياً)."
    echo "   شغّل السكريبت بمنفذ مختلف، مثلاً: BACKEND_PORT=8010 ./run.sh"
    exit 1
fi
if port_in_use "$FRONTEND_PORT"; then
    echo "❌ المنفذ $FRONTEND_PORT مستخدم بالفعل من برنامج آخر (قد يكون مشروعاً آخر يعمل حالياً)."
    echo "   شغّل السكريبت بمنفذ مختلف، مثلاً: FRONTEND_PORT=8011 ./run.sh"
    exit 1
fi

cleanup() {
    echo ""
    echo "⏹️  إيقاف الخوادم..."
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
    wait 2>/dev/null
    echo "✅ تم الإيقاف."
}
trap cleanup EXIT INT TERM

echo "🚀 تشغيل الباك اند (Django) على المنفذ $BACKEND_PORT..."
(
    cd "$BACKEND_DIR"
    source venv/bin/activate
    python manage.py runserver "0.0.0.0:$BACKEND_PORT"
) &
BACKEND_PID=$!

echo "🚀 تشغيل الواجهة الأمامية على المنفذ $FRONTEND_PORT..."
(
    cd "$FRONTEND_DIR"
    python3 -m http.server "$FRONTEND_PORT"
) &
FRONTEND_PID=$!

echo ""
echo "✅ التطبيق يعمل الآن:"
echo "   الباك اند:      http://localhost:$BACKEND_PORT/api/health/"
echo "   الواجهة الأمامية: http://localhost:$FRONTEND_PORT"
echo ""
echo "اضغط Ctrl+C لإيقاف الخادمين."

wait
