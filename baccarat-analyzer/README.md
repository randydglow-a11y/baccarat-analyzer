# Baccarat Analyzer

A local-first responsive React + TypeScript web app for reviewing completed baccarat shoes.

## Setup

Requires Node.js 20.19+ or 22.12+ and npm.

```bash
npm install
npm run dev
```

Open the localhost URL printed by Vite. For production:

```bash
npm run build
npm run preview
```

## Deploy

Create a GitHub repository, commit these files, and connect the repo to Netlify or Vercel. Build command: `npm run build`; output directory: `dist`. Alternatively use GitHub Pages with a suitable Vite deployment workflow. The Vite base is relative (`./`) for flexible hosting.

## Usage

Create a shoe, enter results in order, and explore the tabs. Shoes are saved in browser localStorage. Use Export JSON to back up or transfer them; Import JSON replaces the current local history.

## Scope and limitations

- Standard eight-deck Punto Banco theoretical probabilities are approximate and unconditional.
- The Big Road and derived roads are preliminary displays, not casino-certified implementations. Derived-road rendering is simplified and should not be used as a reference implementation.
- Simulation uses flat stakes, 5% Banker commission, and Tie pushes; it does not enforce bankroll availability or table limits.
- The simulator is retrospective and does not forecast or improve the theoretical house edge.
- No cloud sync, authentication, or card-level shoe composition engine yet.

## Next engineering steps

1. Add unit tests with documented road-layout fixtures, especially Dragon Tail and ties.
2. Implement canonical derived-road placement and colors for each road.
3. Add import validation, schema versioning, and indexedDB for larger datasets.
4. Add bankroll constraints, risk-of-ruin estimates, and reproducible Monte Carlo simulations.
5. Add card-level tracking and a validated finite-shoe conditional probability engine.
6. Add automated GitHub Actions tests and deployment.
