#!/bin/bash
set -e
cd /var/www/sioptool/backend
get_var() { grep -E "^$1=" .env | head -1 | cut -d= -f2- | tr -d '\r\n'; }
DB_HOST=$(get_var DB_HOST); DB_PORT=$(get_var DB_PORT); DB_USER=$(get_var DB_USER)
DB_PASSWORD=$(get_var DB_PASSWORD); DB_NAME=$(get_var DB_NAME)
: "${DB_PORT:=3306}"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "$1"
