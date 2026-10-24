#!/usr/bin/env python3
"""Launch the self-contained game locally with a standard-library HTTP server."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

root = Path(__file__).resolve().parent
content = root / "dist" if (root / "dist" / "index.html").exists() else root
if not (content / "index.html").is_file():
    raise SystemExit("Game files are missing. Keep this launcher with the project.")
handler = partial(SimpleHTTPRequestHandler, directory=str(content))
server = None
for port in (4173, 4183, 4193, 0):
    try:
        server = ThreadingHTTPServer(("127.0.0.1", port), handler)
        break
    except OSError:
        continue
if server is None:
    raise SystemExit("Could not start the local game server.")
url = f"http://127.0.0.1:{server.server_port}/"
print(f"Purple Rain is ready: {url}\nKeep this window open while playing. Press Control-C to stop.", flush=True)
webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
