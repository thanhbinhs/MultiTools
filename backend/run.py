# run.py

import os
import sys
from pathlib import Path


def _load_env_file(env_path: Path) -> None:
    """Load simple KEY=VALUE pairs from a local .env file."""
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding='utf-8').splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#'):
            continue
        if line.startswith('export '):
            line = line[7:].strip()
        if '=' not in line:
            continue

        key, value = line.split('=', 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key:
            os.environ.setdefault(key, value)


_load_env_file(Path(__file__).resolve().parent / '.env')

from app import create_app

sys.stdout.reconfigure(encoding='utf-8')
app = create_app()

if __name__ == '__main__':
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', '3100'))
    app.run(debug=True, host=host, port=port)
