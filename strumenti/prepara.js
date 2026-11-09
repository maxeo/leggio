// Prepara i dati del lettore: audio compresso, testo sincronizzato parola per parola, indice dei capitoli.
// Uso: node strumenti/prepara.js <cartella del libro>
// Legge <cartella>/libro.json (sezione "sorgenti") e scrive in <cartella>: audio/NNN.mp3, testi/NNN.json, capitoli.json.
// Tre modi: "sincronizzato" (audio e testo che si seguono), "audio" (solo audio), "testo" (solo testo).
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');

const SITO = path.resolve(process.argv[2] || '.');
const libro = JSON.parse(fs.readFileSync(path.join(SITO, 'libro.json'), 'utf8'));
const src = libro.sorgenti || {};
const dove = k => (src[k] ? path.resolve(SITO, src[k]) : null);
const CAP = dove('capitoli'), SRC = dove('audio'), LETTO = dove('letto'), PAROLE = dove('parole'), PRONUNCIA = dove('pronuncia');
// Il modo si dichiara in libro.json; senza, lo dicono le sorgenti presenti.
const MODO = libro.modo || (!CAP ? 'audio' : !SRC ? 'testo' : 'sincronizzato');
if (!['sincronizzato', 'audio', 'testo'].includes(MODO)) { console.error(`libro.json: modo "${MODO}" sconosciuto`); process.exit(1); }
if (MODO !== 'audio' && !CAP) { console.error('libro.json: serve sorgenti.capitoli'); process.exit(1); }
if (MODO !== 'testo' && !SRC) { console.error('libro.json: serve sorgenti.audio'); process.exit(1); }
const AUDIO = path.join(SITO, 'audio'), TESTI = path.join(SITO, 'testi');
const BITRATE = src.bitrate || '48k';
// Comando di ffmpeg: ["ffmpeg"] se è nel PATH, oppure un prefisso, per esempio un "docker run ... ffmpeg".
// I percorsi {in} e {out} nel comando vengono sostituiti; senza segnaposto si aggiungono in coda.
const FFMPEG = src.ffmpeg === false ? false : src.ffmpeg || ['ffmpeg', '-y', '-loglevel', 'error', '-i', '{in}', '-vn', '-map_metadata', '-1',
  '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', BITRATE, '{out}'];
// Senza sottotitoli la durata del capitolo la dice ffprobe.
const FFPROBE = src.ffprobe || ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', '{in}'];
if (MODO !== 'testo') fs.mkdirSync(AUDIO, { recursive: true });
if (MODO !== 'audio') fs.mkdirSync(TESTI, { recursive: true });

// Il dizionario di pronuncia al contrario: nel testo letto i nomi tornano come nel libro.
// Formato: una riga per voce, "Come si scrive<TAB>Come si legge"; le righe con # sono commenti.
const voci = PRONUNCIA && fs.existsSync(PRONUNCIA)
  ? fs.readFileSync(PRONUNCIA, 'utf8').split(/\r?\n/).filter(r => r && !r.startsWith('#')).map(r => r.split('\t'))
    .filter(v => v.length === 2).sort((a, b) => b[1].length - a[1].length)
  : [];
const nomi = t => voci.reduce((s, [da, a]) => s.replace(new RegExp(String.raw`(?<!\p{L})${a}(?!\p{L})`, 'gu'), da), t);
const lettere = t => t.normalize('NFD').replace(/[^\p{L}]/gu, '').toLowerCase();

// Righe non vuote del capitolo, con il segno dello stacco di scena (---) che le precede.
function righeCapitolo(f) {
  const righe = [], dopoStacco = [];
  let stacco = false;
  for (const r of fs.readFileSync(path.join(CAP, f + '.md'), 'utf8').split(/\r?\n/).map(r => r.trim())) {
    if (!r) continue;
    if (/^-{3,}$/.test(r)) { stacco = true; continue; }
    righe.push(r); dopoStacco.push(stacco); stacco = false;
  }
  return { righe, dopoStacco };
}
// Paragrafo tutto in corsivo: citazione (cit); se e' breve e senza punto finale, e' la firma della citazione (firma).
function stilePar(r, staccato) {
  const o = staccato ? { st: 1 } : {};
  if (/^\*[^*][\s\S]*\*$/.test(r)) { if (r.length < 90 && !/[.!?…»]\*$/.test(r)) o.firma = 1; else o.cit = 1; }
  return o;
}
// Solo testo: i paragrafi senza tempi, come li legge il lettore quando non c'e' audio.
function paragrafi(f) {
  const { righe, dopoStacco } = righeCapitolo(f);
  return righe.map((r, i) => /^#/.test(r)
    ? { h: 1, s: r.replace(/^#+\s*/, '').replace(/[*_]/g, '') }
    : { s: r.replace(/[*_]/g, ''), ...stilePar(r, dopoStacco[i]) });
}
const conta = par => par.reduce((n, q) => n + q.s.split(/\s+/).filter(Boolean).length, 0);
// Durata di un mp3 letta dai suoi fotogrammi, senza strumenti esterni: serve ai libri di solo audio,
// dove non ci sono sottotitoli da cui ricavarla. Se la lettura non riesce, risponde ffprobe.
const MP3_BITRATI = {
  // [versione][strato]: kbit/s per indice 1..14
  1: { 3: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448], 2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384], 1: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] },
  2: { 3: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256], 2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], 1: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] }
};
const MP3_FREQ = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
function durataFotogrammi(file) {
  const b = fs.readFileSync(file);
  let i = 0;
  // Un eventuale blocco ID3v2 in testa non contiene audio: la sua lunghezza sta in quattro byte da 7 bit.
  if (b.length > 10 && b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) i = 10 + ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]);
  let campioni = 0, freq = 0;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) { i++; continue; }
    const ver = (b[i + 1] >> 3) & 3, strato = (b[i + 1] >> 1) & 3;
    const iBit = b[i + 2] >> 4, iFreq = (b[i + 2] >> 2) & 3, riempi = (b[i + 2] >> 1) & 1;
    const tabella = MP3_BITRATI[ver === 3 ? 1 : 2];
    if (ver === 1 || strato === 0 || iBit === 0 || iBit === 15 || iFreq === 3 || !tabella) { i++; continue; }
    const bit = tabella[strato][iBit] * 1000, sr = MP3_FREQ[ver][iFreq];
    if (!bit || !sr) { i++; continue; }
    // Lo strato I ha fotogrammi di 384 campioni e riempimento di 4 byte; gli altri 1152, o 576 in MPEG2.
    const perFotogramma = strato === 3 ? 384 : strato === 1 && ver !== 3 ? 576 : 1152;
    const lungo = strato === 3
      ? (Math.floor(12 * bit / sr) + riempi) * 4
      : Math.floor(perFotogramma / 8 * bit / sr) + riempi;
    if (lungo < 24) { i++; continue; }
    campioni += perFotogramma;
    freq = sr;
    i += lungo;
  }
  return freq ? campioni / freq : 0;
}
function durataMp3(file) {
  const d = durataFotogrammi(file);
  if (d > 0) return Math.round(d);
  const args = FFPROBE.slice(1).map(x => x.replace('{in}', file));
  if (!FFPROBE.some(x => x.includes('{in}'))) args.push(file);
  return Math.round(parseFloat(execFileSync(FFPROBE[0], args, { encoding: 'utf8' }).trim()) || 0);
}
// Titolo ricavato dal nome del file: "001-la-nave.mp3" diventa "La nave".
const titoloDaFile = f => f.replace(/^\d+[-_ ]*/, '').replace(/[-_]/g, ' ').replace(/^./, c => c.toUpperCase());

function leggiVtt(file) {
  const cue = [];
  const sec = s => { const p = s.split(':').map(Number); return p.reduce((t, x) => t * 60 + x, 0); };
  for (const b of fs.readFileSync(file, 'utf8').split(/\r?\n\r?\n/)) {
    const m = b.match(/((?:\d+:)?\d\d:\d\d\.\d+) --> ((?:\d+:)?\d\d:\d\d\.\d+)[^\n]*\r?\n([\s\S]+)/);
    if (!m) continue;
    const testo = nomi(m[3].replace(/<[^>]+>/g, '').replace(/\[pause[^\]]*\]/g, ' ').replace(/\s+/g, ' ').replace(/(\s*\.\s*)+$/, '.').trim());
    cue.push({ t: sec(m[1]), fine: sec(m[2]), testo });
  }
  return cue;
}

// Abbina frasi lette e paragrafi. Se testo e audio non coincidono, usa le frasi come sono state lette.
function sincronizza(f, cue, mp3) {
  // Le righe di --- separano le scene: il paragrafo che segue lo ricorda per mostrare lo stacco.
  const { righe, dopoStacco } = righeCapitolo(f);
  const stile = (r, i) => stilePar(r, dopoStacco[i]);
  // Il testo come è stato mandato alla sintesi, una riga per paragrafo (serve per i titoli). Se manca, il testo del libro.
  const fl = LETTO && path.join(LETTO, f + '.txt');
  const letti = fl && fs.existsSync(fl)
    ? fs.readFileSync(fl, 'utf8').split(/\n+/).map(r => r.trim()).filter(r => r && !r.startsWith('[pause'))
    : righe.map(r => r.replace(/^#+\s*/, '').replace(/[*_]/g, ''));
  const piano = () => ({ par: [{ c: cue.filter(c => c.testo).map(c => [+c.t.toFixed(2), c.testo]) }], esatto: false, ripiego: true });
  if (righe.length !== letti.length) return piano();
  const par = righe.map((r, i) => /^#/.test(r)
    ? { h: 1, s: nomi(letti[i]) }
    : { s: r.replace(/[*_]/g, ''), ...stile(r, i) });

  let p = 0, pos = 0;
  const avanza = quante => { // Prende dal paragrafo corrente fino a contare quante lettere.
    const pezzi = [];
    while (quante > 0 && p < par.length) {
      const s = par[p].s;
      const ini = pos;
      while (pos < s.length && quante > 0) {
        const ch = String.fromCodePoint(s.codePointAt(pos));
        if (lettere(ch)) quante--;
        pos += ch.length;
      }
      while (pos < s.length && !lettere(String.fromCodePoint(s.codePointAt(pos))) && !/[\s]/.test(s[pos])) pos++;
      pezzi.push({ p, s: s.slice(ini, pos) });
      if (pos >= s.length) { p++; pos = 0; }
    }
    return pezzi;
  };
  // Tempi delle parole riconosciute (per esempio da Whisper): [[inizio, fine, parola], ...], se più recenti dell'audio.
  const fp = PAROLE && path.join(PAROLE, f + '.parole.json');
  const sentite = fp && fs.existsSync(fp) && fs.statSync(fp).mtimeMs >= fs.statSync(mp3).mtimeMs
    ? JSON.parse(fs.readFileSync(fp, 'utf8')) : null;
  // Tempo d'inizio di ogni parola di un blocco letto. Con le parole riconosciute, quelle del testo si abbinano a
  // quelle sentite (sottosequenza comune più lunga); le parole non abbinate, per esempio i numeri scritti
  // in cifre, prendono il tempo in proporzione alle lettere fra le due parole abbinate più vicine.
  // Senza parole riconosciute la durata del blocco si divide in parti uguali per lettera.
  const tempiParole = (c, tok) => {
    const cum = []; let n = 0;
    for (const w of tok) { cum.push(n); n += lettere(w).length; }
    const ws = sentite ? sentite.filter(([s, e]) => (s + e) / 2 >= c.t && (s + e) / 2 < c.fine) : [];
    if (!ws.length) return cum.map(k => c.t + (c.fine - c.t) * k / (n || 1));
    // Il riconoscimento attacca la pausa che precede una parola all'inizio della parola stessa:
    // l'inizio si ricava dalla fine, stimando la durata dal numero di lettere.
    const ini = ws.map(([s, e, w]) => Math.max(s, e - (0.065 * (lettere(w).length || 2) + 0.08)));
    const A = tok.map(lettere), B = ws.map(w => lettere(w[2]));
    const L = Array.from({ length: A.length + 1 }, () => new Int16Array(B.length + 1));
    for (let i = A.length - 1; i >= 0; i--) for (let j = B.length - 1; j >= 0; j--)
      L[i][j] = A[i] && A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const ancora = new Array(A.length).fill(null);
    for (let i = 0, j = 0; i < A.length && j < B.length;) {
      if (A[i] && A[i] === B[j]) { ancora[i] = ini[j]; i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) i++; else j++;
    }
    const fine = ws[ws.length - 1][1], out = [];
    for (let i = 0; i < A.length; i++) {
      if (ancora[i] != null) { out.push(ancora[i]); continue; }
      let p = i - 1; while (p >= 0 && ancora[p] == null) p--;
      let q = i + 1; while (q < A.length && ancora[q] == null) q++;
      const tp = p >= 0 ? ancora[p] : ini[0], cp = p >= 0 ? cum[p] : 0;
      const tq = q < A.length ? ancora[q] : fine, cq = q < A.length ? cum[q] : n;
      out.push(p < 0 && i === 0 ? ini[0] : tp + (tq - tp) * (cum[i] - cp) / ((cq - cp) || 1));
    }
    for (let i = 1; i < out.length; i++) out[i] = Math.max(out[i], out[i - 1]);
    return out.map(t => Math.min(c.fine, Math.max(c.t, t)));
  };
  for (const q of par) q.c = [];
  for (const c of cue) {
    const n = lettere(c.testo).length;
    if (!n) continue;
    const pezzi = avanza(n);
    if (lettere(pezzi.map(x => x.s).join('')) !== lettere(c.testo)) return piano();
    // Un blocco letto può coprire più frasi e paragrafi: ogni frase e ogni parola prende il suo tempo.
    const frasi = [];
    for (const x of pezzi) for (const frase of x.s.split(/(?<=[.!?…]+[»"”')]*)(?=\s)/u))
      frasi.push({ p: x.p, frase, w: frase.split(/\s+/).filter(Boolean) });
    const tempi = tempiParole(c, frasi.flatMap(x => x.w));
    let k = 0;
    for (const x of frasi) {
      const tp = x.w.map(() => +tempi[k++].toFixed(2));
      const t = tp.length ? tp[0] : +c.t.toFixed(2);
      par[x.p].c.push(sentite ? [t, x.frase, tp] : [t, x.frase]);
    }
  }
  return { par: par.map(q => (q.h ? { h: 1, c: q.c } : { c: q.c, ...(q.cit && { cit: 1 }), ...(q.firma && { firma: 1 }), ...(q.st && { st: 1 }) })), esatto: p >= par.length };
}

function comprimi(da, a) {
  // Con "ffmpeg": false l'audio va nel sito com'e': utile quando e' gia' un mp3 leggero.
  if (FFMPEG === false) { fs.copyFileSync(da, a); return; }
  const tmp = a + '.tmp.mp3';
  const args = FFMPEG.slice(1).map(x => x.replace('{in}', da).replace('{out}', tmp));
  if (!FFMPEG.some(x => x.includes('{in}'))) args.push(da, tmp);
  execFileSync(FFMPEG[0], args, { stdio: 'inherit' });
  fs.renameSync(tmp, a);
}

const parti = [], capitoli = [];
// Capitolo in rigenerazione (mp3 tolto dalla sorgente): resta ascoltabile la versione già pubblicata.
const prima = (() => { try { return Object.fromEntries(JSON.parse(fs.readFileSync(path.join(SITO, 'capitoli.json'), 'utf8')).capitoli.map(c => [c.n, c])); } catch { return {}; } })();
// Solo audio: i capitoli sono i file mp3 e il titolo viene dal nome del file.
if (MODO === 'audio') fs.readdirSync(SRC).filter(x => x.endsWith('.mp3')).sort().forEach((file, i) => {
  const f = file.slice(0, -4);
  const n = parseInt(f, 10) || i + 1, id = String(n).padStart(3, '0');
  const mp3 = path.join(SRC, file), vtt = path.join(SRC, f + '.vtt'), out = path.join(AUDIO, id + '.mp3');
  const voce = { n, titolo: titoloDaFile(f) };
  if (fs.statSync(mp3).size > 0) {
    if (!fs.existsSync(out) || fs.statSync(mp3).mtimeMs > fs.statSync(out).mtimeMs) comprimi(mp3, out);
    const cue = fs.existsSync(vtt) ? leggiVtt(vtt) : [];
    voce.durata = cue.length ? Math.round(cue[cue.length - 1].fine) : durataMp3(out);
    voce.byte = fs.statSync(out).size;
    console.log(`${id} ${voce.durata}s ${(voce.byte / 1048576).toFixed(1)} MiB`);
  } else if (prima[n] && prima[n].durata && fs.existsSync(out)) { voce.durata = prima[n].durata; voce.byte = prima[n].byte; }
  capitoli.push(voce);
});
let parte = '';
if (MODO !== 'audio') fs.readdirSync(CAP).filter(x => x.endsWith('.md')).sort().forEach((file, i) => {
  const f = file.slice(0, -3);
  // Numero dal nome del file (001-titolo.md), altrimenti l'ordine alfabetico.
  const n = parseInt(f, 10) || i + 1, id = String(n).padStart(3, '0');
  const righe = fs.readFileSync(path.join(CAP, file), 'utf8').split(/\r?\n/);
  // "# Titolo" apre una parte, "## N. Titolo" è il titolo del capitolo.
  const sez = righe.find(r => /^# /.test(r));
  if (sez) { parte = sez.slice(2).replace(/\.$/, ''); parti.push(parte); }
  const tit = righe.find(r => /^## /.test(r));
  const titolo = tit ? tit.replace(/^## (\d+\. )?/, '') : f.replace(/^\d+[-_ ]*/, '').replace(/[-_]/g, ' ').replace(/^./, c => c.toUpperCase());
  const voce = parte ? { n, titolo, parte } : { n, titolo };

  const js = path.join(TESTI, id + '.json');
  // Solo testo: nel sito va solo il testo, e la lunghezza in parole dice quanto dura la lettura.
  if (MODO === 'testo') {
    const par = paragrafi(f);
    fs.writeFileSync(js, JSON.stringify(par));
    voce.parole = conta(par);
    voce.byte = fs.statSync(js).size;
    console.log(`${id} ${voce.parole} parole`);
    capitoli.push(voce);
    return;
  }
  const mp3 = path.join(SRC, f + '.mp3'), vtt = path.join(SRC, f + '.vtt');
  const out = path.join(AUDIO, id + '.mp3');
  if (fs.existsSync(mp3) && fs.existsSync(vtt) && fs.statSync(mp3).size > 0) {
    // Si riconverte anche quando il capitolo è stato rigenerato dopo l'ultima preparazione.
    if (!fs.existsSync(out) || fs.statSync(mp3).mtimeMs > fs.statSync(out).mtimeMs) comprimi(mp3, out);
    const cue = leggiVtt(vtt);
    const { par, esatto, ripiego } = sincronizza(f, cue, mp3);
    // Se il testo è stato corretto dopo l'audio non combaciano più: fino alla rigenerazione resta il file già pronto.
    if (ripiego && fs.existsSync(js)) console.log(`${id} testo diverso dall'audio: tengo il file esistente`);
    else fs.writeFileSync(js, JSON.stringify(par));
    voce.durata = Math.round(cue[cue.length - 1].fine);
    voce.byte = fs.statSync(out).size;
    console.log(`${id} ${voce.durata}s ${(voce.byte / 1048576).toFixed(1)} MiB testo ${esatto ? 'esatto' : 'come letto'}`);
  }
  else if (prima[n] && prima[n].durata && fs.existsSync(out)) { voce.durata = prima[n].durata; voce.byte = prima[n].byte; }
  capitoli.push(voce);
});
capitoli.sort((x, y) => x.n - y.n);
fs.writeFileSync(path.join(SITO, 'capitoli.json'), JSON.stringify({ modo: MODO, parti, capitoli }));
const pronti = capitoli.filter(c => (MODO === 'testo' ? c.parole : c.durata)).length;
console.log(`${MODO}: ${pronti} capitoli pronti su ${capitoli.length}`);
