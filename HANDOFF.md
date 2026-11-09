# Passaggio di consegne – Leggio

Aggiornato il 9 novembre 2026. Rispondi all'utente in italiano, in modo breve: spesso detta dal telefono e manda screenshot.

## Obiettivo

Leggio è il lettore web dell'audiolibro di «L'ultima alba di Dalmasca», reso generico per qualsiasi libro. Il lettore originale è in `C:\Users\matteo\Documents\FFXII - Romanzo\docs`, pubblicato da https://github.com/maxeo/ultima-alba-di-dalmasca.

È una PWA statica: testo con evidenziazione della frase e della parola lette, uso offline e installazione sul telefono.

Richiesta dell'utente: un nuovo repository con il lettore generalizzato, da provare in locale. **Non va ancora spinto su GitHub.** Serve anche un'icona con un nome migliore: il nome scelto è «Leggio».

## Regole dell'utente

- Commit solo su richiesta: messaggio in italiano, prima riga al passato e lunga al massimo 60 caratteri, **mai `Co-Authored-By`**. Mai force-push. Niente push finché l'utente non lo dice.
- Le icone si costruiscono **con primitive SVG** (ellissi, archi, rettangoli), non tracciando il raster.
- Per le proposte: opzioni numerate, poi «Io preferisco la X».

## Stato attuale

`C:\Users\matteo\Documents\leggio` è stato creato con `git init`, ma non ha **nessun commit**: tutti i file sono non tracciati. `.gitignore` esclude `prova/` e `node_modules/`.

- **`lettore/`:** il modello del lettore.
  - `index.html` ha i segnaposto `{{titolo}}`, `{{lingua}}`, `{{descrizione}}`, `{{sottotitolo}}`, `{{avviso}}`, `{{libro}}`, `{{iconaPiccola}}` e `{{iconaTouch}}`.
  - `sw.js` ha `{{chiave}}` e `{{fileIcone}}`. La cache ora si chiama `-shell-v3`.
  - Icone: `icona.svg` (l'icona definitiva), `icona-piccola.svg` (versione monocromatica a 16 px per la scheda del browser: scura sui temi chiari, crema sui temi scuri), `icona-180.png` (iPhone, quadrato pieno), `icona-192.png`, `icona-512.png` e `icona-maskable.png` (512 px, disegno rimpicciolito di 1,15 per la zona sicura di Android).
  - `caratteri/`: Pinyon Script.
- **`strumenti/`:**
  - `prepara.js`: da capitoli in Markdown, audio mp3 e sottotitoli vtt crea `audio/`, `testi/` e `capitoli.json`. Le sorgenti si indicano in `libro.json`.
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
  - `prova/sito` contiene i capitoli 1-3 del romanzo. Si avvia con launch.json `lettore-generico`, porta 8780.
  - `prova/semplice/sito` è un libro senza parti: `lettore-semplice`, porta 8781.
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

## Cosa non ha funzionato (non ripetere)

- Il leggio come soggetto dell'icona: l'utente l'ha giudicato «terribile». Il soggetto scelto è cuffie, forma d'onda e libro.
- Le mie scelte delle celle (05-03 sembrava il simbolo del wifi, 01-08): ha scelto l'utente. Prima di generare varianti bisogna rifare in HD l'immagine di riferimento.
- Ripartire da zero con l'SVG: bisogna partire dall'ultima versione quasi giusta.
- Nelder-Mead con molte valutazioni (maxfev 500): è troppo lento e la sessione si è bloccata a lungo.
- Il padiglione destro come specchio del sinistro: nel disegno non è simmetrico.
- `rm` con glob è bloccato dai controlli di sicurezza: sovrascrivere i file invece di cancellarli.

## Prossimi passi

1. Fare un commit di Leggio, solo su richiesta dell'utente. Prima conviene cancellare da `prova/sito` i file di lavoro dell'icona; `prova/` comunque è già esclusa da git.
2. Creare il repository su GitHub e fare il push, solo quando l'utente lo dice.
3. Facoltativo: un'immagine PNG per `mediaSession` (l'artwork della schermata di blocco), perché l'SVG lì è supportato poco.
4. Facoltativo, idea dalla ricerca iniziale: esportare in EPUB 3 Media Overlays. Readest, Thorium e Storyteller supportano già questo formato, mentre Readest ha rifiutato di importare file di sincronizzazione esterni (readest/readest#6854).
5. Facoltativo: portare nel lettore FFXII (`docs/`) la nuova icona, solo se l'utente lo chiede.
6. Provare su un telefono vero l'installazione e le icone di iPhone e Android.
