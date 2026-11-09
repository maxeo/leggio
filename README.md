# Leggio

Lettore di audiolibri con il testo sincronizzato.

Leggio è un lettore web per uno o più libri. È un sito statico (va bene GitHub Pages), si installa come app e funziona anche senza rete per i capitoli salvati.

Ogni libro ha un modo:

| Modo | Cosa serve | Com'è il lettore |
|---|---|---|
| `sincronizzato` | audio e testo con i sottotitoli della lettura | evidenzia la frase e la parola che la voce sta leggendo |
| `audio` | solo l'audio | audiolibro senza testo |
| `testo` | solo il testo | libro da leggere, senza il lettore audio |

Con più libri il sito apre uno **scaffale**: le carte dei libri, e da lì si entra nel libro. I libri si elencano in `catalogo.json` e possono stare anche su un altro dominio.

Nello scaffale ci sono la ricerca per titolo e autore, i filtri per modo (compaiono solo se nello scaffale c'è più di un modo), l'ordine (del catalogo, titolo, autore, durata, aperti di recente, da finire) e tre viste: carte, elenco e copertine. Ordine e vista si ricordano; la ricerca no.

Funzioni: elenco dei capitoli diviso in parti, testo che segue la voce, velocità, salti avanti e indietro, timer di spegnimento, segnalibri, capitoli salvati sul dispositivo, temi chiaro e scuro, traguardi, esportazione e importazione dei progressi. I progressi stanno per libro; tema, carattere e comandi valgono per tutto lo scaffale.

I traguardi sono divisi in due tab. **Libri in corso** chiede prima quale libro guardare e poi mostra i traguardi dei suoi capitoli, con i nomi scelti dal libro in `traguardi`: dentro un libro quello aperto è già scelto. **Generali** conta il tempo, i giorni di fila e i libri finiti di tutto lo scaffale, sommando i progressi di ogni libro, e sta con le impostazioni invece che con un libro. Senza un libro aperto parte il tab Generali, dentro un libro quello dei libri in corso.

**[Esempio](https://maxeo.github.io/leggio/)**: uno scaffale con quattro libri, uno per modo.

Nato per [L'ultima alba di Dalmasca](https://maxeo.github.io/ultima-alba-di-dalmasca/), che lo usa.

## Struttura

```
docs/         lo scaffale di esempio pubblicato su GitHub Pages
lettore/      il lettore: modello di index.html, service worker, icona, caratteri
strumenti/
  prepara.js    capitoli in Markdown + audio + sottotitoli → dati del libro
  crea-sito.js  copia il lettore nel sito e lo personalizza con catalogo.json o libro.json
  server.js     server locale per provare il sito
  leggio.js     un comando solo per i tre strumenti: leggio prepara | sito | prova
  icone.py      icone PNG (iPhone, Android) da icona.svg
```

Un sito con un libro solo tiene i dati nella sua cartella. Uno scaffale ha `catalogo.json` nella radice e una cartella per libro:

```
sito/
  catalogo.json
  index.html, sw.js, manifest.webmanifest, icone, caratteri/
  libri/
    primo/    libro.json, capitoli.json, audio/, testi/
    secondo/  libro.json, capitoli.json, testi/
```

## Uso

1. Crea la cartella del libro con un `libro.json` (vedi sotto).
2. Prepara i dati del libro:

   ```bash
   node strumenti/prepara.js percorso/del/libro
   ```

3. Crea il lettore nella radice del sito (dove c'è `catalogo.json`, oppure il `libro.json` del libro solo):

   ```bash
   node strumenti/crea-sito.js percorso/del/sito
   ```

4. Provalo:

   ```bash
   node strumenti/server.js percorso/del/sito 8780
   ```

Con più libri, il passo 2 si ripete per ogni cartella di `libri/`.

Da un altro progetto gli stessi passi sono `npx leggio prepara`, `npx leggio sito` e `npx leggio prova`: vedi sotto.

Serve solo Node.js 18 o successivo. `prepara.js` usa anche ffmpeg per comprimere l'audio; con `"ffmpeg": false` copia l'audio com'è e non serve.

## Integrare Leggio in un sito che esiste già

Leggio non tocca i dati: i capitoli li prepari come vuoi, anche con i tuoi script, e Leggio ci mette sopra il lettore. In un altro progetto si installa come strumento:

```bash
npm install --save-dev github:maxeo/leggio
npx leggio sito docs
```

`leggio sito` scrive `index.html`, `sw.js`, `manifest.webmanifest`, `caratteri/` e le icone nella cartella del sito e lascia il resto com'è: basta che ci sia un `libro.json` (un libro solo) oppure un `catalogo.json` (scaffale). Per aggiornare il lettore: `npm update leggio` e di nuovo `npx leggio sito docs`.

Il sito di un libro solo tiene tutto in una cartella:

```
docs/
  libro.json        titolo, autore, chiave, modo
  capitoli.json     indice dei capitoli
  audio/NNN.mp3     testi/NNN.json
  index.html, sw.js, manifest.webmanifest, icona.svg, caratteri/   <- leggio sito
```

In un sito già pubblicato la `chiave` di `libro.json` deve restare quella del lettore di prima: dà il nome ai progressi salvati nel browser, e cambiarla li fa perdere ai lettori. Il service worker ripulisce da sé le vecchie cache del lettore, mentre i capitoli salvati sul dispositivo restano se la chiave non cambia.

## catalogo.json

```json
{
  "titolo": "Nome dello scaffale",
  "sottotitolo": "Riga sotto il titolo.",
  "descrizione": "Descrizione per i motori di ricerca e l'app installata.",
  "lingua": "it",
  "chiave": "scaffale",
  "avviso": "Note legali in fondo allo scaffale.",
  "libri": [
    {
      "chiave": "primo",
      "base": "libri/primo/",
      "titolo": "Titolo del libro",
      "autore": "Nome dell'autore",
      "sottotitolo": "Riga sotto il titolo del libro.",
      "modo": "sincronizzato",
      "copertina": "copertina.jpg",
      "avviso": "Note legali in fondo al libro.",
      "traguardi": { "primaParte": "Nome del traguardo della prima parte", "fine": "Nome del traguardo finale" }
    },
    { "chiave": "altrove", "base": "https://altro.esempio/libro/", "titolo": "Libro su un altro sito", "modo": "audio" }
  ]
}
```

`base` è la cartella dei dati del libro (`capitoli.json`, `audio/`, `testi/`), relativa al sito oppure un indirizzo completo. `copertina` è relativa a `base`; senza, la carta mostra un'icona del modo. `chiave` dà il nome ai dati salvati nel browser: deve restare la stessa nel tempo e diversa da quella degli altri libri.

Nel lettore `#primo` apre un libro e `#primo/12` un capitolo; con un libro solo basta `#12`.

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
  "modo": "sincronizzato",
  "traguardi": { "primaParte": "Nome del traguardo della prima parte", "fine": "Nome del traguardo finale" },
  "sorgenti": {
    "capitoli": "../libro/capitoli",
    "audio": "../libro/audio",
    "letto": "../libro/letto",
    "parole": "../libro/parole",
    "pronuncia": "../libro/pronuncia.tsv",
    "bitrate": "48k",
    "ffmpeg": ["ffmpeg", "-y", "-i", "{in}", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "48k", "{out}"],
    "ffprobe": ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", "{in}"]
  }
}
```

Solo `titolo` è obbligatorio per `crea-sito.js`. I percorsi sono relativi a `libro.json`.

`modo` vale `sincronizzato`, `audio` o `testo`; se manca, lo dicono le sorgenti presenti: senza `capitoli` è `audio`, senza `audio` è `testo`.

`"ffmpeg": false` copia l'audio nel sito com'è, senza ricomprimerlo: va bene quando è già un mp3 leggero. La durata del capitolo si legge dai sottotitoli; senza, dai fotogrammi del mp3, e `ffprobe` serve solo se quella lettura non riesce.

`chiave` dà il nome ai dati salvati nel browser (progressi e audio). Cambiarla dopo la pubblicazione fa perdere i progressi ai lettori. Se manca, si ricava dal titolo. In uno scaffale deve essere la stessa scritta in `catalogo.json`.

## Sorgenti

| Cartella | Contenuto | Obbligatoria |
|---|---|---|
| `capitoli` | Un file Markdown per capitolo: `001-nome.md`, `002-nome.md`... | sì, tranne nel modo `audio` |
| `audio` | Per ogni capitolo `<nome>.mp3` e `<nome>.vtt` (sottotitoli WebVTT della lettura) | sì, tranne nel modo `testo` |
| `letto` | `<nome>.txt`: il testo come è stato mandato alla sintesi vocale, un paragrafo per riga | no |
| `parole` | `<nome>.parole.json`: tempi delle singole parole, `[[inizio, fine, "parola"], ...]` in secondi, per esempio da Whisper | no |
| `pronuncia` | File TSV `Scritto<TAB>Letto` usato per la sintesi: serve a riportare i nomi alla grafia del libro | no |

Nel Markdown:

- `# Titolo` apre una nuova parte (opzionale: senza parti c'è un solo elenco);
- `## 1. Titolo` è il titolo del capitolo;
- `---` separa le scene;
- un paragrafo tutto in corsivo è una citazione; se è breve e senza punto finale, è la sua firma.

Senza `parole` l'evidenziazione delle parole è stimata dalla lunghezza. Se il testo del capitolo non coincide con quello letto, il lettore mostra le frasi dei sottotitoli.

Nel modo `audio` i capitoli sono i file `.mp3` della cartella `audio`, il `.vtt` non serve e il titolo viene dal nome del file (`001-la-nave.mp3` diventa «La nave»). Nel modo `testo` i capitoli sono i file Markdown e non serve niente altro.

## Dati del sito

`prepara.js` scrive:

- `audio/NNN.mp3`: audio compresso (mono, 48 kbit/s per restare sotto il limite di 1 GB di GitHub Pages con circa 40 ore);
- `testi/NNN.json`: paragrafi, `[{ "c": [[inizio, "frase", [inizio di ogni parola]], ...] }]`, con `"h": 1` per i titoli e `cit`, `firma`, `st` per citazioni, firme e stacchi; nel modo `testo` il paragrafo è `{ "s": "testo" }`, senza tempi;
- `capitoli.json`: `{ "modo": "...", "parti": [...], "capitoli": [{ "n", "titolo", "parte", "durata", "parole", "byte" }] }`.

Un capitolo può anche indicare il suo file invece di seguire la regola dei nomi: `"file"` per l'audio e `"testo"` per il testo, relativi a `base` oppure indirizzi completi. Così un libro può stare tutto su un altro sito e nella cartella basta `capitoli.json`: niente audio da copiare e `prepara.js` non serve.

```json
{ "modo": "audio", "parti": [], "capitoli": [
  { "n": 1, "titolo": "Il pezzo di legno", "file": "https://archive.org/download/.../cap_01.mp3", "durata": 335, "byte": 5365966 }
] }
```

Il sito che ospita i file deve servire CORS e le richieste a intervalli (`Accept-Ranges: bytes`); archive.org fa entrambe le cose, quindi i capitoli si ascoltano e si salvano sul dispositivo anche da lì.

Un capitolo compare nell'elenco come non ancora pronto finché gli manca la `durata` (o le `parole`, nel modo `testo`). Nel modo `testo` la durata della lettura è stimata a 200 parole al minuto.

## Limiti

- L'interfaccia è solo in italiano.
- I libri su un altro dominio hanno bisogno di CORS: senza, il lettore non ne legge l'indice, non ne riproduce l'audio e non li salva sul dispositivo.
- `catalogo.json` e `capitoli.json` conviene tenerli sul sito del lettore: i file dei capitoli, invece, possono stare altrove.
- Nel modo `testo` la posizione è la frazione di pagina già scorsa: cambiando dimensione del testo il punto resta quello.
- Colori e icona predefiniti: per un'icona diversa metti `icona.svg` nella cartella del sito prima di `crea-sito.js`.
  Per avere anche le icone PNG (schermata Home di iPhone, icone adattive di Android) lancia prima
  `python strumenti/icone.py <cartella del sito>/icona.svg` (richiede `pip install resvg_py`).
  Per la scheda del browser si può aggiungere `icona-piccola.svg`, una versione semplificata in un colore:
  senza, il browser rimpicciolisce `icona.svg`.
