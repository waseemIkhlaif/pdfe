#!/bin/sh
# Runs once, on first start of an empty data directory, as the Postgres superuser.
# Creates the four database roles and the database. Passwords come from the container environment.
set -eu

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres <<SQL
CREATE ROLE migrator_role LOGIN PASSWORD '${MIGRATOR_PASSWORD}';
CREATE ROLE app_role LOGIN NOBYPASSRLS PASSWORD '${APP_ROLE_PASSWORD}';
CREATE ROLE readonly_role LOGIN NOBYPASSRLS PASSWORD '${READONLY_PASSWORD}';
-- Used only by the scenario engine: the API connects as app_role and does SET LOCAL ROLE demo_reset_role.
CREATE ROLE demo_reset_role NOLOGIN NOBYPASSRLS;
GRANT demo_reset_role TO app_role;
CREATE DATABASE pdfe OWNER migrator_role;
SQL
