# PatchPilot Dashboard

Browser dashboard for PatchPilot operations.

## Current Scope

- Vite + React web dashboard
- Overview metrics
- Technician status list
- Asset search and status filter
- QR payload preview workflow
- Rack operations workspace

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

## Future Integration Points

- Replace mock arrays in `app/page.tsx` with API calls.
- Add authentication before exposing real operational data.
- Add QR generation service or client-side QR rendering.
- Add rack layout editing and RU mapping.
- Add a sync contract between the iOS app and the dashboard backend.
