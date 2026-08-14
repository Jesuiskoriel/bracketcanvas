# BracketCanvas

Application React/Vite pour composer des visuels Top 8 de tournois Super Smash Bros. Ultimate. BracketCanvas inclut des comptes privés, plusieurs projets par utilisateur et une sauvegarde synchronisée côté serveur.

## Lancer le projet

```bash
npm install
# Terminal 1 : API locale
npm run dev:api
# Terminal 2 : interface Vite
npm run dev
```

L’API de développement écoute sur le port `3001` et Vite lui transmet automatiquement les routes `/api`.

La version actuelle contient huit slots configurables, la bibliothèque locale des personnages et les réglages X/Y/zoom/flip. Le template « Zero — Comic Top 8 » utilise une direction pop-art rouge/noir, des textures halftone et des formes SVG éditables dont les coordonnées sont centralisées dans `src/data/template.js`. Les chiffres de placement disposent de réglages X/Y, taille, couleur et profondeur. Le fichier `Top 8 Zero.psd` reste l’archive de la direction artistique précédente.

## Crédits graphiques

Les renders `alt-1` en style fresque proviennent des [Mural Isolations d’ElevenZM](https://www.deviantart.com/elevenzm/gallery/70115610/mural-isolations-super-smash-bros-ultimate). Les illustrations originales « Everyone is Here » sont de Yusuke Nakano.

## Comptes et sauvegardes

- Les mots de passe sont dérivés avec `scrypt` et un sel aléatoire propre à chaque compte.
- Les sessions utilisent un cookie `HttpOnly`, `SameSite=Lax` et `Secure` en production.
- Chaque utilisateur possède une collection de projets indépendante dans SQLite.
- Les renders SSBU restent des assets statiques partagés ; seules leurs références sont sauvegardées.
- Les logos importés et tous les réglages du canvas sont conservés dans le workspace privé.

La base est créée par défaut dans `data/bracketcanvas.sqlite`. Ce dossier est ignoré par Git et doit être sauvegardé sur le serveur.

## Déploiement Docker

Le build de production inclut toute la bibliothèque de renders (environ 1,1 Go). Prévoir au moins 3 Go d’espace disque libre pendant la construction de l’image.

```bash
docker compose build
docker compose up -d
```

L’application écoute par défaut sur le port `3000`. En production, place-la derrière un reverse proxy HTTPS afin que le cookie de session sécurisé fonctionne correctement. Les comptes et projets sont conservés dans le volume Docker `bracketcanvas_data`.

Pour créer une copie de sauvegarde cohérente de SQLite :

```bash
docker compose exec bracketcanvas node -e "const {DatabaseSync}=require('node:sqlite');const db=new DatabaseSync('/app/data/bracketcanvas.sqlite');db.exec(\"VACUUM INTO '/app/data/bracketcanvas-backup.sqlite'\")"
```
