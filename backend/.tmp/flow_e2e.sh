#!/usr/bin/env bash
set -e
API="https://siop.juntify.com/api"
H='Content-Type: application/json'
say(){ echo; echo "=== $1 ==="; }

say "1. CREATE CLIENT"
CID=$(curl -s -X POST $API/clients -H "$H" -d '{"name":"Acme Health Co","industry":"Healthcare","segment":"STRATEGIC","status":"PROSPECT","health_score":85}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "client_id=$CID"

say "2. CREATE DEAL FOR CLIENT"
DID=$(curl -s -X POST $API/deals -H "$H" -d "{\"client_id\":\"$CID\",\"client_name\":\"Acme Health Co\",\"deal_type\":\"NEW_BUSINESS\",\"stage\":\"discovery\",\"value\":150000,\"probability\":40,\"commercial_model\":\"FIXED_PRICE\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "deal_id=$DID"

say "3. CREATE RFQ FOR DEAL"
RID=$(curl -s -X POST $API/rfq-sessions -H "$H" -d "{\"deal_id\":\"$DID\",\"client_id\":\"$CID\",\"completion_pct\":75,\"status\":\"in_progress\",\"responses\":{\"q1\":\"yes\",\"q2\":\"no\"}}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "rfq_id=$RID"

say "4. CREATE CONTRACT (HIPAA + BAA)"
KID=$(curl -s -X POST $API/contracts -H "$H" -d "{\"contract_type\":\"BAA\",\"title\":\"Acme MSA + BAA\",\"client_id\":\"$CID\",\"deal_id\":\"$DID\",\"status\":\"SIGNED\",\"value\":150000,\"hipaa_required\":true,\"baa_signed\":true}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "contract_id=$KID"

say "5. TRY PROJECT (PHI=true, BAA=false, status=active) -> MUST FAIL"
RESP=$(curl -s -o /tmp/resp.txt -w '%{http_code}' -X POST $API/projects -H "$H" -d "{\"name\":\"Care AI\",\"client_name\":\"Acme\",\"client_id\":\"$CID\",\"deal_id\":\"$DID\",\"contract_id\":\"$KID\",\"status\":\"active\",\"phi_involved\":true,\"baa_confirmed\":false}")
echo "HTTP=$RESP"; cat /tmp/resp.txt

say "6. CREATE PROJECT (PHI=true, BAA=true, status=active) -> SUCCESS"
PID=$(curl -s -X POST $API/projects -H "$H" -d "{\"name\":\"Care AI\",\"client_name\":\"Acme\",\"client_id\":\"$CID\",\"deal_id\":\"$DID\",\"contract_id\":\"$KID\",\"status\":\"active\",\"phi_involved\":true,\"baa_confirmed\":true,\"methodology\":\"scrum\",\"budget\":150000,\"phase\":\"discovery\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "project_id=$PID"

say "7. CREATE SPRINT + TASK"
SPID=$(curl -s -X POST $API/sprints -H "$H" -d "{\"project_id\":\"$PID\",\"name\":\"Sprint 1\",\"status\":\"ACTIVE\",\"story_points_planned\":21}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "sprint_id=$SPID"
TID=$(curl -s -X POST $API/tasks -H "$H" -d "{\"project_id\":\"$PID\",\"sprint_id\":\"$SPID\",\"title\":\"Setup HIPAA logging\",\"task_type\":\"COMPLIANCE\",\"status\":\"in_progress\",\"is_clinical_safety\":true}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "task_id=$TID"

say "8. MEETING + ACTION ITEM"
MID=$(curl -s -X POST $API/meetings -H "$H" -d "{\"title\":\"Kickoff\",\"meeting_type\":\"kickoff\",\"client_id\":\"$CID\",\"project_id\":\"$PID\",\"status\":\"ANALYZED\",\"duration_minutes\":45}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "meeting_id=$MID"
AIID=$(curl -s -X POST $API/action-items -H "$H" -d "{\"meeting_id\":\"$MID\",\"text\":\"Review HIPAA policy\",\"priority\":\"HIGH\",\"accepted\":true}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "action_item_id=$AIID"

say "9. INVOICE + APPROVAL + MESSAGE + TICKET"
IID=$(curl -s -X POST $API/invoices -H "$H" -d "{\"number\":\"INV-001\",\"client_id\":\"$CID\",\"project_id\":\"$PID\",\"contract_id\":\"$KID\",\"amount\":50000,\"currency\":\"USD\",\"status\":\"SENT\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "invoice_id=$IID"
APID=$(curl -s -X POST $API/approvals -H "$H" -d "{\"title\":\"Sprint 1 demo\",\"approval_type\":\"DELIVERABLE\",\"client_id\":\"$CID\",\"project_id\":\"$PID\",\"status\":\"PENDING\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "approval_id=$APID"
MSGID=$(curl -s -X POST $API/messages -H "$H" -d "{\"client_id\":\"$CID\",\"project_id\":\"$PID\",\"sender_name\":\"Demo User\",\"sender_role\":\"INTERNAL\",\"body\":\"Welcome to the project portal.\"}" | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "message_id=$MSGID"

say "10. PROGRAM + LINK PROJECT"
PRID=$(curl -s -X POST $API/programs -H "$H" -d '{"name":"Healthcare AI Portfolio","strategic_priority":"P0","status":"ON_TRACK","progress":25,"portfolio_value":1500000}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
echo "program_id=$PRID"
curl -s -o /dev/null -w 'link_status=%{http_code}\n' -X POST $API/programs/$PRID/projects -H "$H" -d "{\"program_id\":\"$PRID\",\"project_id\":\"$PID\"}"

say "11. AUDIT LOG ROW COUNT"
mysql siop_demo -e 'SELECT module, COUNT(*) AS rows_per_module FROM audit_log GROUP BY module ORDER BY module;'
mysql siop_demo -e 'SELECT COUNT(*) AS total_audit_rows FROM audit_log;'
echo "DONE."
