# Missile Command Reloaded

Prototipo arcade difensivo ispirato a Missile Command, con controllo missilistico via mouse, torrette manuali via tastiera, supporto co-op locale, IA alleata, fabbriche, punti costruzione, upgrade e ondate progressive.

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
- Freccia sinistra/destra: ruota la torretta selezionata
- Spazio: spara con la torretta
- 1/2/3 oppure Q/W/E: cannoncino, mitragliatrice, laser
- Pulsanti rapidi in basso a destra: cambio missili e torretta
- Ingranaggio in alto a destra: impostazioni
- Popup centrale tra le ondate: costruzione, upgrade, riparazioni e credito

## Struttura

- `index.html`: shell applicativa, overlay HUD, popup impostazioni e costruzione
- `src/main.js`: loop, stato, sistemi di gioco e input
- `src/styles.css`: layout e UI
- `docs/design.md`: regole di gioco, bilanciamento e roadmap
