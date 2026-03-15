#!/usr/bin/env sh
set -eu

DEPLOY_PATH="${DEPLOY_PATH:-/opt/julian-interiors-frontend}"
COMPOSE_FILE="docker-compose.prod.yml"
ENV_FILE=".env.production"
NETWORK_NAME="julian-public"

cd "$DEPLOY_PATH"

if [ ! -f "$ENV_FILE" ]; then
  cp .env.production.example "$ENV_FILE"
fi

if ! docker network inspect "$NETWORK_NAME" >/dev/null 2>&1; then
  echo "Required Docker network '$NETWORK_NAME' does not exist."
  echo "Create it once with: docker network create $NETWORK_NAME"
  exit 1
fi

docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" up -d --build --remove-orphans

docker image prune -f >/dev/null 2>&1 || true
