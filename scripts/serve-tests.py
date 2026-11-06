"""Loopback-only static server for concurrent browser tests; no external services."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from functools import partial
from pathlib import Path


class BrowserTestServer(ThreadingHTTPServer):
    # Chromium opens several asset connections per page, across parallel workers.
    request_queue_size = 128
    daemon_threads = True


if __name__ == "__main__":
    dist = Path(__file__).resolve().parent.parent / "dist"
    with BrowserTestServer(("127.0.0.1", 8788), partial(SimpleHTTPRequestHandler, directory=str(dist))) as server:
        server.serve_forever()
