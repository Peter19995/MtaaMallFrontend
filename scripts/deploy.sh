#!/usr/bin/env bash
set -euo pipefail
APP_DIR="${APP_DIR:-/opt/mtaamall/frontend}"
APP_ROOT="${APP_ROOT:-/opt/mtaamall}"
PROJECT_NAME="mtaamall"
SCOPE="mtaa-frontend"
build=true
case "${1:-}" in
  "") ;;
  --no-build) build=false ;;
  *) echo "Usage: $0 [--no-build]" >&2; exit 2 ;;
esac
cd "$APP_DIR"
test -f "$APP_ROOT/.env"
exec 8>/var/lock/mtaamall-app-deploy.lock
flock -n 8 || { echo "Another component deployment is running." >&2; exit 75; }
compose=(docker compose --project-name "$PROJECT_NAME" -f "$APP_ROOT/docker-compose.yml")
state="$(mktemp)"
trap 'rm -f "$state"' EXIT
python3 scripts/deployment_guard.py snapshot "$state" "$SCOPE"
"${compose[@]}" config --quiet
if $build; then "${compose[@]}" build frontend; fi
python3 scripts/deployment_guard.py verify "$state" "$SCOPE"
"${compose[@]}" up -d --no-deps --no-build frontend
ready=false
for attempt in {1..60}; do
  if curl -fsS --max-time 10 https://mtaamall.com/ >/dev/null; then ready=true; break; fi
  sleep 2
done
$ready || { echo "Application health check failed." >&2; exit 1; }
for container in mtaamall-frontend; do
  for ready_attempt in {1..30}; do
    state_now="$(docker inspect --format '{{.State.Running}} {{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container")"
    [[ "$state_now" == "true none" || "$state_now" == "true healthy" ]] && break
    sleep 2
  done
  [[ "$state_now" == "true none" || "$state_now" == "true healthy" ]] || { echo "$container is not ready: $state_now" >&2; exit 1; }
done
python3 scripts/deployment_guard.py verify "$state" "$SCOPE"
echo "Deployment healthy; shared proxy, infrastructure and other components unchanged."
