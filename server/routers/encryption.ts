import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import {
  createEncryptedProposal,
  decryptProposalForMember,
  getSignatureMessage,
  hashMetadata,
  type ProposalMetadata,
  type ProposalAction,
} from "../services/encryption/proposalEncryption";
import { ethereumAddressSchema } from "../validation";

const proposalActionSchema = z.object({
  target: ethereumAddressSchema,
  value: z.string(),
  signature: z.string(),
  calldata: z.string(),
});

const proposalMetadataSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(50000),
  actions: z.array(proposalActionSchema),
});

export const encryptionRouter = router({
  // Get signature message for key generation
  getSignatureMessage: publicProcedure.query(() => {
    return { message: getSignatureMessage() };
  }),

  // Encrypt a proposal
  encryptProposal: protectedProcedure
    .input(z.object({
      metadata: proposalMetadataSchema,
      securityCouncilMembers: z.array(ethereumAddressSchema).min(1).max(20),
    }))
    .mutation(({ input }) => {
      const metadata: ProposalMetadata = {
        title: input.metadata.title,
        description: input.metadata.description,
        actions: input.metadata.actions.map(action => ({
          target: action.target,
          value: action.value,
          signature: action.signature,
          calldata: action.calldata,
        })),
      };

      const encrypted = createEncryptedProposal(
        metadata,
        input.securityCouncilMembers
      );

      return encrypted;
    }),

  // Decrypt a proposal (for authorized council members)
  decryptProposal: protectedProcedure
    .input(z.object({
      encryptedData: z.string(),
      encryptedKeys: z.array(z.object({
        recipient: ethereumAddressSchema,
        encryptedSymmetricKey: z.string(),
      })),
      metadataHash: z.string(),
      iv: z.string(),
      authTag: z.string(),
      memberAddress: ethereumAddressSchema,
      memberPrivateKey: z.string(),
    }))
    .mutation(({ input }) => {
      const encryptedProposal = {
        encryptedData: input.encryptedData,
        encryptedKeys: input.encryptedKeys,
        metadataHash: input.metadataHash,
        iv: input.iv,
        authTag: input.authTag,
      };

      const decrypted = decryptProposalForMember(
        encryptedProposal,
        input.memberAddress,
        input.memberPrivateKey
      );

      return decrypted;
    }),

  // Hash metadata for verification
  hashMetadata: publicProcedure
    .input(proposalMetadataSchema)
    .query(({ input }) => {
      const metadata: ProposalMetadata = {
        title: input.title,
        description: input.description,
        actions: input.actions.map(action => ({
          target: action.target,
          value: action.value,
          signature: action.signature,
          calldata: action.calldata,
        })),
      };

      return { hash: hashMetadata(metadata) };
    }),
});

