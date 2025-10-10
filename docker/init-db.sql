-- ContextStream Database Initialization Script
-- This script runs automatically when PostgreSQL container starts for the first time

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create database if it doesn't exist (this is redundant as POSTGRES_DB creates it)
-- But useful for documentation purposes
-- CREATE DATABASE contextstream;

-- Set timezone
SET timezone = 'UTC';

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'ContextStream database initialized successfully';
  RAISE NOTICE 'pgvector extension enabled';
END $$;
