#!/bin/bash
set -e
ENV_FILE=/etc/sioptool/backend.env
if grep -q '^JWT_SECRET=' "$ENV_FILE"; then
  echo "JWT_SECRET already present — leaving as is"
else
  SECRET=$(openssl rand -hex 48)
  printf '\nJWT_SECRET=%s\nJWT_ACCESS_TOKEN_MINUTES=30\nJWT_REFRESH_TOKEN_DAYS=14\nJWT_ISSUER=siop-tool\n' "$SECRET" >> "$ENV_FILE"
  echo "JWT_SECRET generated (96 hex chars)"
fi
chmod 600 "$ENV_FILE"
echo "--- final JWT_* keys ---"
grep -E '^JWT_' "$ENV_FILE" | sed 's/=.*/=<set>/'
