#!/usr/bin/env sh
set -eu

DEPLOY_PATH="${DEPLOY_PATH:-/opt/mtaamall-frontend}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
NETWORK_NAME="mtaamall-public"

cd "$DEPLOY_PATH"

if [ ! -f "$ENV_FILE" ]; then
  cp .env.production.example "$ENV_FILE"
fi

API_BASE_URL="$(awk -F= '/^VITE_API_BASE_URL=/{print $2}' "$ENV_FILE" | tail -n 1)"

if [ -z "$API_BASE_URL" ]; then
  echo "VITE_API_BASE_URL is not set in $ENV_FILE"
  exit 1
fi

case "$API_BASE_URL" in
  *localhost*|*127.0.0.1*)
    echo "Refusing to deploy with local API base URL: $API_BASE_URL"
    echo "Set VITE_API_BASE_URL=https://api.mtaamall.com/api/v1 in $ENV_FILE"
    exit 1
    ;;
esac

if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
  echo "Required Docker network '$NETWORK_NAME' does not exist."
  echo "Create it once with: docker network create $NETWORK_NAME"
  exit 1
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --remove-orphans

docker image prune -f >/dev/null 2>&1 || true
