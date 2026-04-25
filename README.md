# Missile Defence Multiplayer

Prototipo arcade difensivo con controllo missilistico via mouse, torrette manuali via tastiera, supporto co-op locale, IA alleata, fabbriche, punti costruzione, upgrade e ondate progressive.

## Avvio

Il gioco e statico, ma usa moduli ES: va servito via HTTP. Su Netlify funziona senza build.

Per servirlo localmente:

```bash
python3 -m http.server 4173
```

## Pubblicazione Netlify

Configurazione gia inclusa in `netlify.toml`.

- Build command: vuoto
- Publish directory: `.`

Collega il repository GitHub a Netlify e usa le impostazioni sopra.

## Controlli

- Mouse: click sul campo per lanciare missili verso il punto scelto
- Mouse: ogni click lancia una salva da tutti i lanciarazzi disponibili; i balistici convergono sul punto, i seeker cercano bersagli
- Freccia sinistra/destra: ruota tutte le torrette in parallelo
- Spazio: spara con tutte le torrette disponibili
- Footer comandi: avvio/pausa e stato visuale delle citta
- Ingranaggio in alto a destra: impostazioni
- Icona info in alto a destra: stato citta e arsenali
- Popup centrale tra le ondate: costruzione, upgrade, riparazioni e credito

## Armi

Ogni base ha 4 slot: 2 lanciarazzi e 2 torrette. Le armi arrivano al livello 3.

- Razzo balistico: esplosione sul punto cliccato, raggio crescente.
- Razzo seeker: ricerca bersagli, cooldown lungo, meno munizioni.
- Cannoncino: lento, alto danno.
- Mitragliatrice: rapida, ottima contro droni, consuma molto.
- Laser: istantaneo e preciso, limitato dal calore.

## Struttura

```
src/
  main.js                  ← Entry point (~120 righe): bootstrap, game loop
  state.js                 ← Stato centralizzato + event emitter
  config.js                ← Costanti: difficoltà, armi, nemici, costi
  utils.js                 ← Utility: nearest(), clampAngle(), makeId()
  styles.css               ← CSS design system
  core/
    wave.js                ← Gestione ondate
    economy.js             ← Crediti e sistema upgrade
  entities/
    weapons.js             ← Lancio missili, fuoco torrette
    enemies.js             ← Spawn e comportamento nemici
    projectiles.js         ← Movimento missili e proiettili
    effects.js             ← Esplosioni e particelle
  systems/
    combat.js              ← Danno, collisioni, targeting
    ai.js                  ← IA alleata (3 livelli)
    input.js               ← Tastiera e mouse
  rendering/
    renderer.js            ← Disegno Canvas (~700 righe)
  ui/
    ui.js                  ← DOM, HUD, dialog
  debug/
    logger.js              ← Logger, snapshot, metriche FPS
```

Architettura modulare con separazione netta: ogni file ha una singola responsabilità.
- `index.html`: shell applicativa, overlay HUD, popup impostazioni e costruzione
- `docs/design.md`: regole di gioco, bilanciamento, architettura e roadmap
