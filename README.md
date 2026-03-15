# Julian Interiors Frontend

This frontend is deployed to the Contabo VPS as a Docker container behind the existing Caddy reverse proxy.

## Production deployment

The production container:

- serves the built Vite app on internal port `3000`
- joins the external Docker network `julian-public`
- is reachable by Caddy at `frontend:3000`
- does not bind host ports `80` or `443`

### Required GitHub Actions secrets

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_PATH`
- `DEPLOY_SSH_KEY`

Recommended values:

- `DEPLOY_HOST=109.199.109.99`
- `DEPLOY_PATH=/opt/julian-interiors-frontend`

### One-time server setup

Run these once on the VPS:

```sh
sudo mkdir -p /opt/julian-interiors-frontend
sudo chown -R <deploy-user>:<deploy-user> /opt/julian-interiors-frontend
docker network create julian-public || true
```

On first deployment, `scripts/deploy.sh` creates `.env.production` automatically if it does not exist.

If you want to create it manually in advance, use:

```env
VITE_API_BASE_URL=https://api.julian-interiors.com
VITE_APP_ENV=production
```

### Deployment flow

Every push to `main` triggers `.github/workflows/deploy.yml`, which:

1. connects to the VPS over SSH
2. syncs this repo into `/opt/julian-interiors-frontend`
3. runs `scripts/deploy.sh`
4. builds and starts the frontend with:

```sh
docker compose --env-file .env.production -f docker-compose.prod.yml up -d --build --remove-orphans
```

### Verification

On the server:

```sh
cd /opt/julian-interiors-frontend
docker compose --env-file .env.production -f docker-compose.prod.yml ps
docker logs frontend --tail 100
docker network inspect julian-public
```

From your machine:

```sh
curl -I https://julian-interiors.com
curl -I https://www.julian-interiors.com
curl -I https://api.julian-interiors.com/health
```

The frontend container should be running as `frontend`, attached to `julian-public`, and Caddy should continue proxying `julian-interiors.com` and `www.julian-interiors.com` to `frontend:3000`.
