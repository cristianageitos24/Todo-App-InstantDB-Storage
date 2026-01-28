// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/core";

const _schema = i.schema({
  entities: {
    "$files": i.entity({
      "path": i.string().unique().indexed(),
      "url": i.string().optional(),
    }),
    "$users": i.entity({
      "email": i.string().unique().indexed().optional(),
      "imageURL": i.string().optional(),
      "type": i.string().optional(),
    }),
    "todos": i.entity({
      "text": i.string(),
      "completed": i.boolean(),
      "followUp": i.json().optional(),
      "completedDate": i.date().optional(),
      "createdDate": i.date(),
      "userId": i.string(),
    }),
    "userProfiles": i.entity({
      "displayName": i.string(),
      "userId": i.string(),
    }),
  },
  links: {
    "$usersLinkedPrimaryUser": {
      "forward": {
        "on": "$users",
        "has": "one",
        "label": "linkedPrimaryUser",
        "onDelete": "cascade"
      },
      "reverse": {
        "on": "$users",
        "has": "many",
        "label": "linkedGuestUsers"
      }
    },
    "todoOwner": {
      "forward": {
        "on": "todos",
        "has": "one",
        "label": "owner",
        "to": "$users"
      },
      "reverse": {
        "on": "$users",
        "has": "many",
        "label": "todos"
      }
    },
    "profileOwner": {
      "forward": {
        "on": "userProfiles",
        "has": "one",
        "label": "owner",
        "to": "$users"
      },
      "reverse": {
        "on": "$users",
        "has": "one",
        "label": "profile"
      }
    }
  },
  rooms: {}
});

// This helps TypeScript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema }
export default schema;
