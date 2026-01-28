# InstantDB Setup Guide - Step by Step

Follow these exact steps to set up your InstantDB schema and authentication.

## Step 1: Log into InstantDB Dashboard

1. Go to https://instantdb.com/dash
2. Log in with your account
3. Make sure you're viewing the app with ID: `ea631659-772f-45e9-978f-3260ccb6988c`

## Step 2: Set Up Schema

### 2a. Navigate to Schema Section
- In the left sidebar, click on **"Schema"** or **"Database Schema"**

### 2b. Create the `todos` Table
Click **"Add Table"** or **"New Entity"** and create a table named `todos` with these fields:

| Field Name | Type | Required | Optional |
|------------|------|----------|----------|
| `text` | String | ✅ Yes | ❌ No |
| `completed` | Boolean | ✅ Yes | ❌ No |
| `followUp` | JSON | ❌ No | ✅ Yes |
| `completedDate` | DateTime | ❌ No | ✅ Yes |
| `createdDate` | DateTime | ✅ Yes | ❌ No |
| `userId` | String | ✅ Yes | ❌ No |

**Important Notes:**
- Make sure `followUp` and `completedDate` are marked as **optional**
- `userId` should be a **String** type (not a link/relation for now)

### 2c. Create the `userProfiles` Table
Click **"Add Table"** or **"New Entity"** again and create a table named `userProfiles` with these fields:

| Field Name | Type | Required | Optional |
|------------|------|----------|----------|
| `displayName` | String | ✅ Yes | ❌ No |
| `userId` | String | ✅ Yes | ❌ No |

## Step 3: Set Up Permissions (Important!)

### 3a. Todos Permissions
For the `todos` table, set permissions so:
- Users can only read/write their own todos (where `userId` matches their user ID)
- This is usually done with a rule like: `userId == auth.uid` or similar

### 3b. UserProfiles Permissions
For the `userProfiles` table:
- Users can only read/write their own profile (where `userId` matches their user ID)

**Note:** The exact permission syntax depends on InstantDB's interface. Look for:
- "Row-level security" or "RLS"
- "Permissions" or "Access Rules"
- Rules that check `userId` against the authenticated user

## Step 4: Enable Magic Code Authentication

1. In the left sidebar, click on **"Auth"** or **"Authentication"**
2. Find **"Magic Code"** or **"Email Magic Link"** authentication method
3. Click to **Enable** it
4. Configure email settings:
   - You can use InstantDB's default email service (for testing)
   - Or configure your own SMTP if you have one

## Step 5: Verify Setup

After completing the above steps:
1. Your schema should show 2 tables: `todos` and `userProfiles`
2. Magic Code auth should be enabled
3. Permissions should be set for both tables

## Step 6: Test the App

1. Run `npm install` in your project directory
2. Run `npm run dev`
3. Open http://localhost:3000
4. Try signing in with your email
5. You should receive a magic code email
6. Enter the code to sign in
7. Try adding a todo - it should work!

## Troubleshooting

### If you get permission errors:
- Double-check that permissions are set correctly
- Make sure `userId` field matches the authenticated user's ID

### If authentication doesn't work:
- Verify Magic Code auth is enabled in the dashboard
- Check that your email is receiving the magic codes

### If schema errors occur:
- Make sure field names match exactly (case-sensitive)
- Verify field types are correct
- Check that optional fields are marked as optional

## Need Help?

If you get stuck on any step, let me know:
- What step you're on
- What error message you see (if any)
- A screenshot of the InstantDB dashboard (if helpful)

I can help troubleshoot specific issues!
