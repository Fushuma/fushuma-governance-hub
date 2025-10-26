import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import * as db from "../db";
import { users, emailVerificationTokens, passwordResetTokens } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";

/**
 * Email/Password Authentication Service
 */

const SALT_ROUNDS = 12;
const VERIFICATION_TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const RESET_TOKEN_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify password against hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Validate password strength
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push("Password must contain at least one special character");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Register new user with email and password
 */
export async function registerWithEmail(
  email: string,
  password: string,
  username?: string,
  displayName?: string
): Promise<{ userId: number; verificationToken: string }> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  // Validate email
  if (!validateEmail(email)) {
    throw new Error("Invalid email format");
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.errors.join(", "));
  }

  const normalizedEmail = email.toLowerCase();

  // Check if email already exists
  const existingUsers = await dbInstance
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUsers.length > 0) {
    throw new Error("Email already registered");
  }

  // Check if username already exists (if provided)
  if (username) {
    const existingUsername = await dbInstance
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);

    if (existingUsername.length > 0) {
      throw new Error("Username already taken");
    }
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const result = await dbInstance.insert(users).values({
    email: normalizedEmail,
    passwordHash,
    username: username || null,
    displayName: displayName || null,
    loginMethod: "email",
    emailVerified: false,
    lastSignedIn: new Date(),
  });

  // Get user ID
  const newUsers = await dbInstance
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  const userId = newUsers[0].id;

  // Generate verification token
  const verificationToken = await generateEmailVerificationToken(userId);

  return { userId, verificationToken };
}

/**
 * Authenticate user with email and password
 */
export async function authenticateWithEmail(
  email: string,
  password: string
): Promise<any> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  const normalizedEmail = email.toLowerCase();

  // Find user by email
  const userResult = await dbInstance
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (userResult.length === 0) {
    throw new Error("Invalid email or password");
  }

  const user = userResult[0];

  // Check if user has password set
  if (!user.passwordHash) {
    throw new Error("Password not set for this account");
  }

  // Verify password
  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    throw new Error("Invalid email or password");
  }

  // Update last signed in
  await dbInstance
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));

  return user;
}

/**
 * Generate email verification token
 */
export async function generateEmailVerificationToken(
  userId: number
): Promise<string> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  // Generate random token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_EXPIRATION_MS);

  // Delete old tokens for this user
  await dbInstance
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.userId, userId));

  // Store new token
  await dbInstance.insert(emailVerificationTokens).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

/**
 * Verify email with token
 */
export async function verifyEmailToken(token: string): Promise<number> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  // Find valid token
  const result = await dbInstance
    .select()
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.token, token),
        gt(emailVerificationTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (result.length === 0) {
    throw new Error("Invalid or expired verification token");
  }

  const userId = result[0].userId;

  // Mark email as verified
  await dbInstance
    .update(users)
    .set({ emailVerified: true })
    .where(eq(users.id, userId));

  // Delete used token
  await dbInstance
    .delete(emailVerificationTokens)
    .where(eq(emailVerificationTokens.id, result[0].id));

  return userId;
}

/**
 * Generate password reset token
 */
export async function generatePasswordResetToken(
  email: string
): Promise<string> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  const normalizedEmail = email.toLowerCase();

  // Find user by email
  const userResult = await dbInstance
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (userResult.length === 0) {
    // Don't reveal if email exists
    throw new Error("If the email exists, a reset link will be sent");
  }

  const userId = userResult[0].id;

  // Generate random token
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRATION_MS);

  // Delete old unused tokens for this user
  await dbInstance
    .delete(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        eq(passwordResetTokens.usedAt, null)
      )
    );

  // Store new token
  await dbInstance.insert(passwordResetTokens).values({
    userId,
    token,
    expiresAt,
  });

  return token;
}

/**
 * Reset password with token
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string
): Promise<void> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.errors.join(", "));
  }

  // Find valid unused token
  const result = await dbInstance
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.token, token),
        gt(passwordResetTokens.expiresAt, new Date()),
        eq(passwordResetTokens.usedAt, null)
      )
    )
    .limit(1);

  if (result.length === 0) {
    throw new Error("Invalid or expired reset token");
  }

  const userId = result[0].userId;

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update user password
  await dbInstance
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId));

  // Mark token as used
  await dbInstance
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(eq(passwordResetTokens.id, result[0].id));
}

/**
 * Change password for authenticated user
 */
export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  // Get user
  const userResult = await dbInstance
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userResult.length === 0) {
    throw new Error("User not found");
  }

  const user = userResult[0];

  // Verify current password
  if (user.passwordHash) {
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new Error("Current password is incorrect");
    }
  }

  // Validate new password
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.errors.join(", "));
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update password
  await dbInstance
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, userId));
}

/**
 * Link email/password to existing user account
 */
export async function linkEmailToUser(
  userId: number,
  email: string,
  password: string
): Promise<string> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  // Validate email
  if (!validateEmail(email)) {
    throw new Error("Invalid email format");
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    throw new Error(passwordValidation.errors.join(", "));
  }

  const normalizedEmail = email.toLowerCase();

  // Check if email already exists
  const existingUsers = await dbInstance
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUsers.length > 0 && existingUsers[0].id !== userId) {
    throw new Error("Email already linked to another account");
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Link email to user
  await dbInstance
    .update(users)
    .set({
      email: normalizedEmail,
      passwordHash,
      emailVerified: false,
    })
    .where(eq(users.id, userId));

  // Generate verification token
  const verificationToken = await generateEmailVerificationToken(userId);

  return verificationToken;
}

/**
 * Unlink email from user account
 */
export async function unlinkEmailFromUser(userId: number): Promise<void> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  // Get user to check if they have other login methods
  const userResult = await dbInstance
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (userResult.length === 0) {
    throw new Error("User not found");
  }

  const user = userResult[0];

  // Ensure user has at least one other login method
  if (!user.walletAddress && !user.googleId) {
    throw new Error("Cannot unlink email: no other login method available");
  }

  // Unlink email
  await dbInstance
    .update(users)
    .set({
      email: null,
      passwordHash: null,
      emailVerified: false,
    })
    .where(eq(users.id, userId));
}

