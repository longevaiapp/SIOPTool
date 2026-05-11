#!/bin/bash
echo "=== git history of backend/.env ==="
cd /var/www/sioptool 2>/dev/null && git log --all --oneline -- backend/.env 2>/dev/null | head -5
cd /var/www/sioptool/backend 2>/dev/null && git log --all --oneline -- .env 2>/dev/null | head -5
echo ""
echo "=== .env backup files ==="
find /var/www/sioptool -maxdepth 4 -name '.env*.bak' -o -name '.env.*' 2>/dev/null
echo ""
echo "=== files modified recently in backend/ ==="
ls -lat /var/www/sioptool/backend/.env* 2>/dev/null
echo ""
echo "=== any sk- pattern anywhere on the box (excl venv/node_modules) ==="
grep -rn 'sk-proj\|sk-[A-Za-z0-9]\{20,\}' /var/www /root /etc 2>/dev/null \
  | grep -v node_modules | grep -v '\.venv' | grep -v __pycache__ | head -20
