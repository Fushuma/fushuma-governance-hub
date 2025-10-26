import nodemailer from "nodemailer";

/**
 * Email Sending Service
 */

const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = parseInt(process.env.SMTP_PORT || "587");
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;
const EMAIL_FROM = process.env.EMAIL_FROM || "Fushuma Governance <noreply@fushuma.com>";
const APP_URL = process.env.APP_URL || "https://governance.fushuma.com";

let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter
 */
function getTransporter(): nodemailer.Transporter | null {
  if (!SMTP_USER || !SMTP_PASSWORD) {
    console.warn("[Email Service] SMTP not configured. Set SMTP_USER and SMTP_PASSWORD.");
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    console.log("[Email Service] Email transporter initialized");
  }

  return transporter;
}

/**
 * Send email
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<boolean> {
  const transport = getTransporter();

  if (!transport) {
    console.warn("[Email Service] Cannot send email: SMTP not configured");
    return false;
  }

  try {
    await transport.sendMail({
      from: EMAIL_FROM,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ""), // Strip HTML for text version
    });

    console.log(`[Email Service] Email sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error("[Email Service] Failed to send email:", error);
    return false;
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  token: string,
  username?: string
): Promise<boolean> {
  const verificationUrl = `${APP_URL}/verify-email?token=${token}`;
  const displayName = username || email;

  const subject = "Verify your email - Fushuma Governance";
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Fushuma Governance</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>
    
    <p>Hello ${displayName},</p>
    
    <p>Thank you for registering with Fushuma Governance Hub! To complete your registration and start participating in governance, please verify your email address.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Verify Email Address</a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="background: white; padding: 15px; border-radius: 5px; word-break: break-all; font-size: 14px; border: 1px solid #ddd;">
      ${verificationUrl}
    </p>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      This verification link will expire in 24 hours. If you didn't create an account with Fushuma Governance, you can safely ignore this email.
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center;">
      © 2025 Fushuma Governance Hub. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail(email, subject, html);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  token: string,
  username?: string
): Promise<boolean> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  const displayName = username || email;

  const subject = "Reset your password - Fushuma Governance";
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Fushuma Governance</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>
    
    <p>Hello ${displayName},</p>
    
    <p>We received a request to reset your password for your Fushuma Governance Hub account. Click the button below to create a new password.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
    </div>
    
    <p>Or copy and paste this link into your browser:</p>
    <p style="background: white; padding: 15px; border-radius: 5px; word-break: break-all; font-size: 14px; border: 1px solid #ddd;">
      ${resetUrl}
    </p>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      This password reset link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center;">
      © 2025 Fushuma Governance Hub. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail(email, subject, html);
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail(
  email: string,
  username?: string
): Promise<boolean> {
  const displayName = username || email;

  const subject = "Welcome to Fushuma Governance!";
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Fushuma Governance</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Welcome to Fushuma!</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Your Account is Ready</h2>
    
    <p>Hello ${displayName},</p>
    
    <p>Welcome to Fushuma Governance Hub! Your email has been verified and your account is now active.</p>
    
    <h3 style="color: #667eea;">What's Next?</h3>
    
    <ul style="line-height: 2;">
      <li><strong>Explore Launchpad:</strong> Discover and vote on new projects</li>
      <li><strong>Browse Grants:</strong> View development grants and proposals</li>
      <li><strong>Participate in Governance:</strong> Vote on proposals and shape the future</li>
      <li><strong>Join the Community:</strong> Connect with other members</li>
    </ul>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Go to Dashboard</a>
    </div>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      If you have any questions or need help getting started, feel free to reach out to our community on Discord or Telegram.
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center;">
      © 2025 Fushuma Governance Hub. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail(email, subject, html);
}

/**
 * Send account linked notification
 */
export async function sendAccountLinkedEmail(
  email: string,
  linkedMethod: "wallet" | "email" | "google",
  username?: string
): Promise<boolean> {
  const displayName = username || email;
  const methodName = linkedMethod === "wallet" ? "Wallet" : 
                     linkedMethod === "email" ? "Email/Password" : 
                     "Google Account";

  const subject = `${methodName} Linked - Fushuma Governance`;
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Account Linked</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0;">Fushuma Governance</h1>
  </div>
  
  <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
    <h2 style="color: #333; margin-top: 0;">Account Linked Successfully</h2>
    
    <p>Hello ${displayName},</p>
    
    <p>Your ${methodName} has been successfully linked to your Fushuma Governance Hub account. You can now use this method to sign in.</p>
    
    <p style="background: white; padding: 20px; border-radius: 5px; border-left: 4px solid #667eea; margin: 20px 0;">
      <strong>Security Tip:</strong> You can now sign in using any of your linked authentication methods. Manage your linked accounts in your security settings.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/settings/security" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Manage Security Settings</a>
    </div>
    
    <p style="color: #666; font-size: 14px; margin-top: 30px;">
      If you didn't link this account, please contact support immediately.
    </p>
    
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    
    <p style="color: #999; font-size: 12px; text-align: center;">
      © 2025 Fushuma Governance Hub. All rights reserved.
    </p>
  </div>
</body>
</html>
  `;

  return sendEmail(email, subject, html);
}

