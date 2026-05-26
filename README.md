# PatchPilot Dashboard

<p>
  <strong>Field operations dashboard for PatchPilot infrastructure teams.</strong>
</p>

<p>
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=06111c">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-7.3-646CFF?logo=vite&logoColor=white">
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white">
  <img alt="Status" src="https://img.shields.io/badge/status-dashboard%20prototype-22c55e">
</p>

![PatchPilot dashboard overview](docs/screenshots/dashboard-final-compact-grid.png)

Browser dashboard for PatchPilot operations.

## Preview

| Operations Command | Rack Workspace |
| --- | --- |
| ![Command dashboard](docs/screenshots/dashboard-workflow-mvp.png) | ![Rack operations](docs/screenshots/racks-dc-operations.png) |

| QR Studio | Quick Actions |
| --- | --- |
| ![QR Studio workflow](docs/screenshots/qr-studio-functional.png) | ![Quick actions](docs/screenshots/quick-actions-verified.png) |

More screenshots are available in [`docs/screenshots`](docs/screenshots).

## Scope

- Vite + React web dashboard
- Overview metrics
- Technician status list
- Asset search and status filter
- QR payload preview workflow
- Rack operations workspace

## Tech Stack

- React 19
- TypeScript
- Vite
- CSS modules by surface under `app/`

## Run Locally

```bash
npm install
npm run dev
```

The local server defaults to `http://localhost:3000`.

## Build

```bash
npm run build
npm run start
```

`npm run build` creates the static production bundle in `dist/`.

## Deploy

Any static host or Node server that can run a Vite build can serve this dashboard.

```bash
git clone https://github.com/x2vmbwtsjf-afk/patchpilot-dashboard.git
cd patchpilot-dashboard
npm install
npm run build
```

For a simple preview server:

```bash
npm run start
```

## Future Integration Points

- Replace mock arrays in `app/page.tsx` with API calls.
- Add authentication before exposing real operational data.
- Add QR generation service or client-side QR rendering.
- Add rack layout editing and RU mapping.
- Add a sync contract between the iOS app and the dashboard backend.
