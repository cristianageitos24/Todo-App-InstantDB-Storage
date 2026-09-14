# InstantDB integration handoff

Recovered from the legacy source on September 13, 2026. This document distinguishes verified repository configuration from live settings that still need verification. No database writes were performed.

## Existing project

- App ID documented in `INSTANTDB_SETUP.md`: `ea631659-772f-45e9-978f-3260ccb6988c`
- Client configuration: `lib/instantdb.ts`
- Environment variable: `NEXT_PUBLIC_INSTANTDB_APP_ID`
- Existing dependencies: `@instantdb/react` and `@instantdb/core`, declared as `^0.22.112`
- Local schema: `Instant.schema.ts`
- Original interface: `/legacy`
- Current interface: `app/page.tsx` → `components/Workroom.tsx`

The app ID is public configuration, not an admin credential. The legacy client currently falls back to `__YOUR_APP_ID__` if the environment variable is missing. The new Workroom interface does not yet initialize authentication or query InstantDB.

Configuration needed by the client:

```dotenv
NEXT_PUBLIC_INSTANTDB_APP_ID=ea631659-772f-45e9-978f-3260ccb6988c
```

Use this existing project; do not provision a replacement project or replace existing tables.

## Email login

`components/AuthForm.tsx` implements the existing passwordless email-code flow:

```ts
await db.auth.sendMagicCode({ email });
await db.auth.signInWithMagicCode({ email: pendingEmail, code });
```

`app/legacy/page.tsx` gates the UI with `db.SignedOut` and `db.SignedIn`. Signed-in components obtain the user with `db.useUser()`. Settings call `db.auth.signOut()`.

Reuse this authentication provider and the same app ID to retain existing accounts. Users enter their own email and code in the app; no password or login code needs to be shared with the coding assistant. The repository does not establish which email the user used for their account.

InstantDB manages session persistence. The legacy code also maintains an `instantdb_session_timestamp` and a 30-day helper, but it refreshes that timestamp while authenticated. This helper is not an enforceable 30-day session-expiry policy and should not be carried over as one.

Improve the reused form with trimmed email/code values, accessible labels, `autoComplete="one-time-code"`, resend/change-email controls, and distinct success/error messages while retaining Workroom's simple styling.

## Existing data schema

### todos

| Field | Local schema type | Notes |
| --- | --- | --- |
| id | InstantDB entity ID | Preserve IDs during migration |
| text | string | Task title |
| completed | boolean | Completion state |
| followUp | optional JSON | `{ dateTime?: string, notes?: string }`; legacy writes can use null |
| completedDate | optional date | Legacy writes can use null |
| createdDate | date | Creation timestamp |
| userId | string | Authenticated owner's ID |

### userProfiles

| Field | Local schema type |
| --- | --- |
| displayName | string |
| userId | string |
| accentColor | optional string |

The schema also declares `$users`, `$files`, a `todoOwner` link (`todos.owner` ↔ `$users.todos`), a `profileOwner` link (`userProfiles.owner` ↔ `$users.profile`), and linked guest/primary users.

Legacy creation code writes `userId` but does not consistently populate `owner` links. Do not assume all existing rows have those links when designing permissions or queries.

## Queries and writes to reuse

`components/TodoApp.tsx` and `components/SettingsModal.tsx` filter both namespaces by the signed-in user's ID:

```ts
const user = db.useUser();
const { data, isLoading, error } = db.useQuery({
  todos: { $: { where: { userId: user.id } } },
  userProfiles: { $: { where: { userId: user.id } } },
});
```

Writes use `db.transact(db.tx.todos[id].update(...))`; deletion uses `.delete()`. Profile changes use `db.tx.userProfiles[profileId].update(...)`.

Client-side filtering alone does not provide access control. The server must enforce ownership for reads, creation, updates, and deletion, and prevent changing ownership to another user.

## Mapping legacy data into Workroom

| Legacy | Workroom |
| --- | --- |
| todos.id | WorkTask.id |
| text | title |
| completed | done |
| createdDate | createdAt |
| completedDate | completedAt |
| followUp.notes | body |
| followUp.dateTime | dueAt (normalize to the date-input representation) |
| userProfiles.displayName | WorkState.name |

Treat legacy follow-up dates as schedule data; do not automatically deliver a new reminder for every historical follow-up. Preserve profile accentColor even if the simplified interface does not expose a color picker.

Additional persistence is needed for priorities, projects, estimates, nested checklists, meeting notes and links, explicit reminders/delivery markers, timers, and alerts. Make additive schema changes after comparing the live schema with `Instant.schema.ts`. Store independently editable records separately so changing a task on one device does not overwrite unrelated work on another device.

## Migration and sync requirements

1. Verify the live project, schema, permission rules, and auth setup through MCP.
2. Add authentication to Workroom while preserving the local workspace until an account is selected.
3. Load cloud data fully before considering any import. Distinguish loading, query failure, and an empty account.
4. Reuse or safely map existing todo IDs; make imports idempotent. Preserve the legacy records.
5. Offer a deliberate import of this device's `workroom.workspace.v2` data into the signed-in account. Avoid mixing unrelated accounts or overwriting existing cloud work.
6. Keep local backups until writes are confirmed. Do not reuse the legacy automatic migration that can clear local data before confirming a successful write.
7. Subscribe to live queries, update only changed records/fields, and show pending/failed sync accurately. Remote query updates must not trigger write-back loops.
8. Isolate account-specific cached data and clear the visible account workspace when signing out or switching accounts.
9. Verify the same account in two independent browser sessions, plus account isolation, refresh/offline behavior, and migration retry behavior.
10. Phone access needs a reachable hosted URL (or an explicitly configured local-network setup). `localhost:3000` on the phone points to the phone, not this computer.

## MCP status and remaining verification

- Registered server: `instant`
- Endpoint: `https://mcp.instantdb.com/mcp`
- OAuth command returned `Successfully logged in` in the earlier setup turn.
- `codex mcp get instant` currently confirms the server is enabled.
- This running task does not expose InstantDB tools; querying resources reports `unknown MCP server 'instant'`.
- Therefore the live schema, deployed permissions, app ownership, and email delivery settings have NOT been retrieved or verified.
- Do not claim cloud sync is implemented merely because MCP authorization succeeded. MCP is the development connection; the app still needs SDK authentication and persistence integration.

Once MCP tools are available, inspect the existing app with `get-schema` and `get-perms` before changing it. No screen access is authorized or necessary.

## Reference sources

- Local: `INSTANTDB_SETUP.md`, `Instant.schema.ts`, `lib/instantdb.ts`, `app/legacy/page.tsx`, `components/AuthForm.tsx`, `components/TodoApp.tsx`, `components/SettingsModal.tsx`, `components/FollowUpModal.tsx`.
- Official MCP setup: https://www.instantdb.com/docs/using-llms
- Official email-code authentication: https://www.instantdb.com/docs/auth/magic-codes
- Official permissions: https://www.instantdb.com/docs/permissions
