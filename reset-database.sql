-- reset-database.sql
-- Run this to completely reset the database schema

-- Drop all tables in correct order (foreign keys first)
DROP TABLE IF EXISTS user_preferences CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Drop any remaining sequences
DROP SEQUENCE IF EXISTS contacts_id_seq CASCADE;
DROP SEQUENCE IF EXISTS bookings_id_seq CASCADE;
DROP SEQUENCE IF EXISTS chat_messages_id_seq CASCADE;
DROP SEQUENCE IF EXISTS user_preferences_id_seq CASCADE;

-- Create the tables with correct schema
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- User sessions table
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Contacts table
CREATE TABLE contacts (
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

-- Bookings table
CREATE TABLE bookings (
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

-- Chat messages table
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender TEXT NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB
);

-- User preferences table
CREATE TABLE user_preferences (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT NOT NULL,
    UNIQUE(user_id, key)
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_user_sessions_token ON user_sessions(token);
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_contacts_user_id ON contacts(user_id);
CREATE INDEX idx_bookings_user_id ON bookings(user_id);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);
CREATE INDEX idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

COMMIT;