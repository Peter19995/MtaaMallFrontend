"""Run the real deployment shell against fake Docker; never operate live services."""
import importlib.util
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
SERVICES = ['frontend']

class DeploymentIsolation(unittest.TestCase):
    def deploy(self, no_build=False, guard_fail=False, build_fail=False):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root/'scripts').mkdir();(root/'bin').mkdir()
            for name in ('.env','.env.production','docker-compose.yml','docker-compose.server.yml','docker-compose.contabo.yml'):
                (root/name).touch()
            script=root/'scripts/deploy.sh'
            script.write_text((ROOT/'scripts/deploy.sh').read_text().replace('/var/lock/',str(root)+'/'))
            (root/'scripts/deployment_guard.py').write_text("import os,sys\nif sys.argv[1]=='verify' and os.getenv('FAIL_GUARD')=='1':sys.exit(1)\n")
            for command,content in {
                'docker':"#!/usr/bin/env python3\nimport sys,os,json\nwith open(os.environ['CALL_LOG'],'a') as f:f.write(json.dumps(sys.argv[1:])+'\\n')\nif sys.argv[1]=='inspect':print('true healthy')\nif 'build' in sys.argv and os.getenv('FAIL_BUILD')=='1':sys.exit(2)\n",
                'curl':'#!/bin/sh\nexit 0\n',
                'flock':'#!/bin/sh\nexit 0\n',
            }.items():
                p=root/'bin'/command;p.write_text(content);p.chmod(0o755)
            env=dict(os.environ,APP_DIR=str(root),APP_ROOT=str(root),CALL_LOG=str(root/'calls'),
                     PATH=str(root/'bin')+':'+os.environ['PATH'],FAIL_GUARD='1' if guard_fail else '0',FAIL_BUILD='1' if build_fail else '0')
            result=subprocess.run(['bash',str(script)]+(['--no-build'] if no_build else []),env=env,capture_output=True,text=True)
            calls=[json.loads(s) for s in (root/'calls').read_text().splitlines()]
            return result,calls

    def test_only_selected_services_are_updated_without_dependencies(self):
        result,calls=self.deploy()
        self.assertEqual(result.returncode,0,result.stderr)
        updates=[c[c.index('up'):] for c in calls if c[0]=='compose' and 'up' in c]
        expected=[['api'],['celery_worker','celery_beat']] if SERVICES[0]=='api' else [SERVICES]
        self.assertEqual(updates,[['up','-d','--no-deps','--no-build']+s for s in expected])
        self.assertTrue(all(c[0] in ('compose','inspect','network') for c in calls))
        self.assertFalse(any(x in c for c in calls for x in ('restart','pull','prune','--remove-orphans','create')))
        for c in calls:
            if c[0]=='compose' and 'run' in c:self.assertIn('--no-deps',c)

    def test_recovery_reuses_images_and_does_not_run_migrations(self):
        result,calls=self.deploy(no_build=True)
        self.assertEqual(result.returncode,0,result.stderr)
        self.assertFalse(any(x in c for c in calls for x in ('build','run')))

    def test_failed_build_never_updates_running_containers(self):
        result,calls=self.deploy(build_fail=True)
        self.assertNotEqual(result.returncode,0)
        self.assertFalse(any("up" in c for c in calls))

    def test_guard_failure_prevents_container_changes(self):
        result,calls=self.deploy(guard_fail=True)
        self.assertNotEqual(result.returncode,0)
        self.assertFalse(any('up' in c for c in calls))

    def test_guard_detects_other_container_restart_and_proxy_change(self):
        spec=importlib.util.spec_from_file_location('guard',ROOT/'scripts/deployment_guard.py')
        module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        before={'containers':{'protected-redis':{'restarts':0}},'proxy_config_sha256':'a','proxy_file_sha256':'b'}
        after={'containers':{'protected-redis':{'restarts':1}},'proxy_config_sha256':'changed','proxy_file_sha256':'b'}
        self.assertEqual(module.differences(before,before),[])
        self.assertEqual(module.differences(before,after),['protected-redis','proxy_config_sha256'])
        self.assertTrue(all(module.CADDY not in names for names in module.SCOPES.values()))

if __name__=='__main__':unittest.main()
