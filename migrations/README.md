# Database Migrations

This directory contains SQL migration scripts for the Supabase database.

## Setup Instructions

1. Go to your Supabase project: https://doyyghsijggiibkcktuq.supabase.co
2. Navigate to the SQL Editor
3. Run the migration scripts in order:
   - `001_create_users_table.sql` - Creates the users table for authentication

## Users Table

The `users` table stores user authentication information:

- `id` (UUID): Primary key
- `username` (TEXT): Unique username for login
- `password` (TEXT): User password (stored as plain text for simplicity)
- `name` (TEXT): Display name
- `role` (TEXT): User role ('admin' or 'customer')
- `created_at` (TIMESTAMP): Account creation timestamp

### Default Admin User

The migration creates a default admin user:
- **Username**: `ava`
- **Password**: `9193`
- **Name**: `Admin Ava`
- **Role**: `admin`

## Security Notes

⚠️ **Important**: This implementation uses plain text passwords for simplicity. In a production environment, you should:
1. Hash passwords using bcrypt or similar
2. Use Supabase Auth for built-in authentication
3. Implement proper session management
4. Add rate limiting for login attempts
