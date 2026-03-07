# ✦ MTG Hand Oracle

A Magic: The Gathering starting hand emulator and deck analysis tool. Import your decklist, analyze mana curves and color requirements, detect ramp cards, and run thousands of simulated games to determine how consistently your deck produces playable opening hands.

## Features

- **Deck Import** — Paste decklists in MTGO/Arena format (`4 Lightning Bolt`). Supports both 60-card and Commander (100-card) formats.
- **Deck Analysis** — Mana curve chart, color distribution, color requirement breakdown, and automatic ramp card detection via [Scryfall API](https://scryfall.com/docs/api).
- **Hand Simulator** — Draw 7-card starting hands with full Scryfall card images. Evaluate hand quality (Keep / Risky / Mulligan) with turn-by-turn analysis. Supports London mulligan.
- **Statistical Simulation** — Monte Carlo engine that runs 100–10,000 automated games to calculate playability scores, brick rates, mana utilization per turn, and score distributions.

## Tech Stack

- **React** + **TypeScript** (Vite)
- **Recharts** for data visualization
- **Scryfall API** for card data and images
- **Web Workers** for off-main-thread simulation

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Build

```bash
npm run build
```

Output is written to `dist/`.

## Deployment

Deployments are handled via GitHub Actions on push to `main`. See [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

### Required Secrets

| Secret | Description |
|---|---|
| `WIREGUARD_CONF` | WireGuard VPN configuration |
| `DEPLOY_SECRET_KEY` | SSH private key for deployment |
| `SSH_HOST` | Target server hostname |
| `SSH_USER` | SSH username on the target server |
| `MTG_DOMAIN` | Target domain name for Traefik routing |

## License

MIT
