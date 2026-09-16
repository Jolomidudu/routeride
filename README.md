# 🚗 Routeride — Your ride, your way

Fullstack ride-hailing web app (Lagos / Nigeria focused).

## Quick Start

```bash
# 1. Unzip the folder, then open a terminal inside it
cd routeride-app

# 2. Install dependencies (only needed once)
npm install

# 3. Start the server
npm start
```

Open your browser at: **http://localhost:3000**

## How to test the flow

1. Click a ride type (Economy / Comfort / SUV / Premium)
2. Confirm pickup & destination → Request Ride
3. Watch searching → driver assigned → live map + On Trip screen
4. The trip progresses automatically and completes after a short simulation

## Features

- Mobile-first UI matching the original design
- Ride booking with 4 categories + ₦ pricing
- Live map (Leaflet + OpenStreetMap)
- Driver matching simulation
- Wallet, Activity & Profile screens
- REST API backend (in-memory, no database needed)

## Requirements

- Node.js 18+ (or 20/22 recommended)
- npm

## Project structure

```
routeride-app/
├── package.json
├── server.js          # Express backend + API
├── public/
│   ├── index.html     # Frontend UI
│   └── app.js         # Frontend logic
└── README.md
```

Enjoy the ride! 🇳🇬
