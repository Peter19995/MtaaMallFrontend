# Isolated application deployments

Routine releases use `scripts/deploy.sh`; `--no-build` reapplies current images for recovery or verification and skips migrations. Default releases build first. MtaaMall API retains its pre-replacement Alembic migration; Keja Zone retains migrations in its existing API startup command.

Only the selected component is updated, always with `--no-deps --no-build`. No shared Caddy reload/restart, database or Redis update, shared network creation, global image pruning, orphan removal or routine database credential/session recovery is performed. Infrastructure changes require a separate coordinated operation. Existing named data volumes and private Redis configuration are retained.

Read-only guards record other running containers' IDs, images, start times and restart counts, plus hashes of the live and host-managed shared proxy configuration. Verification before replacement and after readiness fails visibly on changes. This detects accidental changes; it is not an authorization boundary or automatic rollback. Concurrent unrelated releases can correctly trigger the guard; rerun after checking those releases.

Component locks serialize updates. MtaaMall uses its existing `/opt/mtaamall/docker-compose.yml` stack and project; API and frontend share an application lock. CI source synchronization preserves environment files and host-managed proxy configuration. Host recovery helpers delegate to the same scripts with `--no-build`. Database account repair and security incident cleanup must not run as a side effect of deploying an application.

Run deployment tests using `python3 -m unittest discover -s tests/deployment -v`. Live verification should reapply existing images while monitoring all sites and persistent HTTP connections, without triggering payments, notifications or business transactions.
