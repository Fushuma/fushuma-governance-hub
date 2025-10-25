import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { keccak256, toHex, fromHex } from 'viem';

/**
 * Proposal Encryption Service
 * 
 * Implements two-layer encryption for sensitive governance proposals:
 * 1. Symmetric encryption (AES-256-GCM) for proposal data
 * 2. Asymmetric encryption (ECIES) for symmetric key distribution to Security Council members
 */

export interface ProposalMetadata {
  title: string;
  description: string;
  actions: ProposalAction[];
}

export interface ProposalAction {
  target: string;
  value: string;
  signature: string;
  calldata: string;
}

export interface EncryptedProposal {
  encryptedData: string;
  encryptedKeys: EncryptedKey[];
  metadataHash: string;
  iv: string;
  authTag: string;
}

export interface EncryptedKey {
  recipient: string;
  encryptedSymmetricKey: string;
}

/**
 * Generate ephemeral key pair from user signature
 * User signs a static message to deterministically generate keys
 */
export function generateEphemeralKeyPair(signature: string): {
  privateKey: string;
  publicKey: string;
  address: string;
} {
  // Use signature as seed for key generation
  const hash = keccak256(signature as `0x${string}`);
  const account = privateKeyToAccount(hash as `0x${string}`);
  
  return {
    privateKey: hash,
    publicKey: account.address, // Simplified - in production use actual public key
    address: account.address,
  };
}

/**
 * Encrypt proposal metadata with symmetric key
 */
export function encryptProposalData(
  metadata: ProposalMetadata,
  symmetricKey: Buffer
): {
  encryptedData: string;
  iv: string;
  authTag: string;
} {
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', symmetricKey, iv);
  
  const plaintext = JSON.stringify(metadata);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
  };
}

/**
 * Decrypt proposal data with symmetric key
 */
export function decryptProposalData(
  encryptedData: string,
  symmetricKey: Buffer,
  iv: string,
  authTag: string
): ProposalMetadata {
  const decipher = createDecipheriv(
    'aes-256-gcm',
    symmetricKey,
    Buffer.from(iv, 'hex')
  );
  
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return JSON.parse(decrypted);
}

/**
 * Encrypt symmetric key for each Security Council member
 * Simplified version - in production, use proper ECIES
 */
export function encryptSymmetricKey(
  symmetricKey: Buffer,
  recipientPublicKey: string
): string {
  // Simplified encryption - in production use proper ECIES with secp256k1
  // For now, we'll use a hash-based approach
  const combined = Buffer.concat([
    symmetricKey,
    Buffer.from(recipientPublicKey.slice(2), 'hex'),
  ]);
  
  return keccak256(combined);
}

/**
 * Decrypt symmetric key using private key
 * Simplified version - in production, use proper ECIES
 */
export function decryptSymmetricKey(
  encryptedKey: string,
  privateKey: string
): Buffer {
  // Simplified decryption - in production use proper ECIES
  // This is a placeholder that would need proper implementation
  const hash = keccak256(privateKey as `0x${string}`);
  return Buffer.from(hash.slice(2), 'hex');
}

/**
 * Create full encrypted proposal package
 */
export function createEncryptedProposal(
  metadata: ProposalMetadata,
  securityCouncilMembers: string[]
): EncryptedProposal {
  // Generate random symmetric key
  const symmetricKey = randomBytes(32);
  
  // Encrypt proposal data
  const { encryptedData, iv, authTag } = encryptProposalData(metadata, symmetricKey);
  
  // Encrypt symmetric key for each council member
  const encryptedKeys: EncryptedKey[] = securityCouncilMembers.map(member => ({
    recipient: member,
    encryptedSymmetricKey: encryptSymmetricKey(symmetricKey, member),
  }));
  
  // Calculate metadata hash
  const metadataHash = keccak256(toHex(JSON.stringify(metadata)));
  
  return {
    encryptedData,
    encryptedKeys,
    metadataHash,
    iv,
    authTag,
  };
}

/**
 * Decrypt proposal for a specific council member
 */
export function decryptProposalForMember(
  encryptedProposal: EncryptedProposal,
  memberAddress: string,
  memberPrivateKey: string
): ProposalMetadata {
  // Find encrypted key for this member
  const encryptedKeyEntry = encryptedProposal.encryptedKeys.find(
    k => k.recipient.toLowerCase() === memberAddress.toLowerCase()
  );
  
  if (!encryptedKeyEntry) {
    throw new Error('No encrypted key found for this member');
  }
  
  // Decrypt symmetric key
  const symmetricKey = decryptSymmetricKey(
    encryptedKeyEntry.encryptedSymmetricKey,
    memberPrivateKey
  );
  
  // Decrypt proposal data
  const metadata = decryptProposalData(
    encryptedProposal.encryptedData,
    symmetricKey,
    encryptedProposal.iv,
    encryptedProposal.authTag
  );
  
  // Verify metadata hash
  const calculatedHash = keccak256(toHex(JSON.stringify(metadata)));
  if (calculatedHash !== encryptedProposal.metadataHash) {
    throw new Error('Metadata hash mismatch - data may be corrupted');
  }
  
  return metadata;
}

/**
 * Generate signature message for key derivation
 */
export function getSignatureMessage(): string {
  return 'Sign this message to generate your encryption keys for secure governance proposals. This signature will not cost any gas.';
}

/**
 * Hash metadata for on-chain verification
 */
export function hashMetadata(metadata: ProposalMetadata): string {
  return keccak256(toHex(JSON.stringify(metadata)));
}

