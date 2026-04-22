#!/bin/bash
# 서버 워밍업 - 주요 페이지 미리 컴파일
BASE="http://localhost:3000"
echo "Warming up pages..."
curl -s -o /dev/null "$BASE/login"
curl -s -o /dev/null "$BASE/home"
curl -s -o /dev/null "$BASE/booking"
curl -s -o /dev/null "$BASE/admin"
curl -s -o /dev/null "$BASE/api/auth/me"
echo "Warmup complete."
