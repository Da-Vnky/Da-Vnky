# a tiny web server for tools/preview: like "python -m http.server", but it tells
# the browser never to keep old copies, so every refresh shows your latest files.
import http.server, sys
class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()
port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
http.server.ThreadingHTTPServer(('', port), NoCache).serve_forever()
