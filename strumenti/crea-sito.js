// Copia il lettore nella cartella del sito e lo personalizza con i dati di catalogo.json, oppure di libro.json.
// Uso: node strumenti/crea-sito.js <cartella del sito>
// Scrive index.html, sw.js, manifest.webmanifest e caratteri/; icona.svg solo se la cartella non ne ha già una.
// Le icone PNG predefinite (iPhone, Android) e icona-piccola.svg si copiano solo insieme all'icona predefinita: per un'icona
// diversa si creano con strumenti/icone.py.
const fs = require('fs'), path = require('path');

const LETTORE = path.join(__dirname, '..', 'lettore');
const SITO = path.resolve(process.argv[2] || '.');
// Con catalogo.json il sito ha uno scaffale di piu' libri; con libro.json ne ha uno solo.
const fileCat = path.join(SITO, 'catalogo.json'), fileLibro = path.join(SITO, 'libro.json');
const scaffale = fs.existsSync(fileCat);
const sorgente = scaffale ? fileCat : fileLibro;
if (!fs.existsSync(sorgente)) { console.error('serve catalogo.json oppure libro.json nella cartella del sito'); process.exit(1); }
const dati = JSON.parse(fs.readFileSync(sorgente, 'utf8'));
if (!dati.titolo) { console.error(`${path.basename(sorgente)}: manca "titolo"`); process.exit(1); }

const chiave = dati.chiave || dati.titolo.normalize('NFD').replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/[\s_-]+/g, '-');
// Nello scaffale i dati di ogni libro arrivano da catalogo.json: nella pagina non ne va scritto nessuno.
const libro = scaffale ? null : {
  titolo: dati.titolo,
  autore: dati.autore || '',
  chiave,
  modo: dati.modo || 'sincronizzato',
  traguardi: { primaParte: 'La prima parte', fine: "Fino all'ultima pagina", ...dati.traguardi }
};
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// sottotitolo e avviso possono contenere HTML (corsivi, link): vengono da chi pubblica il libro.
const valori = {
  lingua: esc(dati.lingua || 'it'),
  titolo: esc(dati.titolo),
  descrizione: esc(dati.descrizione || dati.titolo),
  sottotitolo: dati.sottotitolo || '',
  avviso: dati.avviso || '',
  chiave,
  libro: JSON.stringify(libro).replace(/</g, '\\u003c')
};
// Icone: quella predefinita porta con sé i PNG; un'icona propria usa i PNG che trova nella cartella.
// icona-piccola.svg è la versione semplificata in un colore per la scheda del browser (16 px).
const PNG = ['icona-180.png', 'icona-192.png', 'icona-512.png', 'icona-maskable.png'];
const EXTRA = [...PNG, 'icona-piccola.svg'];
const iconaSito = path.join(SITO, 'icona.svg'), iconaBase = path.join(LETTORE, 'icona.svg');
if (!fs.existsSync(iconaSito) || fs.readFileSync(iconaSito, 'utf8') === fs.readFileSync(iconaBase, 'utf8')) {
  fs.copyFileSync(iconaBase, iconaSito);
  for (const f of EXTRA) fs.copyFileSync(path.join(LETTORE, f), path.join(SITO, f));
}
const presenti = EXTRA.filter(f => fs.existsSync(path.join(SITO, f)));
valori.iconaPiccola = presenti.includes('icona-piccola.svg') ? 'icona-piccola.svg' : 'icona.svg';
valori.iconaTouch = presenti.includes('icona-180.png') ? 'icona-180.png' : 'icona.svg';
valori.fileIcone = ['icona.svg', ...presenti].map(f => `'${f}'`).join(', ');
const icone = [{ src: 'icona.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }];
if (presenti.includes('icona-192.png')) icone.push({ src: 'icona-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' });
if (presenti.includes('icona-512.png')) icone.push({ src: 'icona-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' });
if (presenti.includes('icona-maskable.png')) icone.push({ src: 'icona-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' });

const riempi = t => t.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in valori ? valori[k] : m));

fs.writeFileSync(path.join(SITO, 'index.html'), riempi(fs.readFileSync(path.join(LETTORE, 'index.html'), 'utf8')));
fs.writeFileSync(path.join(SITO, 'sw.js'), riempi(fs.readFileSync(path.join(LETTORE, 'sw.js'), 'utf8')));
fs.cpSync(path.join(LETTORE, 'caratteri'), path.join(SITO, 'caratteri'), { recursive: true });
fs.writeFileSync(path.join(SITO, 'manifest.webmanifest'), JSON.stringify({
  name: dati.titolo,
  short_name: dati.titoloBreve || dati.titolo,
  description: dati.descrizione || dati.titolo,
  lang: dati.lingua || 'it',
  start_url: './',
  scope: './',
  display: 'standalone',
  background_color: '#14121c',
  theme_color: '#14121c',
  icons: icone
}, null, 2) + '\n');
console.log(`Lettore creato in ${SITO} (chiave "${chiave}"${scaffale ? `, scaffale di ${(dati.libri || []).length} libri` : ''})`);
