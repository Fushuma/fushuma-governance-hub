-- Migration: Add Web3 Authentication Support
-- Date: 2025-10-26
-- Description: Add wallet authentication, email/password, and Google OAuth support

-- Add new columns to users table
ALTER TABLE users 
  ADD COLUMN walletAddress VARCHAR(42) UNIQUE AFTER openId,
  ADD COLUMN passwordHash VARCHAR(255) AFTER email,
  ADD COLUMN emailVerified BOOLEAN DEFAULT FALSE AFTER passwordHash,
  ADD COLUMN username VARCHAR(64) UNIQUE AFTER emailVerified,
  ADD COLUMN displayName VARCHAR(128) AFTER username,
  ADD COLUMN avatar TEXT AFTER displayName,
  ADD COLUMN googleId VARCHAR(255) UNIQUE AFTER avatar;

-- Add indexes for new columns
CREATE INDEX idx_wallet ON users(walletAddress);
CREATE INDEX idx_username ON users(username);
CREATE INDEX idx_google ON users(googleId);

-- Make openId nullable (since wallet or email can be primary identifier)
ALTER TABLE users MODIFY COLUMN openId VARCHAR(64) UNIQUE NULL;

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user (userId),
  INDEX idx_expires (expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create password reset tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  usedAt TIMESTAMP NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_token (token),
  INDEX idx_user (userId),
  INDEX idx_expires (expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create web3 nonces table for SIWE authentication
CREATE TABLE IF NOT EXISTS web3_nonces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  walletAddress VARCHAR(42) NOT NULL,
  nonce VARCHAR(255) NOT NULL UNIQUE,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_wallet (walletAddress),
  INDEX idx_nonce (nonce),
  INDEX idx_expires (expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing users: set emailVerified to true if email exists
UPDATE users 
SET emailVerified = TRUE
WHERE email IS NOT NULL AND email != '';

-- Create cleanup job for expired tokens (run periodically)
-- DELETE FROM email_verification_tokens WHERE expiresAt < NOW();
-- DELETE FROM password_reset_tokens WHERE expiresAt < NOW() AND usedAt IS NULL;
-- DELETE FROM web3_nonces WHERE expiresAt < NOW();

