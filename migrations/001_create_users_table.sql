-- Create users table for authentication
-- This should be run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'customer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Insert default admin user
INSERT INTO users (username, password, name, role)
VALUES ('ava', '9193', 'Admin Ava', 'admin')
ON CONFLICT (username) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy to allow reading users (for login)
CREATE POLICY "Allow public read access to users" ON users
  FOR SELECT
  USING (true);

-- Create policy to allow inserting new users (for registration, if needed)
CREATE POLICY "Allow public insert access to users" ON users
  FOR INSERT
  WITH CHECK (true);
