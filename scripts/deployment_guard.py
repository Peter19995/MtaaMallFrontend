#!/usr/bin/env python3
"""Read-only guard for containers outside Julian API's three application roles."""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

SCOPES = {'keja-api': ['kejazone_api', 'kejazone_celery_worker', 'kejazone_celery_beat'], 'keja-frontend': ['kejazone-frontend'], 'mtaa-api': ['mtaamall-api', 'mtaamall-celery_worker-1', 'mtaamall-celery_beat-1'], 'mtaa-frontend': ['mtaamall-frontend']}
OWN = set()
CADDY = "julian-interiors-api-caddy-1"


def run(*args):
    return subprocess.check_output(args)


def container_state(item):
    return {"id": item["Id"], "image": item["Image"],
            "started_at": item["State"]["StartedAt"],
            "status": item["State"]["Status"], "restarts": item["RestartCount"]}


def snapshot():
    ids = run("docker", "ps", "-q").decode().split()
    containers = json.loads(run("docker", "inspect", *ids))
    protected = {c["Name"].lstrip("/"): container_state(c) for c in containers
                 if c["Name"].lstrip("/") not in OWN}
    if CADDY not in protected:
        raise RuntimeError("Shared proxy is not running; stop and investigate.")
    # Hash only: never store or print the proxy configuration or container env.
    config = run("docker", "exec", CADDY, "wget", "-q", "-O", "-",
                 "http://127.0.0.1:2019/config/")
    return {"containers": protected,
            "proxy_config_sha256": hashlib.sha256(config).hexdigest(),
            "proxy_file_sha256": hashlib.sha256(Path("/opt/julian-interiors-api/Caddyfile").read_bytes()).hexdigest()}


def differences(before, after):
    changed = [name for name, state in before["containers"].items()
               if after["containers"].get(name) != state]
    changed += [key for key in ("proxy_config_sha256", "proxy_file_sha256")
                if before[key] != after[key]]
    return changed


if __name__ == "__main__":
    mode, filename, scope = sys.argv[1:]
    OWN = set(SCOPES[scope])
    current = snapshot()
    if mode == "snapshot":
        Path(filename).write_text(json.dumps(current))
    elif mode == "verify":
        changed = differences(json.loads(Path(filename).read_text()), current)
        if changed:
            sys.exit("Protected infrastructure changed: " + ", ".join(changed))
        print("Shared proxy and other application containers unchanged.")
    else:
        sys.exit("Expected snapshot or verify")
