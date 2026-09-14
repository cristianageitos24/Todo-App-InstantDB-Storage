# Reviewed Workroom database change

Target: existing InstantDB app `ea631659-772f-45e9-978f-3260ccb6988c`.

## Schema additions

- Preserve all live tables, attributes and links, including `$streams` and `$files`.
- Add optional `todos` fields: project, priority, remindAt, notifiedAt, minutes, steps, noteId and today.
- Add `workroomNotes`: title, body, createdAt and indexed userId.
- Add `workroomPreferences`: projects and indexed userId.
- No existing records are migrated, deleted or replaced by this schema deployment.

## Access rules

Live rules retrieved on September 13, 2026 are empty (default allow).

- For todos, userProfiles, workroomNotes and workroomPreferences, require signed-in auth.id to equal the record's userId for reads, creation, updates and deletion.
- Updates must keep the same userId.
- Users can read only their own `$users` record.
- Deny client creation of schema attributes and access to unspecified namespaces.
- The legacy app's queries filter userId and its create operations set userId. These operations remain supported without relying on optional owner links.

Potential impact: historical rows missing or carrying an incorrect userId will no longer be visible to that account. Unused file/stream access is denied; the legacy task UI does not use these namespaces. This changes the currently unrestricted access policy.

## Application behavior

Email-code login uses the existing app and accounts. Legacy todo IDs are preserved. New fields are written only when changed; notes are separate records. Device import is explicit and keeps its source; a per-account ID map makes retries idempotent. Timers and alert history stay device-local. Pending writes are stored per account and replayed after connection/retry. Sign-out is disabled while writes await confirmation.

## Review evidence

TypeScript and production build pass. Twelve tests cover existing organizer behavior, legacy conversion, field-level changes, linked import retry, note body search and Today rollover. The user explicitly approved this change. The CLI successfully deployed the additive schema and permissions; live session checks passed.

## Apply

`npx instant-cli push all --app ea631659-772f-45e9-978f-3260ccb6988c --yes`

Source: Instant.schema.ts and instant.perms.ts. Automatic approval review initially required explicit approval; the user approved the exact schema additions and owner-only rules, and deployment completed.
