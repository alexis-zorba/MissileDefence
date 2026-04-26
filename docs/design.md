# Design

## Pilastri

Il gioco mantiene il cuore del genere arcade defence: protezione delle citta, intercettazioni anticipate, risorse limitate e priorita sotto pressione. La versione multiplayer aggiunge ruoli asimmetrici, armi costruibili, produzione industriale e progressione tra le ondate.

## Architettura (v0.2.0 — Refactored)

Il codice è stato modularizzato in 14 file con separazione netta delle responsabilità:

```
src/
  main.js                  ← Entry point (~120 righe): bootstrap, game loop, orchestratore
  state.js                 ← Stato centralizzato + event emitter per UI reattiva e debug
  config.js                ← Costanti: dimensioni, difficoltà, armi, nemici, costi upgrade
  utils.js                 ← Utility pure: nearest(), clampAngle(), makeId()
  styles.css               ← CSS design system con custom properties e responsive
  core/
    wave.js                ← Gestione ondate (start, finish, calcolo spawn, produzione)
    economy.js             ← Crediti e sistema upgrade (spendUpgrade)
  entities/
    weapons.js             ← Lancio missili, fuoco torrette, controllo rotazione giocatore
    enemies.js             ← Spawn nemici, movimento, comportamenti speciali (MIRV, bomber, jammer)
    projectiles.js         ← Movimento missili amici e proiettili
    effects.js             ← Esplosioni (blast) e particelle, cleanup entità morte
  systems/
    combat.js              ← Danno, collisioni, priorità targeting, ray tracing laser
    ai.js                  ← IA alleata (3 livelli skill), auto-mira torrette e missili
    input.js               ← Gestione input tastiera e mouse
  rendering/
    renderer.js            ← Tutto il disegno Canvas: cielo, città, fabbriche, armi, nemici, effetti
  ui/
    ui.js                  ← Riferimenti DOM, aggiornamento HUD, gestione dialog
  debug/
    logger.js              ← Logger a livelli, snapshot stato, metriche FPS/entità
```

### Principi architetturali

- **Moduli con stato condiviso**: ogni modulo importa direttamente `state` da [`state.js`](src/state.js) — nessun passaggio esplicito di parametri, ma lo stato è centralizzato e osservabile
- **Single responsibility**: ogni file ha un solo motivo per cambiare
- **Event emitter**: `state.js` notifica i cambiamenti a UI e logger
- **Zero dipendenze esterne**: vanilla JS ES modules, nessun framework

### Grafo delle dipendenze

```
main.js
  ├── state.js ← config.js, utils.js
  ├── rendering/renderer.js ← state.js, config.js
  ├── entities/weapons.js ← state.js, config.js, systems/combat.js
  ├── entities/enemies.js ← state.js, config.js, systems/combat.js, entities/effects.js
  ├── entities/projectiles.js ← state.js, config.js, entities/effects.js
  ├── entities/effects.js ← state.js, config.js
  ├── systems/combat.js ← state.js, config.js
  ├── systems/ai.js ← state.js, entities/weapons.js, systems/combat.js
  ├── systems/input.js ← state.js, entities/weapons.js
  ├── core/wave.js ← state.js
  ├── core/economy.js ← state.js, config.js
  ├── ui/ui.js ← state.js, config.js, core/economy.js, core/wave.js
  └── debug/logger.js ← (standalone)
```

## Modalita

- Giocatore missili, computer torrette
- Giocatore torretta, computer missili
- Co-op locale: mouse per missili, tastiera per torretta

Il controllo missilistico e globale: ogni click genera una salva convergente da tutti i lanciamissili installati. Il controllo torretta e globale: tutte le torrette condividono una direzione parallela e sparano in modo coordinato.

## Basi e fabbriche

Ogni zona ha una base difensiva e fino a tre fabbriche attorno. La base ospita armi, munizioni e scudo; le fabbriche producono credito costruzione tra le ondate e possono essere danneggiate separatamente.

Ogni base ha quattro slot arma:

- 2 slot lanciarazzi
- 2 slot torretta

Ogni slot ha tipo arma, livello, munizioni, cooldown e usura meccanica. Le armi arrivano al livello 3.

L'usura e calcolata in numero di colpi sparati. Ogni sparo consuma 1 punto vita arma; quando la vita arriva a zero, l'arma si rompe e lo slot torna libero. La ricarica munizioni non ripara l'usura. L'upgrade invece installa componenti nuovi e ripristina la vita massima del livello raggiunto.

Valori attuali di vita arma:

| Arma | L1 | L2 | L3 |
| --- | ---: | ---: | ---: |
| Razzo balistico | 72 | 104 | 136 |
| Razzo seeker | 40 | 60 | 80 |
| Cannoncino | 360 | 500 | 660 |
| Mitragliatrice | 1040 | 1440 | 1920 |
| Laser | 220 | 300 | 400 |

## Armi

Lanciarazzi:

- Razzo balistico: esplode sul punto cliccato. Forte contro traiettorie prevedibili e gruppi; richiede mira e anticipazione. Ai livelli alti aumenta raggio e persistenza dell'esplosione.
- Razzo seeker: cerca bersagli in volo. Forte contro droni, MIRV e bersagli veloci; ha meno munizioni, esplosione piu piccola e cooldown lungo.

Torrette:

- Cannoncino AA: colpi lenti ad alto danno, efficace contro bersagli resistenti e bombe.
- Mitragliatrice: raffica rapida, ottima contro droni e missili leggeri, consuma molte munizioni.
- Laser: istantaneo e preciso, forte sui bersagli veloci, limitato da energia e vita meccanica.

## Nemici

- Missile base
- MIRV che si separa
- Missile corazzato
- Missile ipersonico
- Drone esplosivo agile
- Drone jammer
- Bombardiere
- Bomba a caduta

## Progressione

Le ondate aumentano numero di nemici, velocita, mix tattico e frequenza di minacce speciali. La difficolta modifica velocita, quantita, produzione, precisione dell'IA e resistenza delle citta.

## Debug

Attivando "Debug calibrazione" nelle impostazioni:

- **Logger**: log a livelli (DEBUG, INFO, WARN, ERROR) su console
- **Snapshot**: ogni 2 secondi viene stampato lo stato completo (ondata, entità, HP città, FPS)
- **Metriche**: contatore FPS e conteggio entità vive
- **Game speed**: slider per rallentare/accelerare la simulazione
- **Visual scale**: slider per ridimensionare il rendering

## Roadmap

- [x] Separare i sistemi in moduli dedicati
- [x] Aggiungere infrastruttura di debug/logging
- [ ] Aggiungere schermata iniziale completa
- [ ] Salvare record e impostazioni in localStorage
- [ ] Test automatizzati per i moduli core
- [ ] Performance profiling e ottimizzazione rendering
- [ ] Introdurre campagna con settori e infrastrutture persistenti
