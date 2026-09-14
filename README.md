# Workroom

A local personal work organizer for capturing meetings and turning them into scheduled, actionable tasks.

## Run locally

```sh
npm install
npm run build
npm run start -- --hostname 127.0.0.1 --port 3000
```

Open **http://localhost:3000** consistently. `127.0.0.1:3000` uses different browser storage. For development, use `npm run dev`.

## Work through a meeting

1. Choose **Capture meeting**. Add the meeting title and notes.
2. Enter one action per line. Indent with spaces or Tab for checklist items; indent again for nested sub-items. Shift+Tab leaves the action field.
3. Expand **Schedule & details** to choose project, priority, due date, and an optional reminder. The preview shows how many separate tasks will be created.
4. Save. Each task links back to the meeting note. Click a task to edit its schedule, estimate, context, or checklist in a dialog.
5. Choose **Focus** for a task timer. Pause, resume, or stop from the timer bar. A running timer continues across reloads; a paused timer stays paused.

The main screen is a simple task list; adding a task keeps you in that list. **View options** holds the extra views, filters, sorting, project creation, and batch task capture. The Inbox shows unscheduled work. Schedule groups tasks by date, Priorities groups by importance, and Completed keeps finished work. Search includes task titles, project names, context, and checklist text. Within Notes, select text and choose **Create task from selection** to create linked tasks.

## Reminders and data

- Reminders and focus completion appear in the notification center. Snooze a task reminder for ten minutes or mark alerts read. Desktop notification permission is optional.
- **The page must remain open for reminders.** An overdue reminder is delivered when the page is reopened. Browser suspension can delay delivery. Closed-page push notifications are not implemented.
- Workroom saves to this browser’s localStorage under `workroom.workspace.v2`. There is **no cloud sync** for this workspace.
- Use workspace settings to export or restore a JSON backup. Restore validates the data and asks before replacing the workspace. Keep a backup before clearing browser data.
- On first use, a valid Daylight workspace is migrated without deleting its original storage. Existing tasks (including edited examples), notes, intention, and review are preserved.
- If stored data is invalid or saving fails, the app shows a warning and avoids overwriting it. Export your current work or restore a valid backup through Settings.
- Fresh workspaces contain labeled examples; Settings can remove examples while retaining items you created.

## Checks

```sh
npm test
npx tsc --noEmit
npm run build
```

Tests cover batch capture, nested checklist changes, reminder eligibility/deduplication, backup validation, and Daylight migration. See `VERIFICATION.md` for the browser verification record.

## Source

- `components/Workroom.tsx`: workspace UI, capture, reminders, notes, and local persistence
- `components/TaskDetails.tsx`: task fields and nested checklists
- `components/WorkUI.tsx`: icons and accessible dialogs
- `lib/workroom.ts`: data model, capture parser, checklist operations, migration, validation
- `app/workroom.css`: responsive Workroom styling

The original InstantDB app remains at `/legacy`; its setup instructions are preserved in `LEGACY.md`. Workroom does not require InstantDB configuration.
