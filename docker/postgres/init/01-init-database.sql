-- docker/postgres/init/01-init-database.sql
-- This script runs automatically when the container starts for the first time

-- Create the main database (if not exists)
SELECT 'CREATE DATABASE aibookme'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'aibookme')\gexec

-- Connect to the aibookme database
\c aibookme;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    avatar TEXT,
    is_private_mode BOOLEAN DEFAULT false,
    office_connection_status TEXT DEFAULT 'disconnected',
    office_connection_type TEXT,
    office_access_token TEXT,
    office_refresh_token TEXT,
    office_calendar_id TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMP
);

-- Create user sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT,
    status TEXT NOT NULL DEFAULT 'offline',
    avatar TEXT,
    is_private BOOLEAN DEFAULT false,
    office_contact_id TEXT
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    contact_id INTEGER REFERENCES contacts(id),
    type TEXT NOT NULL DEFAULT 'meeting',
    status TEXT NOT NULL DEFAULT 'scheduled',
    location TEXT,
    is_all_day BOOLEAN DEFAULT false,
    is_private BOOLEAN DEFAULT false,
    office_event_id TEXT,
    office_event_url TEXT
);

-- Create chat messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB
);

-- Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    UNIQUE(user_id, key)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts USING gin(name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_start_time ON bookings(start_time);
CREATE INDEX IF NOT EXISTS idx_bookings_end_time ON bookings(end_time);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Create function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
    DELETE FROM user_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to clean up expired sessions (optional)
-- This requires pg_cron extension which may not be available in all environments
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-sessions', '0 0 * * *', 'SELECT cleanup_expired_sessions();');

-- Insert demo user (for development only)
INSERT INTO users (id, email, name, is_private_mode, created_at, last_login_at)
VALUES (
    'demo_user'::uuid,
    'demo@aibookme.ai',
    'Demo User',
    false,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert demo contacts
INSERT INTO contacts (user_id, name, email, role, status, is_private) VALUES
('demo_user'::uuid, 'Sarah Chen', 'sarah.chen@company.com', 'Product Manager', 'online', false),
('demo_user'::uuid, 'Alex Johnson', 'alex.johnson@company.com', 'Designer', 'offline', false),
('demo_user'::uuid, 'Emma Rodriguez', 'emma.rodriguez@company.com', 'Developer', 'online', false)
ON CONFLICT DO NOTHING;

-- Insert demo bookings for today
INSERT INTO bookings (
    user_id, title, description, start_time, end_time, type, status, location, is_all_day, is_private
) VALUES
(
    'demo_user'::uuid,
    'Team Standup',
    'Daily team sync',
    CURRENT_DATE + INTERVAL '9 hours',
    CURRENT_DATE + INTERVAL '9.5 hours',
    'meeting',
    'scheduled',
    'Conference Room A',
    false,
    false
),
(
    'demo_user'::uuid,
    'Product Review',
    'Review latest product features',
    CURRENT_DATE + INTERVAL '14 hours',
    CURRENT_DATE + INTERVAL '15 hours',
    'meeting',
    'scheduled',
    'Zoom',
    false,
    false
) ON CONFLICT DO NOTHING;

-- Insert welcome chat message
INSERT INTO chat_messages (user_id, content, sender, timestamp) VALUES
(
    'demo_user'::uuid,
    'Hi! I''m your AI scheduling assistant. You can tell me things like "Book me a meeting with Sam next week" or "Schedule dinner with Alex Friday evening". What would you like to schedule?',
    'ai',
    NOW()
) ON CONFLICT DO NOTHING;

COMMIT;