# Grit Royale

Poker roguelike (mécaniques de Balatro) × auto-battler (lobby façon Teamfight Tactics).
8 joueurs, 100 PV chacun : le dernier debout gagne.

## Démarrer

Il faut [Node.js](https://nodejs.org) 20 ou plus.

```bash
npm install
npm run dev
```

Ouvre ensuite l'adresse affichée (en général http://localhost:5173).

| Commande          | Rôle                                                       |
| ----------------- | ---------------------------------------------------------- |
| `npm run dev`     | Serveur de dev avec rechargement à chaud                   |
| `npm run build`   | Vérifie les types et construit la version finale (`dist/`) |
| `npm run sim`     | Simule 20 parties complètes (tests du moteur)              |

## Jouer avec des amis (en ligne)

1. Dans le menu, clique **EN LIGNE** : un salon s'ouvre avec un lien d'invitation.
2. Envoie le lien à tes amis. En l'ouvrant, chacun prend la place d'un bot (même en cours de partie).
3. Clique **LANCER LA PARTIE**. Si un ami quitte, un bot reprend sa place.

Aucun serveur à héberger : ton navigateur fait tourner la partie (et les bots), et tes amis s'y
connectent directement (WebRTC, via le service gratuit PeerJS qui sert juste à se trouver).
Garde ton onglet ouvert pendant la partie. Il faut seulement que la page du jeu soit en ligne pour
que tes amis puissent l'ouvrir : voir « Mettre le jeu en ligne ».

Pour tester à plusieurs sur un seul ordi : ouvre `http://localhost:5173/?local=1`, crée un salon,
puis ouvre le lien d'invitation dans un autre onglet du même navigateur.

## Mettre le jeu en ligne (GitHub Pages, gratuit)

1. Crée un dépôt **public** sur GitHub (ex. `grit-royale`).
2. Dans le dossier du jeu :
   ```bash
   git init
   git add .
   git commit -m "Grit Royale"
   git branch -M main
   git remote add origin https://github.com/TON-NOM/grit-royale.git
   git push -u origin main
   ```
3. Sur GitHub : **Settings → Pages → Source : GitHub Actions**.
4. Après environ une minute, le jeu est sur `https://TON-NOM.github.io/grit-royale/`.
   Chaque nouveau `git push` le met à jour automatiquement.

## Règles

- **Combat** : chaque round, tu es jumelé au hasard avec un joueur vivant du lobby. Vous jouez chacun
  **4 mains** (avec **3 défausses**, 8 cartes en main). Le plus gros total gagne.
  Si le nombre de joueurs est impair, quelqu'un affronte un **fantôme** (copie d'un autre joueur, qui ne perd pas de PV).
- **Score d'une main** = (jetons de la main + valeur des cartes qui comptent) × **Grit**.
- **Dégâts** au perdant = `2 + round/2` + jusqu'à 8 selon l'écart de score (+ effets de jokers).
- **Or** après chaque round : 5 $ de base, +1 $ d'intérêt par tranche de 5 $ (max 5), +1 $ par victoire,
  bonus de série (victoires *ou* défaites) : +1 (2–3), +2 (4), +3 (5+).
- **Boutique** (propre à chaque joueur) : 3 cartes (jokers, tarots, planètes, rarement spectrales),
  2 paquets, 1 bon. Relance : 2 $ (+1 à chaque relance).
- **Jokers** : jusqu'à **10** (les Négatifs ne prennent pas de place). L'ordre compte. Revente = moitié du prix.
- **Consommables** : 2 emplacements. Tarots = améliorer les cartes du paquet ; Planètes = monter le niveau d'une main.

## Contenu

- **95 jokers** inspirés de Balatro (Joker, Jovial, Dans le Bus, Plan, Remue-méninges, Baron, Vampire, Quatre Doigts…)
  plus des **jokers de lobby** originaux pour le PvP : Le Revanchard, Série Chaude, Le Survivant, Le Bourreau,
  Le Bouclier, Le Parasite, Le Charognard, L'Outsider.
- **22 tarots**, **12 planètes**, **18 spectrales** (dont L'Âme → jokers légendaires).
- **Améliorations** de cartes (Bonus, Grit, Joker, Verre, Acier, Pierre, Or, Chance), **éditions**
  (Métallique, Holographique, Polychrome, Négatif) et **sceaux** (doré, rouge, bleu, violet).
- **Paquets** Arcane, Céleste, Spectral, Bouffon, Standard (normal / Jumbo / Méga).
- **13 bons**, dont 2 pour le PvP : Armure (+25 PV max) et Forteresse (−2 dégâts subis).
- **Bots** : jouent avec le même moteur que toi (meilleure main parmi toutes les combinaisons, défausses,
  achats, économie). Chaque bot a son niveau, sa gourmandise et sa main préférée.

## Organisation du code

```
src/engine/   moteur du jeu, sans React (réutilisable tel quel sur un serveur pour le multijoueur en ligne)
  types.ts        types de base
  cards.ts        cartes, améliorations, éditions, sceaux
  hands.ts        évaluation des mains de poker + niveaux
  scoring.ts      calcul jetons × Grit (ordre : cartes jouées → cartes en main → jokers)
  jokers.ts       tous les jokers (ajouter un joker = ajouter un objet dans la liste)
  consumables.ts  tarots, planètes, spectrales
  shop.ts         boutique, paquets, bons
  combat.ts       jouer / défausser
  bot.ts          IA des bots
  game.ts         lobby, appariements, dégâts, économie, éliminations, humains ↔ bots (CONFIG)
  actions.ts      toutes les actions d'un joueur (ce que l'hôte applique)
src/net/      session.ts : solo, hôte, invité (PeerJS / BroadcastChannel pour les tests)
src/ui/       interface React style Balatro
  App.tsx         écrans (menu, combat, boutique, fin de partie) + animation du calcul
  art.tsx         pixel art en SVG : cartes, figures, jokers (générés par joker), tarots, planètes, paquets, bons
  Background.tsx  fond psychédélique animé (shader WebGL) + effet CRT
  parts.tsx       cartes avec effet 3D, info-bulles colorées, panneaux
  styles.css      style « gros pixels » (police Jersey 10)
scripts/      simulation de parties
```

## Prochaines étapes possibles

- Sons et musique, art dédié pour chaque joker.
- Équilibrage (valeurs dans `CONFIG` de `game.ts` et dans chaque joker).
