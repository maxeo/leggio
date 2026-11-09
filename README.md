# Leggio

Lettore di audiolibri con il testo sincronizzato.

Leggio è un lettore web per un audiolibro con il testo sincronizzato: evidenzia la frase e la parola che la voce sta leggendo. È un sito statico (va bene GitHub Pages), si installa come app e funziona anche senza rete per i capitoli salvati.

Funzioni: elenco dei capitoli diviso in parti, testo che segue la voce, velocità, salti avanti e indietro, timer di spegnimento, segnalibri, capitoli salvati sul dispositivo, temi chiaro e scuro, traguardi, esportazione e importazione dei progressi.

Nato per [L'ultima alba di Dalmasca](https://maxeo.github.io/ultima-alba-di-dalmasca/).

## Struttura

```
lettore/      il lettore: modello di index.html, service worker, icona, caratteri
strumenti/
  prepara.js    capitoli in Markdown + audio + sottotitoli → dati del sito
  crea-sito.js  copia il lettore nel sito e lo personalizza con libro.json
  server.js     server locale per provare il sito
  icone.py      icone PNG (iPhone, Android) da icona.svg
```

## Uso

1. Crea la cartella del sito con un `libro.json` (vedi sotto).
2. Prepara i dati:

   ```bash
   node strumenti/prepara.js percorso/del/sito
   ```

3. Crea il lettore:

   ```bash
   node strumenti/crea-sito.js percorso/del/sito
   ```

4. Provalo:

   ```bash
   node strumenti/server.js percorso/del/sito 8780
   ```

Serve solo Node.js 18 o successivo. `prepara.js` usa anche ffmpeg per comprimere l'audio.

## libro.json

```json
{
  "titolo": "Titolo del libro",
  "titoloBreve": "Titolo",
  "sottotitolo": "Audiolibro. Può contenere <i>HTML</i>.",
  "descrizione": "Descrizione per i motori di ricerca e l'app installata.",
  "autore": "Nome dell'autore",
  "lingua": "it",
  "avviso": "Note legali in fondo alla pagina, anche con <a href=\"...\">link</a>.",
  "chiave": "titolo",
  "traguardi": { "primaParte": "Nome del traguardo della prima parte", "fine": "Nome del traguardo finale" },
  "sorgenti": {
    "capitoli": "../libro/capitoli",
    "audio": "../libro/audio",
    "letto": "../libro/letto",
    "parole": "../libro/parole",
    "pronuncia": "../libro/pronuncia.tsv",
    "bitrate": "48k",
    "ffmpeg": ["ffmpeg", "-y", "-i", "{in}", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "48k", "{out}"]
  }
}
```

Solo `titolo` è obbligatorio per `crea-sito.js`; `prepara.js` vuole anche `sorgenti.capitoli` e `sorgenti.audio`. I percorsi sono relativi a `libro.json`.

`chiave` dà il nome ai dati salvati nel browser (progressi e audio). Cambiarla dopo la pubblicazione fa perdere i progressi ai lettori. Se manca, si ricava dal titolo.

## Sorgenti

| Cartella | Contenuto | Obbligatoria |
|---|---|---|
| `capitoli` | Un file Markdown per capitolo: `001-nome.md`, `002-nome.md`... | sì |
| `audio` | Per ogni capitolo `<nome>.mp3` e `<nome>.vtt` (sottotitoli WebVTT della lettura) | sì |
| `letto` | `<nome>.txt`: il testo come è stato mandato alla sintesi vocale, un paragrafo per riga | no |
| `parole` | `<nome>.parole.json`: tempi delle singole parole, `[[inizio, fine, "parola"], ...]` in secondi, per esempio da Whisper | no |
| `pronuncia` | File TSV `Scritto<TAB>Letto` usato per la sintesi: serve a riportare i nomi alla grafia del libro | no |

Nel Markdown:

- `# Titolo` apre una nuova parte (opzionale: senza parti c'è un solo elenco);
- `## 1. Titolo` è il titolo del capitolo;
- `---` separa le scene;
- un paragrafo tutto in corsivo è una citazione; se è breve e senza punto finale, è la sua firma.

Senza `parole` l'evidenziazione delle parole è stimata dalla lunghezza. Se il testo del capitolo non coincide con quello letto, il lettore mostra le frasi dei sottotitoli.

## Dati del sito

`prepara.js` scrive:

- `audio/NNN.mp3`: audio compresso (mono, 48 kbit/s per restare sotto il limite di 1 GB di GitHub Pages con circa 40 ore);
- `testi/NNN.json`: paragrafi, `[{ "c": [[inizio, "frase", [inizio di ogni parola]], ...] }]`, con `"h": 1` per i titoli e `cit`, `firma`, `st` per citazioni, firme e stacchi;
- `capitoli.json`: `{ "parti": [...], "capitoli": [{ "n", "titolo", "parte", "durata", "byte" }] }`.

Un capitolo senza `durata` compare nell'elenco come non ancora pronto.

## Limiti

- L'interfaccia è solo in italiano.
- Colori e icona predefiniti: per un'icona diversa metti `icona.svg` nella cartella del sito prima di `crea-sito.js`.
  Per avere anche le icone PNG (schermata Home di iPhone, icone adattive di Android) lancia prima
  `python strumenti/icone.py <cartella del sito>/icona.svg` (richiede `pip install resvg_py`).
  Per la scheda del browser si può aggiungere `icona-piccola.svg`, una versione semplificata in un colore:
  senza, il browser rimpicciolisce `icona.svg`.
