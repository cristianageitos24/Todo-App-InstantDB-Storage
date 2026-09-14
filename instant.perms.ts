import type {InstantRules} from '@instantdb/react';

// Legacy rows carry userId even when their optional owner link is absent.
const owned = {
  allow: {
    view: 'isOwner', create: 'isOwner',
    update: 'isOwner && auth.id == newData.userId', delete: 'isOwner',
  },
  bind: {isOwner: 'auth.id != null && auth.id == data.userId'},
};
const rules = {
  $default: {allow: {$default: 'false'}},
  attrs: {allow: {create: 'false'}},
  $users: {allow: {view: 'auth.id != null && auth.id == data.id'}},
  todos: owned,
  userProfiles: owned,
  workroomNotes: owned,
  workroomPreferences: owned,
} satisfies InstantRules;
export default rules;
