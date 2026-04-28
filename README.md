# EGS Web React Frontend

This project is a Vite + React frontend that renders the main EGS website as native React route components.

## Structure

- `client/`: React + Vite frontend
- `client/src/pages/`: individual React page components
- `client/src/styles/pages/`: page-specific styles extracted from the former static pages
- `client/src/hooks/`: page lifecycle and interaction hooks
- `client/src/styles/shared.css`: shared design system
- `client/public/legacy/`: archived source files kept for reference only
- `client/public/uploads/`: static uploaded assets
- `index.html`, `exhibitions.html`, `events.html`, `fitouts.html`: original source pages retained in the repo

## How it works

The router in `client/src/App.jsx` points directly at React pages:

- `HomePage`
- `ExhibitionsPage`
- `EventsPage`
- `FitoutsPage`

The old browser-side legacy loader has been removed. Shared behavior that used to live in inline scripts now lives in React hooks.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start the frontend:

```bash
npm run dev
```

## Scripts

- `npm run dev`: runs the Vite frontend
- `npm run build`: builds the React frontend
- `npm run start`: previews the production build

## Routes

- `/`: home
- `/exhibitions`: exhibitions page
- `/events`: events page
- `/fitouts`: fitouts page
- `/retail`: placeholder route
- `/hct-case-study`: placeholder route
