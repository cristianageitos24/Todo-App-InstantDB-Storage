# Todo App - Next.js with InstantDB

A multi-user todo application built with Next.js and InstantDB, featuring real-time synchronization, authentication, and cross-device access.

## Features

- 🔐 **Magic Code Authentication** - Passwordless email-based authentication
- 👤 **Multi-User Support** - Each user has their own isolated todo storage
- ✏️ **Customizable Display Name** - Users can personalize their todo list title
- 📱 **Real-Time Sync** - Changes sync across all devices instantly
- 📅 **Follow-up Reminders** - Add calendar reminders with notes
- 💾 **Automatic Migration** - Existing localStorage todos are migrated on first login

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure InstantDB

1. Go to [https://instantdb.com/dash](https://instantdb.com/dash) and create an account
2. Create a new app/project
3. Copy your App ID from the dashboard
4. Create a `.env.local` file in the root directory (if not already created)
5. Add your App ID:

```env
NEXT_PUBLIC_INSTANTDB_APP_ID=your_app_id_here
```

### 3. Configure InstantDB Schema

In the InstantDB dashboard, go to Schema and add these tables:

**todos table:**
- `text` (string)
- `completed` (boolean)
- `followUp` (json, optional)
- `completedDate` (datetime, optional)
- `createdDate` (datetime)
- `userId` (string)

**userProfiles table:**
- `displayName` (string)
- `userId` (string)

### 4. Enable Authentication

In the InstantDB dashboard:
1. Go to Auth settings
2. Enable "Magic Code" authentication
3. Configure your email settings (or use InstantDB's default)

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page with auth routing
│   └── globals.css         # Global styles
├── components/
│   ├── AuthForm.tsx        # Authentication form
│   ├── TodoApp.tsx         # Main todo application
│   ├── TodoItem.tsx        # Individual todo item
│   ├── UserProfile.tsx     # User profile and display name
│   ├── FollowUpModal.tsx   # Follow-up reminder modal
│   └── NotesModal.tsx      # Notes viewing modal
├── lib/
│   └── instantdb.ts       # InstantDB configuration
└── .env.local             # Environment variables (not in git)
```

## Usage

1. **Sign In**: Enter your email and receive a magic code
2. **Add Todos**: Type and press Enter to add a todo
3. **Complete Todos**: Click the checkbox to mark as complete
4. **Delete Todos**: Click the delete button
5. **Add Follow-ups**: After adding a todo, you'll be prompted to add a calendar reminder
6. **View Notes**: Click on a todo to view its notes
7. **Customize Name**: Edit the display name input at the top to personalize your list

## Deployment

This app can be deployed to:
- **Vercel** (recommended for Next.js)
- **Netlify**
- **Any platform that supports Next.js**

Make sure to set the `NEXT_PUBLIC_INSTANTDB_APP_ID` environment variable in your deployment platform.

## Technologies

- **Next.js 14** - React framework
- **InstantDB** - Real-time database and authentication
- **TypeScript** - Type safety
- **React Hooks** - State management

## Migration from Vanilla JS

If you had the vanilla JS version:
- Your localStorage todos will automatically migrate to InstantDB on first login
- The migration only happens once per user
- After migration, localStorage is cleared
