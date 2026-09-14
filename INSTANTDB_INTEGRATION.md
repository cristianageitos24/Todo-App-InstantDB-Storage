# Workroom InstantDB integration

Implemented September 13, 2026 against the existing legacy app:
`ea631659-772f-45e9-978f-3260ccb6988c`.

## Sign in

Open workspace settings or “Sign in to sync,” enter the same email used in the legacy app, then enter the email code. The public app ID is the default in `lib/instantdb.ts`; `NEXT_PUBLIC_INSTANTDB_APP_ID` can override it. No admin credential is bundled with the app.

The redesigned app and `/legacy` use the same InstantDB authentication session. The new interface uses the SDK's session persistence without the legacy timestamp wrapper.

This browser's local workspace is kept separate. After signing in, “Import this device’s work” adds non-example tasks and notes to the account. Nothing is imported automatically. The source stays in localStorage, and an account-specific identity map makes import retries idempotent. Importing a cloud backup retains matching existing IDs and never replaces cloud records. Restoring a device backup keeps a separate before-restore copy.

For phone access, use the same hosted app URL on both devices. `localhost:3000` on a phone refers to the phone. The current server is a loopback-only local preview; this implementation has not been published to a hosted URL.

## Persistence

- `todos`: existing title/text, completion, dates, follow-up notes, and userId are preserved. Optional fields add project, priority, reminders, minutes, checklist, source note ID and Today date.
- `workroomNotes`: independent title, body, creation date and userId records.
- `workroomPreferences`: project names per user.
- `userProfiles`: existing display name and accent color remain. Name edits update the existing profile.
- Timers and reminder history are device-local. Reminders run only while the app is open.

Changes are translated into record/field patches. Remote query updates never cause write-back loops. Concurrent edits to different fields/records remain separate; simultaneous edits to the same field, checklist JSON, followUp JSON, or project list use last-write-wins behavior. This is not a collaborative rich-text editor.

Cloud pending writes and device-only metadata are stored under `workroom.account.<userId>.v1`. The InstantDB SDK maintains its own cache. Pending writes are overlaid on live queries and sent when authenticated/connected. Failed writes remain available for retry. Account switches remount the workspace; signed-in work is never written into the unauthenticated `workroom.workspace.v2` key. Sign-out waits for pending writes to finish.

Offline editing while the app remains open was verified. Loading the website from scratch without a network connection is not supported by a service worker.

## Live schema and permissions

The CLI login succeeded and the live schema/rules were retrieved. The previous live rules were empty (default allow).

The user explicitly approved the additions and owner-only rules in `INSTANTDB_MIGRATION.md`. Both schema and rules were successfully deployed. Existing records, attributes and links were preserved, including system file/stream schema.

All task, note, profile and preference access now requires `auth.id == data.userId`; updates cannot change ownership. The rules support legacy userId fields without requiring owner links. Users can read their own user record. Client schema creation and unspecified namespace access are denied. Old rows with an absent/incorrect userId are not visible until corrected.

MCP is connected but its transaction tool currently lacks the data-write scope. Schema and permission operations use the separately authorized CLI. Test-account cleanup used the documented admin API with CLI credentials held only in process memory.

## Verification

See `VERIFICATION.md`. Twelve unit tests, TypeScript and production builds pass. Independent browser sessions verified bidirectional task/note sync, linked action completion, Today persistence, refresh, and offline reconnect. Direct foreign-record reads/edits and ownership transfer were checked against the deployed rules. Temporary test records and guest accounts were removed.

Actual delivery to the user's inbox and login on a physical phone still require the user to enter their own code and use a reachable hosted URL. No user screen access or recording was used.

## Service lifecycle

InstantDB's current official documentation announces service availability through August 31, 2027. The integration reuses the requested existing project, but a future backend migration should be planned before that date: https://www.instantdb.com/docs
