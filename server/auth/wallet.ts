import { ethers } from "ethers";
import { randomBytes } from "crypto";
import * as db from "../db";
import { web3Nonces, users } from "../../drizzle/schema";
import { eq, and, gt } from "drizzle-orm";

/**
 * Web3 Wallet Authentication Service
 * Implements SIWE (Sign-In with Ethereum) standard
 */

const NONCE_EXPIRATION_MS = 10 * 60 * 1000; // 10 minutes

export interface SIWEMessage {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
  expirationTime?: string;
}

/**
 * Generate a unique nonce for wallet sign-in
 */
export async function generateNonce(walletAddress: string): Promise<string> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  // Normalize wallet address to lowercase
  const normalizedAddress = walletAddress.toLowerCase();

  // Generate random nonce
  const nonce = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + NONCE_EXPIRATION_MS);

  // Clean up expired nonces for this wallet
  await dbInstance
    .delete(web3Nonces)
    .where(
      and(
        eq(web3Nonces.walletAddress, normalizedAddress),
        gt(web3Nonces.expiresAt, new Date())
      )
    );

  // Store new nonce
  await dbInstance.insert(web3Nonces).values({
    walletAddress: normalizedAddress,
    nonce,
    expiresAt,
  });

  return nonce;
}

/**
 * Verify nonce exists and is valid
 */
async function verifyNonce(
  walletAddress: string,
  nonce: string
): Promise<boolean> {
  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  const normalizedAddress = walletAddress.toLowerCase();

  // Find valid nonce
  const result = await dbInstance
    .select()
    .from(web3Nonces)
    .where(
      and(
        eq(web3Nonces.walletAddress, normalizedAddress),
        eq(web3Nonces.nonce, nonce),
        gt(web3Nonces.expiresAt, new Date())
      )
    )
    .limit(1);

  if (result.length === 0) {
    return false;
  }

  // Delete used nonce (one-time use)
  await dbInstance
    .delete(web3Nonces)
    .where(eq(web3Nonces.id, result[0].id));

  return true;
}

/**
 * Create SIWE message for signing
 */
export function createSIWEMessage(
  walletAddress: string,
  nonce: string,
  domain: string,
  chainId: number = 121224 // Fushuma network
): string {
  const message = `${domain} wants you to sign in with your Ethereum account:
${walletAddress}

Sign in to Fushuma Governance Hub

URI: https://${domain}
Version: 1
Chain ID: ${chainId}
Nonce: ${nonce}
Issued At: ${new Date().toISOString()}`;

  return message;
}

/**
 * Parse SIWE message from string
 */
function parseSIWEMessage(message: string): SIWEMessage | null {
  try {
    const lines = message.split("\n");
    
    // Extract domain and address from first line
    const firstLine = lines[0];
    const domainMatch = firstLine.match(/^(.+) wants you to sign in/);
    if (!domainMatch) return null;
    const domain = domainMatch[1];

    const address = lines[1];
    if (!address || !ethers.isAddress(address)) return null;

    // Extract other fields
    const statement = lines[3] || "";
    const uri = lines.find((l) => l.startsWith("URI:"))?.split("URI: ")[1] || "";
    const version = lines.find((l) => l.startsWith("Version:"))?.split("Version: ")[1] || "";
    const chainId = parseInt(
      lines.find((l) => l.startsWith("Chain ID:"))?.split("Chain ID: ")[1] || "1"
    );
    const nonce = lines.find((l) => l.startsWith("Nonce:"))?.split("Nonce: ")[1] || "";
    const issuedAt = lines.find((l) => l.startsWith("Issued At:"))?.split("Issued At: ")[1] || "";

    return {
      domain,
      address,
      statement,
      uri,
      version,
      chainId,
      nonce,
      issuedAt,
    };
  } catch (error) {
    console.error("[Wallet Auth] Failed to parse SIWE message:", error);
    return null;
  }
}

/**
 * Verify wallet signature
 */
export async function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): Promise<boolean> {
  try {
    // Parse SIWE message
    const siweMessage = parseSIWEMessage(message);
    if (!siweMessage) {
      console.error("[Wallet Auth] Invalid SIWE message format");
      return false;
    }

    // Verify address matches
    const normalizedExpected = expectedAddress.toLowerCase();
    const normalizedMessage = siweMessage.address.toLowerCase();
    if (normalizedExpected !== normalizedMessage) {
      console.error("[Wallet Auth] Address mismatch");
      return false;
    }

    // Verify nonce
    const nonceValid = await verifyNonce(siweMessage.address, siweMessage.nonce);
    if (!nonceValid) {
      console.error("[Wallet Auth] Invalid or expired nonce");
      return false;
    }

    // Recover signer address from signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    const normalizedRecovered = recoveredAddress.toLowerCase();

    // Verify recovered address matches expected address
    if (normalizedRecovered !== normalizedExpected) {
      console.error("[Wallet Auth] Signature verification failed");
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Wallet Auth] Signature verification error:", error);
    return false;
  }
}

/**
 * Authenticate user with wallet signature
 * Creates user if doesn't exist
 */
export async function authenticateWallet(
  walletAddress: string,
  message: string,
  signature: string
): Promise<{ user: any; isNewUser: boolean }> {
  // Verify signature
  const isValid = await verifySignature(message, signature, walletAddress);
  if (!isValid) {
    throw new Error("Invalid signature");
  }

  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  const normalizedAddress = walletAddress.toLowerCase();

  // Check if user exists
  const existingUsers = await dbInstance
    .select()
    .from(users)
    .where(eq(users.walletAddress, normalizedAddress))
    .limit(1);

  let user;
  let isNewUser = false;

  if (existingUsers.length > 0) {
    // Update last signed in
    user = existingUsers[0];
    await dbInstance
      .update(users)
      .set({ lastSignedIn: new Date() })
      .where(eq(users.id, user.id));
  } else {
    // Create new user
    isNewUser = true;
    const result = await dbInstance.insert(users).values({
      walletAddress: normalizedAddress,
      loginMethod: "wallet",
      lastSignedIn: new Date(),
    });

    // Fetch created user
    const newUsers = await dbInstance
      .select()
      .from(users)
      .where(eq(users.walletAddress, normalizedAddress))
      .limit(1);

    user = newUsers[0];
  }

  return { user, isNewUser };
}

/**
 * Link wallet to existing user account
 */
export async function linkWalletToUser(
  userId: number,
  walletAddress: string,
  message: string,
  signature: string
): Promise<void> {
  // Verify signature
  const isValid = await verifySignature(message, signature, walletAddress);
  if (!isValid) {
    throw new Error("Invalid signature");
  }

  const dbInstance = await db.getDb();
  if (!dbInstance) {
    throw new Error("Database not available");
  }

  const normalizedAddress = walletAddress.toLowerCase();

  // Check if wallet is already linked to another user
  const existingUsers = await dbInstance
    .select()
    .from(users)
    .where(eq(users.walletAddress, normalizedAddress))
    .limit(1);

  if (existingUsers.length > 0 && existingUsers[0].id !== userId) {
    throw new Error("Wallet already linked to another account");
  }

  // Link wallet to user
  await dbInstance
    .update(users)
    .set({ walletAddress: normalizedAddress })
    .where(eq(users.id, userId));
}

/**
 * Unlink wallet from user account
 */
export async function unlinkWalletFromUser(userId: number): Promise<void> {
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
  if (!user.email && !user.googleId) {
    throw new Error("Cannot unlink wallet: no other login method available");
  }

  // Unlink wallet
  await dbInstance
    .update(users)
    .set({ walletAddress: null })
    .where(eq(users.id, userId));
}

