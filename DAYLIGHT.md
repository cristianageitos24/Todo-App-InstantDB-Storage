# Daylight

A local personal organizer built on the existing Next.js project.

## Run locally

```sh
npm ci
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Open http://localhost:3000. For development with automatic refresh, use `npm run dev -- --hostname 127.0.0.1 --port 3000` instead. Only run one server on port 3000 at a time.

The built app requires no internet connection, remote fonts, authentication, or API service. Keep the local server running while using it. It is not an installed PWA.

## A calmer daily routine

1. Capture loose thoughts in Inbox or the scratchpad.
2. Give each task a life area, date, and realistic time estimate.
3. Pick a focus task and work in a 25-minute session.
4. Use Today to see due and overdue tasks together. Complete tasks or reschedule them in the editor.
5. Do a weekly reset to clear your inbox, review progress, look ahead, and set an intention.

Today, Inbox, Upcoming, All tasks, Completed, and the four life areas are working filters. Search covers task titles, notes, and areas. High priority and Quick wins narrow the current view. Quick wins means 15 minutes or less. Dates are local calendar dates. Completing an overdue task counts toward the day it was completed.

## Your data

- The first visit includes clearly labeled example tasks. Open profile settings to clear examples while retaining tasks you created.
- Tasks, scratchpad, intention, name, and weekly checklist persist in browser localStorage under `daylight.workspace.v1`.
- This version does **not** sync to InstantDB or across devices. The old app remains at `/legacy`, with its existing InstantDB configuration requirements and components.
- Use Export backup and Restore backup in profile settings to save or transfer JSON copies. Restore asks before replacing the current workspace.
- Browser storage belongs to the exact origin. `localhost:3000` and `127.0.0.1:3000` have separate data. Consistently use `localhost:3000`.
- Clearing browser site data clears this local workspace. Focus timers are session-only and do not continue after a page reload. Weekly checklist items stay checked until you reset the checklist.

## Verification

`npm run build` includes TypeScript validation. Browser checks cover creating tasks with notes, persistence after reload, completion, task filters, focus controls, scratchpad, and responsive layouts. No cloud data or GitHub changes are published by running this version.
