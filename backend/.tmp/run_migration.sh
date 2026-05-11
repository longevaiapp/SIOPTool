#!/bin/bash
set -e
cd /var/www/sioptool/backend
get_var() { grep -E "^$1=" .env | head -1 | cut -d= -f2- | tr -d '\r\n'; }
DB_HOST=$(get_var DB_HOST)
DB_PORT=$(get_var DB_PORT)
DB_USER=$(get_var DB_USER)
DB_PASSWORD=$(get_var DB_PASSWORD)
DB_NAME=$(get_var DB_NAME)
: "${DB_PORT:=3306}"
echo "Connecting to $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < migrations/006_auth.sql
echo MIGRATION_OK
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW COLUMNS FROM users LIKE 'password_hash'; SHOW COLUMNS FROM users LIKE 'is_active'; SHOW TABLES LIKE 'auth_refresh_tokens';"
