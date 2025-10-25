import { ethers } from 'ethers';
import { db } from '../_core/db';
import { epochs } from '../../drizzle/schema-phase2';
import { eq } from 'drizzle-orm';

/**
 * Epoch Management Service
 * Syncs epoch data from blockchain and manages epoch lifecycle
 */

const EPOCH_DURATION = 14 * 24 * 60 * 60; // 14 days in seconds
const VOTING_DURATION = 7 * 24 * 60 * 60; // 7 days in seconds
const DISTRIBUTION_DURATION = 1 * 24 * 60 * 60; // 1 day in seconds

export type EpochPhase = 'preparation' | 'voting' | 'distribution';

export interface EpochInfo {
  number: number;
  startTime: Date;
  endTime: Date;
  votingStartTime: Date;
  votingEndTime: Date;
  distributionTime: Date;
  status: 'upcoming' | 'voting' | 'distribution' | 'completed';
  phase: EpochPhase;
  timeRemaining: number;
  totalVotingPower?: bigint;
  totalDistributed?: bigint;
  proposalsCount?: number;
  votersCount?: number;
  finalized?: boolean;
}

class EpochManagerService {
  private provider: ethers.Provider | null = null;
  private epochManagerContract: ethers.Contract | null = null;
  private contractAddress: string | null = null;

  /**
   * Initialize the epoch manager service
   */
  async initialize(
    rpcUrl: string,
    epochManagerAddress: string,
    epochManagerAbi: any[]
  ): Promise<void> {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.contractAddress = epochManagerAddress;
    this.epochManagerContract = new ethers.Contract(
      epochManagerAddress,
      epochManagerAbi,
      this.provider
    );

    console.log('EpochManagerService initialized');
  }

  /**
   * Get current epoch from blockchain
   */
  async getCurrentEpochFromChain(): Promise<number> {
    if (!this.epochManagerContract) {
      throw new Error('Epoch manager not initialized');
    }

    const currentEpoch = await this.epochManagerContract.getCurrentEpoch();
    return Number(currentEpoch);
  }

  /**
   * Get epoch data from blockchain
   */
  async getEpochDataFromChain(epochNumber: number): Promise<any> {
    if (!this.epochManagerContract) {
      throw new Error('Epoch manager not initialized');
    }

    const epochData = await this.epochManagerContract.getEpochData(epochNumber);
    return {
      startTime: new Date(Number(epochData.startTime) * 1000),
      endTime: new Date(Number(epochData.endTime) * 1000),
      votingStartTime: new Date(Number(epochData.votingStartTime) * 1000),
      votingEndTime: new Date(Number(epochData.votingEndTime) * 1000),
      distributionTime: new Date(Number(epochData.distributionTime) * 1000),
      totalVotingPower: epochData.totalVotingPower,
      totalDistributed: epochData.totalDistributed,
      finalized: epochData.finalized,
    };
  }

  /**
   * Sync epoch from blockchain to database
   */
  async syncEpoch(epochNumber: number): Promise<void> {
    const chainData = await this.getEpochDataFromChain(epochNumber);
    const status = this.calculateEpochStatus(chainData);

    // Check if epoch exists
    const existing = await db.query.epochs.findFirst({
      where: eq(epochs.number, epochNumber),
    });

    if (existing) {
      // Update existing epoch
      await db
        .update(epochs)
        .set({
          totalVotingPower: Number(chainData.totalVotingPower),
          totalDistributed: Number(chainData.totalDistributed),
          finalized: chainData.finalized,
          status,
        })
        .where(eq(epochs.number, epochNumber));
    } else {
      // Insert new epoch
      await db.insert(epochs).values({
        number: epochNumber,
        startTime: chainData.startTime,
        endTime: chainData.endTime,
        votingStartTime: chainData.votingStartTime,
        votingEndTime: chainData.votingEndTime,
        distributionTime: chainData.distributionTime,
        status,
        totalVotingPower: Number(chainData.totalVotingPower),
        totalDistributed: Number(chainData.totalDistributed),
        finalized: chainData.finalized,
      });
    }

    console.log(`Synced epoch ${epochNumber} from blockchain`);
  }

  /**
   * Calculate epoch status based on timestamps
   */
  private calculateEpochStatus(epochData: any): 'upcoming' | 'voting' | 'distribution' | 'completed' {
    const now = Date.now();
    const startTime = epochData.startTime.getTime();
    const votingEndTime = epochData.votingEndTime.getTime();
    const distributionEndTime = epochData.distributionTime.getTime() + DISTRIBUTION_DURATION * 1000;
    const endTime = epochData.endTime.getTime();

    if (now < startTime) {
      return 'upcoming';
    } else if (now >= startTime && now < votingEndTime) {
      return 'voting';
    } else if (now >= votingEndTime && now < distributionEndTime) {
      return 'distribution';
    } else {
      return 'completed';
    }
  }

  /**
   * Get current epoch info
   */
  async getCurrentEpoch(): Promise<EpochInfo> {
    const currentEpochNumber = await this.getCurrentEpochFromChain();
    return this.getEpochInfo(currentEpochNumber);
  }

  /**
   * Get epoch info by number
   */
  async getEpochInfo(epochNumber: number): Promise<EpochInfo> {
    // Try to get from database first
    let epoch = await db.query.epochs.findFirst({
      where: eq(epochs.number, epochNumber),
    });

    // If not in database, sync from chain
    if (!epoch) {
      await this.syncEpoch(epochNumber);
      epoch = await db.query.epochs.findFirst({
        where: eq(epochs.number, epochNumber),
      });
    }

    if (!epoch) {
      throw new Error(`Epoch ${epochNumber} not found`);
    }

    const phase = this.getCurrentPhase(epoch);
    const timeRemaining = this.getTimeRemainingInPhase(epoch, phase);

    return {
      number: epoch.number,
      startTime: epoch.startTime,
      endTime: epoch.endTime,
      votingStartTime: epoch.votingStartTime,
      votingEndTime: epoch.votingEndTime,
      distributionTime: epoch.distributionTime,
      status: epoch.status,
      phase,
      timeRemaining,
      totalVotingPower: epoch.totalVotingPower ? BigInt(epoch.totalVotingPower) : undefined,
      totalDistributed: epoch.totalDistributed ? BigInt(epoch.totalDistributed) : undefined,
      proposalsCount: epoch.proposalsCount ?? undefined,
      votersCount: epoch.votersCount ?? undefined,
      finalized: epoch.finalized ?? undefined,
    };
  }

  /**
   * Get current phase of an epoch
   */
  private getCurrentPhase(epoch: any): EpochPhase {
    const now = Date.now();
    const votingStartTime = epoch.votingStartTime.getTime();
    const votingEndTime = epoch.votingEndTime.getTime();
    const distributionEndTime = epoch.distributionTime.getTime() + DISTRIBUTION_DURATION * 1000;

    if (now >= votingStartTime && now < votingEndTime) {
      return 'voting';
    } else if (now >= votingEndTime && now < distributionEndTime) {
      return 'distribution';
    } else {
      return 'preparation';
    }
  }

  /**
   * Get time remaining in current phase (in seconds)
   */
  private getTimeRemainingInPhase(epoch: any, phase: EpochPhase): number {
    const now = Date.now();

    if (phase === 'voting') {
      return Math.max(0, Math.floor((epoch.votingEndTime.getTime() - now) / 1000));
    } else if (phase === 'distribution') {
      const distributionEndTime = epoch.distributionTime.getTime() + DISTRIBUTION_DURATION * 1000;
      return Math.max(0, Math.floor((distributionEndTime - now) / 1000));
    } else {
      return Math.max(0, Math.floor((epoch.endTime.getTime() - now) / 1000));
    }
  }

  /**
   * Get epoch history
   */
  async getEpochHistory(limit: number = 10): Promise<EpochInfo[]> {
    const epochRecords = await db.query.epochs.findMany({
      orderBy: (epochs, { desc }) => [desc(epochs.number)],
      limit,
    });

    return Promise.all(
      epochRecords.map(async (epoch) => {
        const phase = this.getCurrentPhase(epoch);
        const timeRemaining = this.getTimeRemainingInPhase(epoch, phase);

        return {
          number: epoch.number,
          startTime: epoch.startTime,
          endTime: epoch.endTime,
          votingStartTime: epoch.votingStartTime,
          votingEndTime: epoch.votingEndTime,
          distributionTime: epoch.distributionTime,
          status: epoch.status,
          phase,
          timeRemaining,
          totalVotingPower: epoch.totalVotingPower ? BigInt(epoch.totalVotingPower) : undefined,
          totalDistributed: epoch.totalDistributed ? BigInt(epoch.totalDistributed) : undefined,
          proposalsCount: epoch.proposalsCount ?? undefined,
          votersCount: epoch.votersCount ?? undefined,
          finalized: epoch.finalized ?? undefined,
        };
      })
    );
  }

  /**
   * Advance to next epoch (calls blockchain)
   */
  async advanceEpoch(signer: ethers.Signer): Promise<string> {
    if (!this.epochManagerContract) {
      throw new Error('Epoch manager not initialized');
    }

    const contract = this.epochManagerContract.connect(signer);
    const tx = await contract.advanceEpoch();
    await tx.wait();

    console.log(`Advanced to next epoch, tx: ${tx.hash}`);
    return tx.hash;
  }

  /**
   * Start background sync process
   */
  startAutoSync(intervalMs: number = 60000): NodeJS.Timeout {
    const syncTask = async () => {
      try {
        const currentEpoch = await this.getCurrentEpochFromChain();
        
        // Sync current and previous epoch
        await this.syncEpoch(currentEpoch);
        if (currentEpoch > 0) {
          await this.syncEpoch(currentEpoch - 1);
        }
        
        console.log(`Auto-synced epochs: ${currentEpoch - 1}, ${currentEpoch}`);
      } catch (error) {
        console.error('Error in epoch auto-sync:', error);
      }
    };

    // Run immediately
    syncTask();

    // Then run on interval
    return setInterval(syncTask, intervalMs);
  }
}

export const epochManager = new EpochManagerService();

