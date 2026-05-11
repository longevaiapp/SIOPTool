#!/usr/bin/env bash
set -e
ID=$(curl -s https://siop.juntify.com/api/clients | python3 -c 'import sys,json; print(json.load(sys.stdin)[0]["id"])')
echo "ID=$ID"
echo "--- PATCH ---"
echo '{"health_score":92,"status":"ACTIVE"}' > /tmp/p.json
curl -s -X PATCH "https://siop.juntify.com/api/clients/$ID" -H 'Content-Type: application/json' --data-binary @/tmp/p.json
echo
echo "--- GET ---"
curl -s "https://siop.juntify.com/api/clients/$ID"
echo
echo "--- DELETE ---"
curl -s -o /dev/null -w 'STATUS=%{http_code}\n' -X DELETE "https://siop.juntify.com/api/clients/$ID"
echo "--- LIST after delete ---"
curl -s https://siop.juntify.com/api/clients
echo
echo "--- AUDIT LOG ---"
mysql siop_demo -e 'SELECT action, module, record_id FROM audit_log ORDER BY created_at;'
