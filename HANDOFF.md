# Passaggio di consegne – Leggio

Aggiornato il 9 novembre 2026 (scaffale e modi del libro). Rispondi all'utente in italiano, in modo breve: spesso detta dal telefono e manda screenshot.

## Obiettivo

Leggio è il lettore web dell'audiolibro di «L'ultima alba di Dalmasca», reso generico per qualsiasi libro. Il lettore originale è in `C:\Users\matteo\Documents\FFXII - Romanzo\docs`, pubblicato da https://github.com/maxeo/ultima-alba-di-dalmasca.

È una PWA statica: testo con evidenziazione della frase e della parola lette, uso offline e installazione sul telefono.

Richiesta dell'utente: un nuovo repository con il lettore generalizzato, da provare in locale. Serve anche un'icona con un nome migliore: il nome scelto è «Leggio».

Richiesta successiva: un livello in più per scegliere il libro, con i libri presi da un **catalogo remoto**, e il lettore deve reggere anche libri di **solo audio** e di **solo testo**. Fatto; i libri di prova vengono da LibriVox e Project Gutenberg.

Richiesta successiva: lo strumento deve essere **facile da integrare** in un altro progetto e usabile **con un libro solo**, e il sito del romanzo su GitHub Pages deve usare Leggio invece del suo vecchio lettore. Fatto: c'è `package.json` con il comando `leggio`, e `C:\Users\matteo\Documents\FFXII - Romanzo\docs` ora è generato da Leggio.

## Regole dell'utente

- Commit solo su richiesta: messaggio in italiano, prima riga al passato e lunga al massimo 60 caratteri, **mai `Co-Authored-By`**. Mai force-push. Niente push finché l'utente non lo dice.
- Le icone si costruiscono **con primitive SVG** (ellissi, archi, rettangoli), non tracciando il raster.
- Per le proposte: opzioni numerate, poi «Io preferisco la X».

## Stato attuale

`C:\Users\matteo\Documents\leggio` è un repository git con i commit. `.gitignore` esclude `prova/`, `node_modules/` e `icone/gen*/` (40 MB di mosaici generati: se vanno tenuti, chiedere all'utente). È pubblicato su https://github.com/maxeo/leggio (pubblico, licenza MIT), rilascio `v1.0.0`. GitHub Pages serve `docs/` su https://maxeo.github.io/leggio/: è la copia dello scaffale di prova (`prova/scaffale`, che resta ignorato da git) con i testi del catalogo cambiati da «prova» a «esempio», 12 MB di cui 9,7 sono l'audio del canto I. Si rifa' copiando `prova/scaffale/libri` e `catalogo.json` in `docs/` e lanciando `node strumenti/leggio.js sito docs`.

Il lettore legge più libri da `catalogo.json`, anche da un altro dominio, e ogni libro ha un modo: `sincronizzato`, `audio`, `testo`. Con un libro solo il sito resta com'era, senza scaffale. I dettagli dei formati stanno nel README.

- **`package.json`:** il pacchetto si installa in un altro progetto con `npm install --save-dev github:maxeo/leggio` e porta il comando `leggio`, cioè `strumenti/leggio.js`: `leggio prepara`, `leggio sito` e `leggio prova` lanciano i tre script con gli stessi argomenti. `files` pubblica solo `lettore/` e `strumenti/` (250 KB). Licenza MIT in `LICENSE`.
- **Il romanzo usa Leggio:** in `C:\Users\matteo\Documents\FFXII - Romanzo` c'è `docs/libro.json` con la chiave **`alba`**, quella del vecchio lettore, così i lettori non perdono i progressi già salvati; i vecchi badge dei traguardi di tempo restano in `alba-stato-v1` ma ora contano quelli generali. `Audiolibro/pubblica.js` scrive i dati e poi lancia `crea-sito.js`, cercandolo in `$LEGGIO`, `node_modules/leggio` e `../leggio`. `docs/` non ha le icone PNG: `crea-sito.js` non tocca l'icona del sito quando è diversa dalla sua, quindi l'icona di Dalmasca resta.
- **Traguardi:** con più libri stanno in due tab (`corpoInCorso` e `corpoGenerali`); con un libro solo, cioè `CATALOGO.solo`, `corpoTraguardi` chiama `corpoSolo` e le fonde in una lista unica di sei numeri e tredici traguardi. `traguardiGen` nasconde «Il primo libro» sotto i due libri, «Tutto lo scaffale» sotto i due e «Tre libri» sotto i tre.
- **`lettore/`:** il modello del lettore.
  - `index.html` ha i segnaposto `{{titolo}}`, `{{lingua}}`, `{{descrizione}}`, `{{sottotitolo}}`, `{{avviso}}`, `{{libro}}`, `{{iconaPiccola}}` e `{{iconaTouch}}`. Con un catalogo `{{libro}}` vale `null`.
  - `sw.js` ha `{{chiave}}` e `{{fileIcone}}`. La cache ora si chiama `-shell-v4` e tiene le cache `<chiave del libro>-audio-v1` di tutti i libri.
  - Nel lettore: lo scaffale sta in `#alto-scaffale` e `#main-scaffale`, il libro in `#alto-libro` e `#main-libro`; `apriLibro`, `mostraScaffale` e `instrada` fanno il giro. Il modo del libro sta in `data-modo` sull'elemento radice e il CSS nasconde quello che non serve. Le impostazioni comuni (tema, carattere, comandi) stanno in `leggio-impostazioni-v1`, i progressi in `<chiave>-stato-v1`.
  - Icone: `icona.svg` (l'icona definitiva), `icona-piccola.svg` (versione monocromatica a 16 px per la scheda del browser: scura sui temi chiari, crema sui temi scuri), `icona-180.png` (iPhone, quadrato pieno), `icona-192.png`, `icona-512.png` e `icona-maskable.png` (512 px, disegno rimpicciolito di 1,15 per la zona sicura di Android).
  - `caratteri/`: Pinyon Script.
- **`strumenti/`:**
  - `prepara.js`: da capitoli in Markdown, audio mp3 e sottotitoli vtt crea `audio/`, `testi/` e `capitoli.json`. Le sorgenti si indicano in `libro.json`. Regge i tre modi; con `"ffmpeg": false` copia l'audio com'è e la durata la legge dai fotogrammi del mp3, senza ffprobe.
  - `crea-sito.js`: riempie il modello e scrive il manifest. Copia l'icona predefinita, i PNG e `icona-piccola.svg` solo se il sito non ha un `icona.svg` proprio. Il manifest e il service worker elencano solo le icone presenti.
  - `server.js`: server statico con supporto Range.
  - `icone.py`: crea i 4 PNG da un `icona.svg` qualsiasi. Richiede `resvg_py`.
- **`README.md`:** documentazione in italiano.
- **`icone/`:** la storia dell'icona.
  - Da `gen1` a `gen4` ci sono i mosaici generati da Codex, con prompt, log, celle e fogli.
  - `taglia.py` taglia un mosaico in celle.
  - `finale.png` è l'icona raster scelta.
  - **`leggio.svg` è l'icona finale da primitive**, identica a `lettore/icona.svg`.
- **`prova/`:** siti di prova, non tracciati.
  - `prova/sito` contiene i capitoli 1-3 del romanzo, come libro solo: porta 8780.
  - `prova/semplice/sito` è un libro senza parti: porta 8781.
  - `prova/scaffale` è lo scaffale di prova: porta 8782, 12 MB, di cui 10 sono l'audio del canto generato qui; il resto sta su altri siti. I libri sono quattro: Dalmasca (sincronizzato, `base` su `https://maxeo.github.io/ultima-alba-di-dalmasca/`, 113 capitoli), Pinocchio solo audio (da archive.org), I promessi sposi solo testo (locale, 38 capitoli) e il canto I dell'Inferno (sincronizzato, generato qui).
  - `libri/pinocchio-audio` non ha audio in locale: il suo `capitoli.json` punta ai 36 file di `https://archive.org/details/avventure_pinocchio_librivox` («Le avventure di Pinocchio» lette da Simona, pubblico dominio), ed è costruito con `prova/da-archive.py`. Provato: si ascolta e si salva sul dispositivo; archive.org serve CORS `*`, `Accept-Ranges` e 206.
  - `prova/sorgenti-promessi`: «I promessi sposi» da Project Gutenberg, ebook 45334, con i capitoli ricavati da `prova/da-gutenberg.py`. Lo script riconosce due modi di scrivere i capitoli: il numero romano da solo, e allora la riga dopo è il titolo del capitolo (Pinocchio), oppure «CAPITOLO III.», e allora il capitolo si chiama «Capitolo 3» perché un titolo suo non ce l'ha (Manzoni).
  - `prova/sorgenti-inferno`: il canto I generato qui. L'audio viene da `tts.sh` del romanzo (7 minuti, 10 MB, nessuna compressione perché `"ffmpeg": false`), i tempi delle parole da `controlla.sh`, cioè Whisper, copiati in `parole/001-canto-1.parole.json`. `prepara.js` dice «testo esatto»: le 137 righe lette combaciano con i 137 versi. Provato nel browser: la frase si illumina e dentro la frase la parola letta in quel momento.
  - `prova/sorgenti-inferno`: la Divina Commedia da Project Gutenberg, ebook 1012, e il canto I ricavato con `prova/da-commedia.py` (un verso per paragrafo, più il testo per la sintesi in `letto/`). L'audio si genera con la catena di FFXII (`Audiolibro/tts.sh`) e i tempi delle parole con `Audiolibro/controlla.sh`.
  - I server si avviano con `node strumenti/server.js prova/scaffale 8782`. Non ci sono launch.json in questo repository.
  - In `prova/sito` restano anche file di lavoro dell'icona: `parziale*.svg`, `combinato.svg`, `confronto.html` e simili. Si possono cancellare.
- **ArtCraft:** in `C:\Users\matteo\Documents\ArtCraft\leggio\` ci sono `rifinito.svg`, `riferimento.png` e le sovrapposizioni. VectorCraft live si apriva sulla porta 47102.

L'utente ha approvato l'icona: «mi piace come è adesso». Ha chiesto lui sia i PNG sia l'icona monocromatica per la scheda.

## Cosa ha funzionato

- **Codex per le immagini:**
  - Comando: `codex exec --ephemeral --skip-git-repo-check --sandbox read-only -C . -i ref.png - < prompt.txt`. Con `--ephemeral` ogni generazione parte con la memoria vuota.
  - L'immagine generata si trova cercando `.png` nel log.
  - Mosaici 4×4: con 16×16 le icone erano troppe e Codex disegnava comunque griglie 14×14 o 15×15.
  - `taglia.py` individua le bande delle celle dallo sfondo.
- **Icona da primitive:**
  - Si rasterizza l'SVG con `resvg_py` e si misura la IoU per colore contro il PNG.
  - Nelder-Mead regola pochi parametri alla volta: libro con due ellissi e un taglio, padiglione con un'ellisse e un taglio.
  - Gli script sono nello scratchpad della sessione: `valuta.py` e `rifinisci.py`.
  - Risultato finale: crema 0,983, libro 0,962, padiglione destro 0,991.
- **Verifica nel browser:** prima si tolgono il service worker e la cache (`getRegistrations().unregister()`, `caches.delete`), poi si ricarica la pagina.

### Modi del libro

- `sincronizzato`: come prima, audio e testo che si seguono.
- `audio`: niente `testi/`, niente pulsante del testo; i capitoli sono i file mp3 e il titolo viene dal nome del file.
- I traguardi di tempo, serie, giorni e libri finiti sono generali e stanno in `stato.trofei`, salvato con le impostazioni comuni; quelli dei capitoli restano per libro in `stato.traguardi`. Chi aveva già preso un traguardo di tempo su un libro lo ritrova nel tab generale solo quando lo rifa sullo scaffale: i vecchi badge per libro restano salvati ma non si mostrano più.
- `testo`: niente lettore audio; la pagina del testo è la lettura, la posizione è la frazione di pagina scorsa (si salva 400 ms dopo che lo scorrimento si ferma, e oltre il 98% il capitolo è letto) e il tempo passato a leggere conta come ascolto per i traguardi.

## Cosa non ha funzionato (non ripetere)

- Il leggio come soggetto dell'icona: l'utente l'ha giudicato «terribile». Il soggetto scelto è cuffie, forma d'onda e libro.
- Le mie scelte delle celle (05-03 sembrava il simbolo del wifi, 01-08): ha scelto l'utente. Prima di generare varianti bisogna rifare in HD l'immagine di riferimento.
- Ripartire da zero con l'SVG: bisogna partire dall'ultima versione quasi giusta.
- Nelder-Mead con molte valutazioni (maxfev 500): è troppo lento e la sessione si è bloccata a lungo.
- Il padiglione destro come specchio del sinistro: nel disegno non è simmetrico.
- `rm` con glob è bloccato dai controlli di sicurezza: sovrascrivere i file invece di cancellarli.
- `ffmpeg` non è nel PATH su questa macchina; c'è docker, e `e2a-frasi:latest` contiene ffmpeg e ffprobe, ma i percorsi di Windows non arrivano dentro il contenitore. Per questo `prepara.js` ora sa leggere la durata del mp3 da sé.
- L'API di LibriVox filtra male per lingua e risponde 403 sulla ricerca per titolo: conviene cercare su `archive.org/advancedsearch.php` con `collection:librivoxaudio`.
- L'ebook 19517 di Gutenberg è la registrazione, non il testo: il testo di Pinocchio è il 52484.
- `gutendex.com` non si raggiunge da qui: usare `www.gutenberg.org`.
- Nel browser interno il service worker non si registra («An unknown error occurred when fetching the script»): l'uso senza rete va provato in un browser vero.
- Cambiando solo la parte dopo `#` la pagina non si ricarica: dopo una modifica al lettore serve un `location.reload()`.

## Prossimi passi

1. Creare il repository su GitHub e fare il push, solo quando l'utente lo dice.
2. Provare anche un `base` intero su un altro dominio: per ora è remoto solo l'audio, non `capitoli.json`.
3. Nel modo `audio` i titoli dei capitoli vengono dal nome del file: per un libro di LibriVox conviene scrivere `capitoli.json` con i titoli veri, come fa `prova/da-archive.py`.
3. Facoltativo: un'immagine PNG per `mediaSession` (l'artwork della schermata di blocco), perché l'SVG lì è supportato poco.
4. Facoltativo, idea dalla ricerca iniziale: esportare in EPUB 3 Media Overlays. Readest, Thorium e Storyteller supportano già questo formato, mentre Readest ha rifiutato di importare file di sincronizzazione esterni (readest/readest#6854).
5. Facoltativo: portare nel lettore FFXII (`docs/`) la nuova icona, solo se l'utente lo chiede.
6. Provare su un telefono vero l'installazione e le icone di iPhone e Android.
