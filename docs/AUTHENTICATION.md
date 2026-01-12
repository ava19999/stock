# New Authentication System Documentation

## Overview

The new authentication system replaces the previous hardcoded login with a proper database-backed authentication system using Supabase.

## Key Changes

### 1. Removed Auto-Login
- **Before**: The application automatically logged in as admin user "ava" on page load
- **After**: Users must explicitly log in with credentials or as a guest

### 2. New Authentication Service
- Created `services/authService.ts` with the following functions:
  - `login(username, password)`: Authenticate users with credentials
  - `loginAsGuest(name)`: Allow guest users to access the shop
  - `getUserByUsername(username)`: Retrieve user information
  - `userExists(username)`: Check if a user exists
  - `ensureDefaultAdmin()`: Create default admin user if not exists

### 3. User State Management
- Replaced simple string-based authentication with proper User objects
- User sessions are persisted in localStorage as `stockmaster_current_user`
- User information includes: id, username, name, role (admin/customer)

### 4. Database Schema
- Created `users` table in Supabase with fields:
  - `id` (UUID): Primary key
  - `username` (TEXT): Unique username
  - `password` (TEXT): User password
  - `name` (TEXT): Display name
  - `role` (TEXT): 'admin' or 'customer'
  - `created_at` (TIMESTAMP): Account creation time

## Setup Instructions

### Database Setup
1. Go to your Supabase project at: https://doyyghsijggiibkcktuq.supabase.co
2. Navigate to SQL Editor
3. Run the migration script: `migrations/001_create_users_table.sql`
4. Verify the `users` table was created and default admin user exists

### Default Admin Credentials
- **Username**: `ava`
- **Password**: `9193`
- **Role**: admin

## Usage

### Admin Login
1. Enter username: `ava`
2. Enter password: `9193`
3. Click "Masuk Aplikasi"
4. User will be logged in as admin and redirected to inventory view

### Guest/Customer Login
1. Enter any name in the username field
2. Leave password field empty
3. Click "Masuk Aplikasi"
4. User will be logged in as a guest customer and redirected to shop view

### Special Users
- **King Fano**: Guest users with name "King Fano" get special pricing

## Code Changes

### App.tsx
- Added import for authentication service functions
- Changed initial state from auto-authenticated to not authenticated
- Added `currentUser` state to store User object
- Updated `handleGlobalLogin` to use async authentication
- Modified `loginAsCustomer` to use authentication service
- Updated `handleLogout` to clear user session
- Modified useEffect to check for saved user session and initialize default admin

### Authentication Flow
1. User submits login form
2. If password provided: Call `login(username, password)` from authService
3. If no password: Call `loginAsGuest(name)` from authService
4. On success: Save user to localStorage and update app state
5. On failure: Show error message

## Security Considerations

⚠️ **Important Security Notes**:

1. **Plain Text Passwords**: Currently using plain text passwords for simplicity. For production:
   - Implement bcrypt or similar hashing
   - Use Supabase Auth built-in authentication
   - Add password complexity requirements

2. **Session Management**: Using localStorage for session persistence
   - Consider using httpOnly cookies for better security
   - Implement session expiration
   - Add refresh token mechanism

3. **Access Control**: Row Level Security (RLS) policies are enabled
   - Public read access for login functionality
   - Public insert access for potential registration feature
   - Consider restricting policies for production

4. **Rate Limiting**: No rate limiting implemented
   - Add rate limiting for login attempts
   - Implement account lockout after failed attempts

## Future Enhancements

1. **User Registration**: Add ability to create new user accounts
2. **Password Reset**: Implement forgot password functionality
3. **Email Verification**: Add email verification for new accounts
4. **Two-Factor Authentication**: Add 2FA for admin accounts
5. **Audit Logging**: Log all authentication attempts
6. **Session Management**: Implement proper session tokens with expiration
7. **Password Hashing**: Use bcrypt to hash passwords in database

## Testing

To test the new authentication system:

1. **Test Admin Login**:
   - Enter username: `ava`, password: `9193`
   - Verify redirect to inventory view
   - Verify admin features are accessible

2. **Test Guest Login**:
   - Enter any name without password
   - Verify redirect to shop view
   - Verify only customer features are accessible

3. **Test Logout**:
   - Click logout button
   - Verify redirect to login page
   - Verify session is cleared from localStorage

4. **Test Session Persistence**:
   - Login as any user
   - Refresh the page
   - Verify user remains logged in

5. **Test Invalid Login**:
   - Enter invalid credentials
   - Verify error message is displayed
   - Verify user is not authenticated

## Migration from Old System

The old system used:
- Hardcoded username check: `loginName.toLowerCase() === 'ava'`
- Hardcoded password check: `loginPass === '9193'`
- Auto-login on page load: `setIsAuthenticated(true)`

The new system:
- Database-backed user authentication
- No auto-login (explicit login required)
- Proper user session management
- Support for multiple admin users (can be added to database)

All existing functionality remains intact - only the authentication mechanism has changed.
