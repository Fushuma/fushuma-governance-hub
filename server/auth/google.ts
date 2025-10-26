import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import * as db from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

/**
 * Google OAuth Authentication Service
 */

export interface GoogleProfile {
  id: string;
  displayName: string;
  emails?: Array<{ value: string; verified: boolean }>;
  photos?: Array<{ value: string }>;
}

/**
 * Initialize Google OAuth strategy
 */
export function initializeGoogleAuth() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL || 
    `${process.env.APP_URL || "https://governance.fushuma.com"}/api/auth/google/callback`;

  if (!clientID || !clientSecret) {
    console.warn("[Google Auth] Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.");
    return false;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        scope: ["profile", "email"],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await authenticateWithGoogle(profile as GoogleProfile);
          done(null, user);
        } catch (error) {
          done(error as Error, undefined);
        }
      }
    )
  );

  // Serialize user for session
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id: number, done) => {
    try {
      const dbInstance = await db.getDb();
      if (!dbInstance) {
        return done(new Error("Database not available"), null);
      }

      const userResult = await dbInstance
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (userResult.length === 0) {
        return done(new Error("User not found"), null);
      }

      done(null, userResult[0]);
    } catch (error) {
      done(error as Error, null);
    }
  });

  console.log("[Google Auth] Google OAuth initialized");
  return true;
}

/**
 * Authenticate user with Google profile
 * Creates user if doesn't exist
 */
export async function authenticateWithGoogle(
  profile: GoogleProfile
): Promise<any> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  const googleId = profile.id;
  const email = profile.emails?.[0]?.value;
  const emailVerified = profile.emails?.[0]?.verified || false;
  const displayName = profile.displayName;
  const avatar = profile.photos?.[0]?.value;

  // Check if user exists with this Google ID
  const existingUsers = await dbInstance
    .select()
    .from(users)
    .where(eq(users.googleId, googleId))
    .limit(1);

  let user;

  if (existingUsers.length > 0) {
    // Update last signed in
    user = existingUsers[0];
    await dbInstance
      .update(users)
      .set({ 
        lastSignedIn: new Date(),
        // Update profile info if changed
        displayName: displayName || user.displayName,
        avatar: avatar || user.avatar,
      })
      .where(eq(users.id, user.id));
  } else {
    // Check if user exists with this email
    if (email) {
      const emailUsers = await dbInstance
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (emailUsers.length > 0) {
        // Link Google to existing email account
        user = emailUsers[0];
        await dbInstance
          .update(users)
          .set({
            googleId,
            lastSignedIn: new Date(),
            emailVerified: emailVerified || user.emailVerified,
            displayName: displayName || user.displayName,
            avatar: avatar || user.avatar,
          })
          .where(eq(users.id, user.id));
      } else {
        // Create new user
        await dbInstance.insert(users).values({
          googleId,
          email: email ? email.toLowerCase() : null,
          emailVerified,
          displayName,
          avatar,
          loginMethod: "google",
          lastSignedIn: new Date(),
        });

        // Fetch created user
        const newUsers = await dbInstance
          .select()
          .from(users)
          .where(eq(users.googleId, googleId))
          .limit(1);

        user = newUsers[0];
      }
    } else {
      // Create new user without email
      await dbInstance.insert(users).values({
        googleId,
        displayName,
        avatar,
        loginMethod: "google",
        lastSignedIn: new Date(),
      });

      // Fetch created user
      const newUsers = await dbInstance
        .select()
        .from(users)
        .where(eq(users.googleId, googleId))
        .limit(1);

      user = newUsers[0];
    }
  }

  return user;
}

/**
 * Link Google account to existing user
 */
export async function linkGoogleToUser(
  userId: number,
  profile: GoogleProfile
): Promise<void> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  const googleId = profile.id;

  // Check if Google ID is already linked to another user
  const existingUsers = await dbInstance
    .select()
    .from(users)
    .where(eq(users.googleId, googleId))
    .limit(1);

  if (existingUsers.length > 0 && existingUsers[0].id !== userId) {
    throw new Error("Google account already linked to another user");
  }

  // Link Google to user
  const email = profile.emails?.[0]?.value;
  const emailVerified = profile.emails?.[0]?.verified || false;
  const displayName = profile.displayName;
  const avatar = profile.photos?.[0]?.value;

  await dbInstance
    .update(users)
    .set({
      googleId,
      // Update email if not set
      email: email ? email.toLowerCase() : undefined,
      emailVerified: emailVerified || undefined,
      displayName: displayName || undefined,
      avatar: avatar || undefined,
    })
    .where(eq(users.id, userId));
}

/**
 * Unlink Google account from user
 */
export async function unlinkGoogleFromUser(userId: number): Promise<void> {
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
  if (!user.walletAddress && !user.email) {
    throw new Error("Cannot unlink Google: no other login method available");
  }

  // Unlink Google
  await dbInstance
    .update(users)
    .set({ googleId: null })
    .where(eq(users.id, userId));
}

