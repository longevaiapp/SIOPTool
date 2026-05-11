#!/usr/bin/env bash
echo "=== HEALTH ==="
curl -s https://siop.juntify.com/api/health
echo
echo "=== ENDPOINT SMOKE TEST ==="
for ep in clients deals contracts projects sprints tasks meetings action-items rfq-sessions suppliers invoices approvals messages support-tickets programs insights siop-scenarios role-capacity demand-forecast risks compliance-controls; do
  printf '%-22s ' "$ep"
  curl -s -o /dev/null -w 'HTTP=%{http_code}\n' "https://siop.juntify.com/api/$ep"
done
