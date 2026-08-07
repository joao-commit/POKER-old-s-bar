import http.server
import webbrowser
from functools import partial

HOST = '127.0.0.1'
PORT = 8000

Handler = partial(http.server.SimpleHTTPRequestHandler, directory='.')

with http.server.ThreadingHTTPServer((HOST, PORT), Handler) as server:
    url = f'http://{HOST}:{PORT}/'
    print(f'Servidor rodando em {url}')
    print('Pressione Ctrl+C para encerrar.')
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nEncerrado.')
