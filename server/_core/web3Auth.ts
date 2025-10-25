import { randomBytes } from "crypto";
import { verifyMessage } from "viem";

/**
 * Nonce storage for Web3 authentication
 * In production, this should be stored in Redis or database
 */
const nonceStore = new Map<string, { nonce: string; timestamp: number }>();

// Nonce expiration time: 5 minutes
const NONCE_EXPIRATION_MS = 5 * 60 * 1000;

/**
 * Generate a unique nonce for a wallet address
 */
export function generateNonce(address: string): string {
  const nonce = randomBytes(32).toString("hex");
  const timestamp = Date.now();
  
  // Clean up expired nonces
  cleanupExpiredNonces();
  
  // Store nonce with timestamp
  nonceStore.set(address.toLowerCase(), { nonce, timestamp });
  
  return nonce;
}

/**
 * Verify a nonce is valid for a wallet address
 */
export function verifyNonce(address: string, nonce: string): boolean {
  const stored = nonceStore.get(address.toLowerCase());
  
  if (!stored) {
    return false;
  }
  
  // Check if nonce matches
  if (stored.nonce !== nonce) {
    return false;
  }
  
  // Check if nonce is expired
  const isExpired = Date.now() - stored.timestamp > NONCE_EXPIRATION_MS;
  if (isExpired) {
    nonceStore.delete(address.toLowerCase());
    return false;
  }
  
  // Nonce is valid - delete it (single use)
  nonceStore.delete(address.toLowerCase());
  
  return true;
}

/**
 * Clean up expired nonces
 */
function cleanupExpiredNonces(): void {
  const now = Date.now();
  for (const [address, data] of nonceStore.entries()) {
    if (now - data.timestamp > NONCE_EXPIRATION_MS) {
      nonceStore.delete(address);
    }
  }
}

/**
 * Generate sign-in message for wallet signature
 */
export function generateSignInMessage(address: string, nonce: string): string {
  const timestamp = new Date().toISOString();
  return `Sign in to Fushuma Governance Hub

Wallet: ${address}
Nonce: ${nonce}
Timestamp: ${timestamp}

This request will not trigger a blockchain transaction or cost any gas fees.`;
}

/**
 * Verify wallet signature
 */
export async function verifyWalletSignature(
  message: string,
  signature: string,
  expectedAddress: string
): Promise<boolean> {
  try {
    const valid = await verifyMessage({
      address: expectedAddress as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });
    return valid;
  } catch (error) {
    console.error("[Web3Auth] Signature verification failed:", error);
    return false;
  }
}

/**
 * Validate Ethereum address format
 */
export function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

