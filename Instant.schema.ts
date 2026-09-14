// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $streams: i.entity({
      abortReason: i.string().optional(),
      clientId: i.string().unique().indexed(),
      done: i.boolean().optional(),
      size: i.number().optional(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
      imageURL: i.string().optional(),
      type: i.string().optional(),
    }),
    todos: i.entity({
      project: i.string().optional(),
      priority: i.string().optional(),
      remindAt: i.string().optional(),
      notifiedAt: i.string().optional(),
      minutes: i.number().optional(),
      steps: i.json().optional(),
      noteId: i.string().optional(),
      parentId: i.string().optional(),
      kind: i.string().optional(),
      today: i.string().optional(),
      repeat: i.string().optional(),
      seriesId: i.string().optional(),
      completed: i.boolean(),
      completedDate: i.date().optional(),
      createdDate: i.date(),
      followUp: i.any().optional(),
      text: i.string(),
      userId: i.string(),
    }),
    workroomNotes: i.entity({
      title: i.string(), body: i.string(), createdAt: i.date(), datedAt: i.string().optional(), userId: i.string().indexed(),
    }),
    workroomPreferences: i.entity({ projects: i.json(), userId: i.string().indexed() }),
    userProfiles: i.entity({
      accentColor: i.string().optional(),
      displayName: i.string(),
      userId: i.string(),
    }),
  },
  links: {
    $streams$files: {
      forward: {
        on: "$streams",
        has: "many",
        label: "$files",
      },
      reverse: {
        on: "$files",
        has: "one",
        label: "$stream",
        onDelete: "cascade",
      },
    },
    $usersLinkedPrimaryUser: {
      forward: {
        on: "$users",
        has: "one",
        label: "linkedPrimaryUser",
        onDelete: "cascade",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "linkedGuestUsers",
      },
    },
    todosOwner: {
      forward: {
        on: "todos",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "many",
        label: "todos",
      },
    },
    userProfilesOwner: {
      forward: {
        on: "userProfiles",
        has: "one",
        label: "owner",
      },
      reverse: {
        on: "$users",
        has: "one",
        label: "profile",
      },
    },
  },
  rooms: {},
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
