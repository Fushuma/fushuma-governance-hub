import { Router, Request, Response } from "express";
import passport from "passport";
import * as walletAuth from "../auth/wallet";
import * as emailAuth from "../auth/email";
import * as googleAuth from "../auth/google";
import * as jwtService from "../auth/jwt";
import { authenticate, rateLimit } from "../auth/middleware";
import * as emailService from "../services/email";

/**
 * Authentication API Routes
 */

const router = Router();

// Rate limiting for auth endpoints
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: "Too many authentication attempts, please try again later",
});

const strictAuthRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 requests per window
  message: "Too many attempts, please try again in an hour",
});

// ============================================================================
// Web3 Wallet Authentication
// ============================================================================

/**
 * POST /api/auth/nonce
 * Get nonce for wallet signature
 */
router.post("/nonce", authRateLimit, async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    const nonce = await walletAuth.generateNonce(walletAddress);

    res.json({ nonce });
  } catch (error) {
    console.error("[Auth API] Nonce generation error:", error);
    res.status(500).json({ error: "Failed to generate nonce" });
  }
});

/**
 * POST /api/auth/wallet/verify
 * Verify wallet signature and authenticate
 */
router.post("/wallet/verify", authRateLimit, async (req: Request, res: Response) => {
  try {
    const { walletAddress, message, signature } = req.body;

    if (!walletAddress || !message || !signature) {
      return res.status(400).json({ 
        error: "Wallet address, message, and signature are required" 
      });
    }

    const { user, isNewUser } = await walletAuth.authenticateWallet(
      walletAddress,
      message,
      signature
    );

    // Generate JWT token
    const token = jwtService.generateToken({
      userId: user.id,
      walletAddress: user.walletAddress,
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        emailVerified: user.emailVerified,
      },
      isNewUser,
    });
  } catch (error) {
    console.error("[Auth API] Wallet verification error:", error);
    res.status(401).json({ 
      error: error instanceof Error ? error.message : "Wallet verification failed" 
    });
  }
});

// ============================================================================
// Email/Password Authentication
// ============================================================================

/**
 * POST /api/auth/register
 * Register with email and password
 */
router.post("/register", authRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, password, username, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const { userId, verificationToken } = await emailAuth.registerWithEmail(
      email,
      password,
      username,
      displayName
    );

    // Send verification email
    await emailService.sendVerificationEmail(email, verificationToken, username);

    res.json({
      message: "Registration successful. Please check your email to verify your account.",
      userId,
    });
  } catch (error) {
    console.error("[Auth API] Registration error:", error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : "Registration failed" 
    });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post("/login", authRateLimit, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await emailAuth.authenticateWithEmail(email, password);

    // Generate JWT token
    const token = jwtService.generateToken({
      userId: user.id,
      walletAddress: user.walletAddress,
      email: user.email,
      role: user.role,
    });

    res.json({
      token,
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error("[Auth API] Login error:", error);
    res.status(401).json({ 
      error: error instanceof Error ? error.message : "Login failed" 
    });
  }
});

/**
 * GET /api/auth/verify-email
 * Verify email with token
 */
router.get("/verify-email", async (req: Request, res: Response) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== "string") {
      return res.status(400).json({ error: "Verification token is required" });
    }

    const userId = await emailAuth.verifyEmailToken(token);

    // Get user to send welcome email
    const dbInstance = await require("../db").getDb();
    if (dbInstance) {
      const { users } = require("../../drizzle/schema");
      const { eq } = require("drizzle-orm");
      
      const userResult = await dbInstance
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userResult.length > 0) {
        const user = userResult[0];
        if (user.email) {
          await emailService.sendWelcomeEmail(user.email, user.username);
        }
      }
    }

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("[Auth API] Email verification error:", error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : "Email verification failed" 
    });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email
 */
router.post("/resend-verification", strictAuthRateLimit, authenticate, async (req: Request, res: Response) => {
  try {
    if (!req.user.email) {
      return res.status(400).json({ error: "No email associated with account" });
    }

    if (req.user.emailVerified) {
      return res.status(400).json({ error: "Email already verified" });
    }

    const token = await emailAuth.generateEmailVerificationToken(req.user.id);
    await emailService.sendVerificationEmail(req.user.email, token, req.user.username);

    res.json({ message: "Verification email sent" });
  } catch (error) {
    console.error("[Auth API] Resend verification error:", error);
    res.status(500).json({ error: "Failed to send verification email" });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post("/forgot-password", strictAuthRateLimit, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    try {
      const token = await emailAuth.generatePasswordResetToken(email);
      
      // Get username for personalization
      const dbInstance = await require("../db").getDb();
      let username;
      if (dbInstance) {
        const { users } = require("../../drizzle/schema");
        const { eq } = require("drizzle-orm");
        
        const userResult = await dbInstance
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (userResult.length > 0) {
          username = userResult[0].username;
        }
      }

      await emailService.sendPasswordResetEmail(email, token, username);
    } catch (error) {
      // Don't reveal if email exists
      console.log("[Auth API] Password reset requested for:", email);
    }

    res.json({ 
      message: "If the email exists, a password reset link will be sent" 
    });
  } catch (error) {
    console.error("[Auth API] Forgot password error:", error);
    res.status(500).json({ error: "Failed to process password reset request" });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post("/reset-password", authRateLimit, async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and new password are required" });
    }

    await emailAuth.resetPasswordWithToken(token, newPassword);

    res.json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("[Auth API] Password reset error:", error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : "Password reset failed" 
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 */
router.post("/change-password", authenticate, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        error: "Current password and new password are required" 
      });
    }

    await emailAuth.changePassword(req.user.id, currentPassword, newPassword);

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("[Auth API] Change password error:", error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : "Password change failed" 
    });
  }
});

// ============================================================================
// Google OAuth
// ============================================================================

/**
 * GET /api/auth/google
 * Initiate Google OAuth flow
 */
router.get("/google", 
  passport.authenticate("google", { 
    scope: ["profile", "email"],
    session: false 
  })
);

/**
 * GET /api/auth/google/callback
 * Google OAuth callback
 */
router.get("/google/callback",
  passport.authenticate("google", { 
    session: false,
    failureRedirect: "/login?error=google_auth_failed" 
  }),
  (req: Request, res: Response) => {
    try {
      const user = req.user as any;

      // Generate JWT token
      const token = jwtService.generateToken({
        userId: user.id,
        walletAddress: user.walletAddress,
        email: user.email,
        role: user.role,
      });

      // Redirect to frontend with token
      res.redirect(`/?token=${token}`);
    } catch (error) {
      console.error("[Auth API] Google callback error:", error);
      res.redirect("/login?error=authentication_failed");
    }
  }
);

// ============================================================================
// Account Linking
// ============================================================================

/**
 * POST /api/auth/link/email
 * Link email/password to account
 */
router.post("/link/email", authenticate, async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const verificationToken = await emailAuth.linkEmailToUser(
      req.user.id,
      email,
      password
    );

    await emailService.sendVerificationEmail(email, verificationToken, req.user.username);

    res.json({ 
      message: "Email linked successfully. Please check your email to verify." 
    });
  } catch (error) {
    console.error("[Auth API] Link email error:", error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : "Failed to link email" 
    });
  }
});

/**
 * POST /api/auth/link/wallet
 * Link wallet to account
 */
router.post("/link/wallet", authenticate, async (req: Request, res: Response) => {
  try {
    const { walletAddress, message, signature } = req.body;

    if (!walletAddress || !message || !signature) {
      return res.status(400).json({ 
        error: "Wallet address, message, and signature are required" 
      });
    }

    await walletAuth.linkWalletToUser(
      req.user.id,
      walletAddress,
      message,
      signature
    );

    if (req.user.email) {
      await emailService.sendAccountLinkedEmail(
        req.user.email,
        "wallet",
        req.user.username
      );
    }

    res.json({ message: "Wallet linked successfully" });
  } catch (error) {
    console.error("[Auth API] Link wallet error:", error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : "Failed to link wallet" 
    });
  }
});

/**
 * DELETE /api/auth/unlink/email
 * Unlink email from account
 */
router.delete("/unlink/email", authenticate, async (req: Request, res: Response) => {
  try {
    await emailAuth.unlinkEmailFromUser(req.user.id);
    res.json({ message: "Email unlinked successfully" });
  } catch (error) {
    console.error("[Auth API] Unlink email error:", error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : "Failed to unlink email" 
    });
  }
});

/**
 * DELETE /api/auth/unlink/wallet
 * Unlink wallet from account
 */
router.delete("/unlink/wallet", authenticate, async (req: Request, res: Response) => {
  try {
    await walletAuth.unlinkWalletFromUser(req.user.id);
    res.json({ message: "Wallet unlinked successfully" });
  } catch (error) {
    console.error("[Auth API] Unlink wallet error:", error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : "Failed to unlink wallet" 
    });
  }
});

/**
 * DELETE /api/auth/unlink/google
 * Unlink Google from account
 */
router.delete("/unlink/google", authenticate, async (req: Request, res: Response) => {
  try {
    await googleAuth.unlinkGoogleFromUser(req.user.id);
    res.json({ message: "Google account unlinked successfully" });
  } catch (error) {
    console.error("[Auth API] Unlink Google error:", error);
    res.status(400).json({ 
      error: error instanceof Error ? error.message : "Failed to unlink Google account" 
    });
  }
});

// ============================================================================
// User Info
// ============================================================================

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get("/me", authenticate, (req: Request, res: Response) => {
  res.json({
    user: {
      id: req.user.id,
      walletAddress: req.user.walletAddress,
      email: req.user.email,
      username: req.user.username,
      displayName: req.user.displayName,
      avatar: req.user.avatar,
      role: req.user.role,
      emailVerified: req.user.emailVerified,
      hasWallet: !!req.user.walletAddress,
      hasEmail: !!req.user.email,
      hasGoogle: !!req.user.googleId,
      createdAt: req.user.createdAt,
      lastSignedIn: req.user.lastSignedIn,
    },
  });
});

/**
 * POST /api/auth/logout
 * Logout (client-side token deletion)
 */
router.post("/logout", (req: Request, res: Response) => {
  res.json({ message: "Logged out successfully" });
});

export default router;

