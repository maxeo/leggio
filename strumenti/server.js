// Server locale per provare il sito prima di pubblicarlo (serve anche le richieste a intervalli dell'audio).
// Uso: node strumenti/server.js <cartella del sito> [porta]
const http = require('http'), fs = require('fs'), path = require('path');

const SITO = path.resolve(process.argv[2] || '.');
const PORTA = +process.argv[3] || 8780;
const TIPI = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.css': 'text/css', '.png': 'image/png' };

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(SITO, p);
  if (!file.startsWith(SITO) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('non trovato'); }
  const tot = fs.statSync(file).size, tipo = TIPI[path.extname(file)] || 'application/octet-stream';
  const m = /bytes=(\d*)-(\d*)/.exec(req.headers.range || '');
  if (!m) {
    res.writeHead(200, { 'Content-Type': tipo, 'Content-Length': tot, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' });
    return fs.createReadStream(file).pipe(res);
  }
  const ini = m[1] ? +m[1] : Math.max(0, tot - +m[2]);
  const fine = m[1] && m[2] ? Math.min(+m[2], tot - 1) : tot - 1;
  res.writeHead(206, { 'Content-Type': tipo, 'Content-Length': fine - ini + 1, 'Content-Range': `bytes ${ini}-${fine}/${tot}`, 'Accept-Ranges': 'bytes' });
  fs.createReadStream(file, { start: ini, end: fine }).pipe(res);
}).listen(PORTA, () => console.log(`http://localhost:${PORTA}/`));
