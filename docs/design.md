# Design

## Pilastri

Il gioco mantiene il cuore del genere arcade defence: protezione delle citta, intercettazioni anticipate, risorse limitate e priorita sotto pressione. La versione multiplayer aggiunge ruoli asimmetrici, armi costruibili, produzione industriale e progressione tra le ondate.

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

Ogni slot ha tipo arma, livello, munizioni, cooldown e, per le torrette, calore separato. Le armi arrivano al livello 3.

## Armi

Lanciarazzi:

- Razzo balistico: esplode sul punto cliccato. Forte contro traiettorie prevedibili e gruppi; richiede mira e anticipazione. Ai livelli alti aumenta raggio e persistenza dell'esplosione.
- Razzo seeker: cerca bersagli in volo. Forte contro droni, MIRV e bersagli veloci; ha meno munizioni, esplosione piu piccola e cooldown lungo.

Torrette:

- Cannoncino AA: colpi lenti ad alto danno, efficace contro bersagli resistenti e bombe.
- Mitragliatrice: raffica rapida, ottima contro droni e missili leggeri, consuma molte munizioni.
- Laser: istantaneo e preciso, forte sui bersagli veloci, limitato da calore e consumo.

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
