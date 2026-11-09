#!/usr/bin/env node
// Un comando solo per gli strumenti di Leggio, anche da un altro progetto: npx leggio <comando>.
// Uso: leggio <comando> [argomenti]
const path = require('path');
const { spawnSync } = require('child_process');

const COMANDI = {
  prepara: ['prepara.js', '<cartella del libro>', 'prepara i dati: audio, testi, capitoli.json'],
  sito: ['crea-sito.js', '<cartella del sito>', 'mette o aggiorna il lettore nella cartella del sito'],
  prova: ['server.js', '<cartella del sito> [porta]', 'server locale per provare il sito']
};

const [comando, ...resto] = process.argv.slice(2);
if (!comando || !COMANDI[comando] || comando === 'aiuto') {
  const righe = Object.entries(COMANDI).map(([n, [, a, d]]) => `  leggio ${n} ${a}`.padEnd(45) + d);
  console.log(`Leggio ${require('../package.json').version}\n\n${righe.join('\n')}\n`);
  process.exit(comando && comando !== 'aiuto' ? 1 : 0);
}
const r = spawnSync(process.execPath, [path.join(__dirname, COMANDI[comando][0]), ...resto], { stdio: 'inherit' });
process.exit(r.status === null ? 1 : r.status);
