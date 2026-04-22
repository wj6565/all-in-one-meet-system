#!/bin/bash
# Keep-alive + 워밍업 통합 스크립트
BASE="http://localhost:3000"
PAGES="/login /home /booking /admin /tablet /api/auth/me /api/rooms"

while true; do
  for page in $PAGES; do
    curl -s -o /dev/null -m 10 "$BASE$page" 2>/dev/null || true
  done
  sleep 60
done
