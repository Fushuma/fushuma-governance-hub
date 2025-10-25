import { createPublicClient, http, parseAbiItem, type Log } from 'viem';
import { db } from '../../db';
import { blockchainEvents, indexerState } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { logger } from '../../_core/logger';

// Fushuma Network configuration
const FUSHUMA_CHAIN_ID = 121224;
const FUSHUMA_RPC_URL = process.env.FUSHUMA_RPC_URL || 'https://rpc.fushuma.network';

// Configure the client for Fushuma Network
const publicClient = createPublicClient({
  chain: {
    id: FUSHUMA_CHAIN_ID,
    name: 'Fushuma Network',
    network: 'fushuma',
    nativeCurrency: {
      decimals: 18,
      name: 'FUMA',
      symbol: 'FUMA',
    },
    rpcUrls: {
      default: { http: [FUSHUMA_RPC_URL] },
      public: { http: [FUSHUMA_RPC_URL] },
    },
  },
  transport: http(FUSHUMA_RPC_URL),
});

// Event signatures to monitor
const GOVERNANCE_EVENTS = {
  ProposalCreated: parseAbiItem('event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string description, uint256 startBlock, uint256 endBlock)'),
  VoteCast: parseAbiItem('event VoteCast(address indexed voter, uint256 indexed proposalId, uint8 support, uint256 weight, string reason)'),
  ProposalExecuted: parseAbiItem('event ProposalExecuted(uint256 indexed proposalId)'),
  ProposalCanceled: parseAbiItem('event ProposalCanceled(uint256 indexed proposalId)'),
  DelegateChanged: parseAbiItem('event DelegateChanged(address indexed delegator, address indexed fromDelegate, address indexed toDelegate)'),
  DelegateVotesChanged: parseAbiItem('event DelegateVotesChanged(address indexed delegate, uint256 previousBalance, uint256 newBalance)'),
};

interface IndexerConfig {
  contractAddress: string;
  startBlock?: bigint;
  pollInterval?: number;
}

export class BlockchainIndexer {
  private config: IndexerConfig;
  private isRunning = false;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(config: IndexerConfig) {
    this.config = {
      pollInterval: 12000, // 12 seconds default
      ...config,
    };
  }

  async start() {
    if (this.isRunning) {
      logger.warn('Indexer is already running');
      return;
    }

    this.isRunning = true;
    logger.info(`Starting blockchain indexer for contract: ${this.config.contractAddress}`);

    // Initial sync
    await this.syncEvents();

    // Set up polling
    this.pollInterval = setInterval(async () => {
      try {
        await this.syncEvents();
      } catch (error) {
        logger.error('Error during event sync:', error);
      }
    }, this.config.pollInterval);
  }

  async stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isRunning = false;
    logger.info('Blockchain indexer stopped');
  }

  private async getLastProcessedBlock(): Promise<bigint> {
    const state = await db.query.indexerState.findFirst({
      where: eq(indexerState.contractAddress, this.config.contractAddress),
    });

    if (state) {
      return BigInt(state.lastProcessedBlock);
    }

    // If no state exists, use config start block or current block - 1000
    if (this.config.startBlock) {
      return this.config.startBlock;
    }

    const currentBlock = await publicClient.getBlockNumber();
    return currentBlock - 1000n;
  }

  private async updateLastProcessedBlock(blockNumber: bigint) {
    const existing = await db.query.indexerState.findFirst({
      where: eq(indexerState.contractAddress, this.config.contractAddress),
    });

    if (existing) {
      await db.update(indexerState)
        .set({ lastProcessedBlock: Number(blockNumber) })
        .where(eq(indexerState.contractAddress, this.config.contractAddress));
    } else {
      await db.insert(indexerState).values({
        contractAddress: this.config.contractAddress,
        lastProcessedBlock: Number(blockNumber),
      });
    }
  }

  private async syncEvents() {
    try {
      const fromBlock = await this.getLastProcessedBlock();
      const currentBlock = await publicClient.getBlockNumber();

      if (fromBlock >= currentBlock) {
        return; // Already up to date
      }

      // Process in chunks to avoid RPC limits
      const CHUNK_SIZE = 1000n;
      let processedBlock = fromBlock;

      for (let start = fromBlock + 1n; start <= currentBlock; start += CHUNK_SIZE) {
        const end = start + CHUNK_SIZE - 1n > currentBlock ? currentBlock : start + CHUNK_SIZE - 1n;

        logger.info(`Syncing events from block ${start} to ${end}`);

        // Fetch all governance events
        const logs = await publicClient.getLogs({
          address: this.config.contractAddress as `0x${string}`,
          events: Object.values(GOVERNANCE_EVENTS),
          fromBlock: start,
          toBlock: end,
        });

        // Process each log
        for (const log of logs) {
          await this.processLog(log);
        }

        processedBlock = end;
        await this.updateLastProcessedBlock(processedBlock);
      }

      logger.info(`Synced up to block ${processedBlock}`);
    } catch (error) {
      logger.error('Error syncing events:', error);
      throw error;
    }
  }

  private async processLog(log: Log) {
    try {
      // Determine event type from topics
      const eventType = this.getEventType(log);
      if (!eventType) {
        logger.warn('Unknown event type:', log);
        return;
      }

      // Store the event
      await db.insert(blockchainEvents).values({
        eventType,
        contractAddress: log.address,
        blockNumber: Number(log.blockNumber),
        transactionHash: log.transactionHash!,
        eventData: log as any,
      });

      // Delegate to specific handlers
      await this.handleEvent(eventType, log);

      logger.debug(`Processed ${eventType} event at block ${log.blockNumber}`);
    } catch (error) {
      logger.error('Error processing log:', error);
    }
  }

  private getEventType(log: Log): string | null {
    const topic = log.topics[0];
    
    // Match topic hash to event name
    for (const [name, event] of Object.entries(GOVERNANCE_EVENTS)) {
      // Simple topic matching - in production, use proper ABI decoding
      if (event.name === name) {
        return name;
      }
    }
    
    return null;
  }

  private async handleEvent(eventType: string, log: Log) {
    // Import and call specific handlers
    const { handleProposalCreated } = await import('./handlers/proposalHandler');
    const { handleVoteCast } = await import('./handlers/voteHandler');
    const { handleDelegationChanged } = await import('./handlers/delegationHandler');

    switch (eventType) {
      case 'ProposalCreated':
        await handleProposalCreated(log);
        break;
      case 'VoteCast':
        await handleVoteCast(log);
        break;
      case 'ProposalExecuted':
        // Handle proposal execution
        break;
      case 'ProposalCanceled':
        // Handle proposal cancellation
        break;
      case 'DelegateChanged':
      case 'DelegateVotesChanged':
        await handleDelegationChanged(log);
        break;
    }
  }
}

// Export singleton instance
let indexerInstance: BlockchainIndexer | null = null;

export function getIndexer(contractAddress?: string): BlockchainIndexer {
  if (!indexerInstance && contractAddress) {
    indexerInstance = new BlockchainIndexer({ contractAddress });
  }
  if (!indexerInstance) {
    throw new Error('Indexer not initialized. Provide contract address.');
  }
  return indexerInstance;
}

// Auto-start if running as main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const contractAddress = process.env.GOVERNANCE_CONTRACT_ADDRESS;
  if (!contractAddress) {
    logger.error('GOVERNANCE_CONTRACT_ADDRESS environment variable is required');
    process.exit(1);
  }

  const indexer = new BlockchainIndexer({ contractAddress });
  indexer.start();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down...');
    await indexer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down...');
    await indexer.stop();
    process.exit(0);
  });
}

