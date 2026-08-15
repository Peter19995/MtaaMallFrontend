# MtaaMall Frontend

This frontend is deployed to the Contabo VPS as a Docker container behind the existing Caddy reverse proxy.

## Production deployment

The production container:

- serves the built Vite app on internal port `3000`
- joins the external Docker network `mtaamall-public`
- is reachable by Caddy at `frontend:3000`
- does not bind host ports `80` or `443`

### Required GitHub Actions secrets

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_SSH_KEY`

Recommended values:

- `DEPLOY_HOST=109.199.109.99`
- `DEPLOY_PATH=/opt/mtaamall-frontend`

### One-time server setup

Run these once on the VPS:

```sh
sudo mkdir -p /opt/mtaamall-frontend
sudo chown -R <deploy-user>:<deploy-user> /opt/mtaamall-frontend
docker network create mtaamall-public || true
```

On first deployment, `scripts/deploy.sh` creates `.env.production` automatically if it does not exist.

If you want to create it manually in advance, use:

```env
VITE_API_BASE_URL=https://api.mtaamall.com/api/v1
VITE_APP_ENV=production
```

### Deployment flow

Every push to `main` triggers `.github/workflows/deploy.yml`, which:

1. connects to the VPS over SSH
2. syncs this repo into `/opt/mtaamall-frontend`
3. runs `scripts/deploy.sh`
4. builds and starts the frontend with:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build --remove-orphans
```

### Verification

On the server:

```sh
cd /opt/mtaamall-frontend
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker logs frontend --tail 100
docker network inspect mtaamall-public
```

From your machine:

```sh
curl -I https://mtaamall.com
curl -I https://www.mtaamall.com
curl -I https://api.mtaamall.com/health
```

The frontend container should be running as `frontend`, attached to `mtaamall-public`, and Caddy should continue proxying `mtaamall.com` and `www.mtaamall.com` to `frontend:3000`.
