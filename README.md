# BracketCanvas

Application web locale React/Vite pour composer progressivement des visuels Top 8 de tournois Super Smash Bros. Ultimate.

## Lancer le projet

```bash
npm install
npm run dev
```

La version actuelle contient huit slots configurables, la bibliothèque locale des personnages et les réglages X/Y/zoom/flip. Le template « Zero — Comic Top 8 » utilise une direction pop-art rouge/noir, des textures halftone et des formes SVG éditables dont les coordonnées sont centralisées dans `src/data/template.js`. Les chiffres de placement disposent de réglages X/Y, taille, couleur et profondeur. Le fichier `Top 8 Zero.psd` reste l’archive de la direction artistique précédente.

## Crédits graphiques

Les renders `alt-1` en style fresque proviennent des [Mural Isolations d’ElevenZM](https://www.deviantart.com/elevenzm/gallery/70115610/mural-isolations-super-smash-bros-ultimate). Les illustrations originales « Everyone is Here » sont de Yusuke Nakano.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
