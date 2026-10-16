# a tiny web server for tools/preview: like "python -m http.server", but it tells
# the browser never to keep old copies, so every refresh shows your latest files.
# if the port's taken (another preview, some other program), it takes the next free one,
# and with --open it opens your browser on whichever it got.
import http.server, sys, webbrowser
class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()
args = [a for a in sys.argv[1:] if not a.startswith('--')]
port = int(args[0]) if args else 8000
for p in [port] + list(range(8030, 8050)):           # (8001 to 8020 are left for the content manager)
    try:
        server = http.server.ThreadingHTTPServer(('', p), NoCache)
        break
    except OSError:
        print('  (port %d is taken, trying another)' % p)
else:
    sys.exit('  port %d and 8030 to 8049 are all taken.' % port)
print('  previewing at http://localhost:%d/  (close this window to stop)' % p)
if '--open' in sys.argv:
    webbrowser.open('http://localhost:%d/' % p)
server.serve_forever()
