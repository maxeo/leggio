// Prepara i dati del lettore: audio compresso, testo sincronizzato parola per parola, indice dei capitoli.
// Uso: node strumenti/prepara.js <cartella del sito>
// Legge <cartella>/libro.json (sezione "sorgenti") e scrive in <cartella>: audio/NNN.mp3, testi/NNN.json, capitoli.json.
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');

const SITO = path.resolve(process.argv[2] || '.');
const libro = JSON.parse(fs.readFileSync(path.join(SITO, 'libro.json'), 'utf8'));
const src = libro.sorgenti || {};
const dove = k => (src[k] ? path.resolve(SITO, src[k]) : null);
const CAP = dove('capitoli'), SRC = dove('audio'), LETTO = dove('letto'), PAROLE = dove('parole'), PRONUNCIA = dove('pronuncia');
if (!CAP || !SRC) { console.error('libro.json: servono sorgenti.capitoli e sorgenti.audio'); process.exit(1); }
const AUDIO = path.join(SITO, 'audio'), TESTI = path.join(SITO, 'testi');
const BITRATE = src.bitrate || '48k';
// Comando di ffmpeg: ["ffmpeg"] se è nel PATH, oppure un prefisso, per esempio un "docker run ... ffmpeg".
// I percorsi {in} e {out} nel comando vengono sostituiti; senza segnaposto si aggiungono in coda.
const FFMPEG = src.ffmpeg || ['ffmpeg', '-y', '-loglevel', 'error', '-i', '{in}', '-vn', '-map_metadata', '-1',
  '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', BITRATE, '{out}'];
fs.mkdirSync(AUDIO, { recursive: true });
fs.mkdirSync(TESTI, { recursive: true });

// Il dizionario di pronuncia al contrario: nel testo letto i nomi tornano come nel libro.
// Formato: una riga per voce, "Come si scrive<TAB>Come si legge"; le righe con # sono commenti.
const voci = PRONUNCIA && fs.existsSync(PRONUNCIA)
  ? fs.readFileSync(PRONUNCIA, 'utf8').split(/\r?\n/).filter(r => r && !r.startsWith('#')).map(r => r.split('\t'))
    .filter(v => v.length === 2).sort((a, b) => b[1].length - a[1].length)
  : [];
const nomi = t => voci.reduce((s, [da, a]) => s.replace(new RegExp(String.raw`(?<!\p{L})${a}(?!\p{L})`, 'gu'), da), t);
const lettere = t => t.normalize('NFD').replace(/[^\p{L}]/gu, '').toLowerCase();

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
  const righe = [], dopoStacco = [];
  let stacco = false;
  for (const r of fs.readFileSync(path.join(CAP, f + '.md'), 'utf8').split(/\r?\n/).map(r => r.trim())) {
    if (!r) continue;
    if (/^-{3,}$/.test(r)) { stacco = true; continue; }
    righe.push(r); dopoStacco.push(stacco); stacco = false;
  }
  // Paragrafo tutto in corsivo: citazione (cit); se è breve e senza punto finale, è la firma della citazione (firma).
  const stile = (r, i) => {
    const o = dopoStacco[i] ? { st: 1 } : {};
    if (/^\*[^*][\s\S]*\*$/.test(r)) { if (r.length < 90 && !/[.!?…»]\*$/.test(r)) o.firma = 1; else o.cit = 1; }
    return o;
  };
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
  const tmp = a + '.tmp.mp3';
  const args = FFMPEG.slice(1).map(x => x.replace('{in}', da).replace('{out}', tmp));
  if (!FFMPEG.some(x => x.includes('{in}'))) args.push(da, tmp);
  execFileSync(FFMPEG[0], args, { stdio: 'inherit' });
  fs.renameSync(tmp, a);
}

const parti = [], capitoli = [];
// Capitolo in rigenerazione (mp3 tolto dalla sorgente): resta ascoltabile la versione già pubblicata.
const prima = (() => { try { return Object.fromEntries(JSON.parse(fs.readFileSync(path.join(SITO, 'capitoli.json'), 'utf8')).capitoli.map(c => [c.n, c])); } catch { return {}; } })();
let parte = '';
fs.readdirSync(CAP).filter(x => x.endsWith('.md')).sort().forEach((file, i) => {
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

  const mp3 = path.join(SRC, f + '.mp3'), vtt = path.join(SRC, f + '.vtt');
  const out = path.join(AUDIO, id + '.mp3'), js = path.join(TESTI, id + '.json');
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
fs.writeFileSync(path.join(SITO, 'capitoli.json'), JSON.stringify({ parti, capitoli }));
console.log(`${capitoli.filter(c => c.durata).length} capitoli pronti su ${capitoli.length}`);
