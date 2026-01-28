// InstantDB Configuration
// 
// SETUP INSTRUCTIONS:
// 1. Go to https://instantdb.com/dash and create an account (if you don't have one)
// 2. Create a new app/project
// 3. Copy your App ID from the dashboard
// 4. Replace '__YOUR_APP_ID__' below with your actual App ID
// 5. In the InstantDB dashboard, configure authentication:
//    - Go to Auth settings
//    - Enable "Magic Code" authentication
//    - Configure your email settings (or use InstantDB's default)
// 6. In the Schema section, add these tables:
//    - todos: text (string), completed (boolean), followUp (json, optional), 
//             completedDate (datetime, optional), createdDate (datetime), userId (string)
//    - userProfiles: displayName (string), userId (string)
//
export const INSTANTDB_APP_ID = '__YOUR_APP_ID__';

// Schema definition for InstantDB
export const schema = {
  todos: {
    text: { type: "string" },
    completed: { type: "boolean" },
    followUp: { type: "json", optional: true },
    completedDate: { type: "datetime", optional: true },
    createdDate: { type: "datetime" },
    userId: { type: "string" } // Will link to $users
  },
  userProfiles: {
    displayName: { type: "string" },
    userId: { type: "string" } // Links to $users
  }
};
