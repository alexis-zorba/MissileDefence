# Design

## Pilastri

Il gioco mantiene il cuore di Missile Command: protezione delle citta, intercettazioni anticipate, risorse limitate e priorita sotto pressione. La versione Reloaded aggiunge ruoli asimmetrici, armi costruibili, produzione industriale e progressione tra le ondate.

## Modalita

- Giocatore missili, computer torrette
- Giocatore torretta, computer missili
- Co-op locale: mouse per missili, tastiera per torretta

## Citta

Ogni citta ha salute, fabbrica, arma installata, livello arma, munizioni, munizioni speciali e scudo. Le fabbriche generano punti costruzione tra le ondate; citta danneggiate producono meno, citta distrutte non producono.

## Armi

Missili:

- Standard: economico e affidabile
- HE: esplosione ampia, lento e costoso
- Frammentazione: sub-esplosioni contro sciami
- Guidato: correzione leggera verso bersagli prioritari
- EMP: forte contro droni, jammer e bombe elettroniche

Torrette:

- Cannoncino AA: colpi lenti ad alto danno
- Mitragliatrice: raffica rapida contro droni e bombe
- Laser: istantaneo, preciso, limitato dal calore

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

## Roadmap

- Separare ulteriormente i sistemi in moduli dedicati
- Aggiungere schermata iniziale completa
- Salvare record e impostazioni in localStorage
- Aggiungere log debug opzionale
- Introdurre campagna con settori e infrastrutture persistenti
