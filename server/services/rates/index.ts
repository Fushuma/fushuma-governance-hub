import { createPublicClient, http, formatUnits } from 'viem';
import { db } from '../../db';
import { tokenPrices } from '../../../drizzle/schema';
import { logger } from '../../_core/logger';
import { desc, eq, and, gte } from 'drizzle-orm';

// Fushuma Network configuration
const FUSHUMA_CHAIN_ID = 121224;
const FUSHUMA_RPC_URL = process.env.FUSHUMA_RPC_URL || 'https://rpc.fushuma.network';

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

// Uniswap V3 Pool ABI (minimal)
const POOL_ABI = [
  {
    inputs: [],
    name: 'slot0',
    outputs: [
      { name: 'sqrtPriceX96', type: 'uint160' },
      { name: 'tick', type: 'int24' },
      { name: 'observationIndex', type: 'uint16' },
      { name: 'observationCardinality', type: 'uint16' },
      { name: 'observationCardinalityNext', type: 'uint16' },
      { name: 'feeProtocol', type: 'uint8' },
      { name: 'unlocked', type: 'bool' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'liquidity',
    outputs: [{ name: '', type: 'uint128' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

// ERC20 ABI (minimal)
const ERC20_ABI = [
  {
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface TokenConfig {
  address: string;
  symbol: string;
  poolAddress?: string;
  decimals?: number;
}

interface PriceData {
  tokenAddress: string;
  tokenSymbol: string;
  priceUsd: string;
  volume24h?: string;
  marketCap?: string;
  priceChange24h?: string;
  source: string;
}

export class RatesService {
  private tokens: Map<string, TokenConfig> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    // Initialize with known tokens
    this.registerToken({
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'FUMA',
    });
  }

  registerToken(config: TokenConfig) {
    this.tokens.set(config.address.toLowerCase(), config);
    logger.info(`Registered token: ${config.symbol} (${config.address})`);
  }

  async start(intervalMs: number = 300000) { // 5 minutes default
    if (this.isRunning) {
      logger.warn('Rates service is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting rates service');

    // Initial update
    await this.updateAllPrices();

    // Set up periodic updates
    this.updateInterval = setInterval(async () => {
      try {
        await this.updateAllPrices();
      } catch (error) {
        logger.error('Error updating prices:', error);
      }
    }, intervalMs);
  }

  async stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.isRunning = false;
    logger.info('Rates service stopped');
  }

  private async updateAllPrices() {
    logger.info('Updating token prices...');

    for (const [address, config] of this.tokens) {
      try {
        const priceData = await this.fetchTokenPrice(address, config);
        if (priceData) {
          await this.storePriceData(priceData);
        }
      } catch (error) {
        logger.error(`Error fetching price for ${config.symbol}:`, error);
      }
    }

    logger.info('Price update complete');
  }

  private async fetchTokenPrice(
    address: string,
    config: TokenConfig
  ): Promise<PriceData | null> {
    try {
      // Try multiple sources
      let priceUsd: string | null = null;
      let source = 'unknown';

      // 1. Try DEX pool if available
      if (config.poolAddress) {
        priceUsd = await this.getPriceFromPool(config.poolAddress);
        source = 'uniswap-v3';
      }

      // 2. Try CoinGecko API (free tier)
      if (!priceUsd) {
        priceUsd = await this.getPriceFromCoinGecko(config.symbol);
        source = 'coingecko';
      }

      // 3. Try CoinMarketCap API
      if (!priceUsd) {
        priceUsd = await this.getPriceFromCoinMarketCap(config.symbol);
        source = 'coinmarketcap';
      }

      // 4. Fallback to mock data for development
      if (!priceUsd) {
        priceUsd = '0.00';
        source = 'mock';
      }

      return {
        tokenAddress: address,
        tokenSymbol: config.symbol,
        priceUsd,
        source,
      };
    } catch (error) {
      logger.error(`Error fetching price for ${config.symbol}:`, error);
      return null;
    }
  }

  private async getPriceFromPool(poolAddress: string): Promise<string | null> {
    try {
      // Read slot0 from Uniswap V3 pool
      const slot0 = await publicClient.readContract({
        address: poolAddress as `0x${string}`,
        abi: POOL_ABI,
        functionName: 'slot0',
      });

      const sqrtPriceX96 = slot0[0];

      // Calculate price from sqrtPriceX96
      // price = (sqrtPriceX96 / 2^96)^2
      const price = Number(sqrtPriceX96) / (2 ** 96);
      const priceSquared = price * price;

      return priceSquared.toFixed(6);
    } catch (error) {
      logger.debug('Error fetching price from pool:', error);
      return null;
    }
  }

  private async getPriceFromCoinGecko(symbol: string): Promise<string | null> {
    try {
      // CoinGecko free API
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const price = data[symbol.toLowerCase()]?.usd;

      return price ? price.toString() : null;
    } catch (error) {
      logger.debug('Error fetching price from CoinGecko:', error);
      return null;
    }
  }

  private async getPriceFromCoinMarketCap(symbol: string): Promise<string | null> {
    try {
      const apiKey = process.env.COINMARKETCAP_API_KEY;
      if (!apiKey) {
        return null;
      }

      const response = await fetch(
        `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbol}`,
        {
          headers: {
            'X-CMC_PRO_API_KEY': apiKey,
          },
        }
      );

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      const price = data.data?.[symbol]?.quote?.USD?.price;

      return price ? price.toString() : null;
    } catch (error) {
      logger.debug('Error fetching price from CoinMarketCap:', error);
      return null;
    }
  }

  private async storePriceData(priceData: PriceData) {
    await db.insert(tokenPrices).values({
      tokenAddress: priceData.tokenAddress,
      tokenSymbol: priceData.tokenSymbol,
      priceUsd: priceData.priceUsd,
      volume24h: priceData.volume24h,
      marketCap: priceData.marketCap,
      priceChange24h: priceData.priceChange24h,
      source: priceData.source,
    });
  }

  // Public API methods
  async getCurrentPrice(tokenAddress: string): Promise<PriceData | null> {
    const latest = await db.query.tokenPrices.findFirst({
      where: eq(tokenPrices.tokenAddress, tokenAddress.toLowerCase()),
      orderBy: [desc(tokenPrices.createdAt)],
    });

    if (!latest) {
      return null;
    }

    return {
      tokenAddress: latest.tokenAddress,
      tokenSymbol: latest.tokenSymbol,
      priceUsd: latest.priceUsd,
      volume24h: latest.volume24h || undefined,
      marketCap: latest.marketCap || undefined,
      priceChange24h: latest.priceChange24h || undefined,
      source: latest.source,
    };
  }

  async getHistoricalPrices(
    tokenAddress: string,
    fromDate: Date,
    toDate: Date
  ): Promise<PriceData[]> {
    const prices = await db.query.tokenPrices.findMany({
      where: and(
        eq(tokenPrices.tokenAddress, tokenAddress.toLowerCase()),
        gte(tokenPrices.createdAt, fromDate)
      ),
      orderBy: [desc(tokenPrices.createdAt)],
      limit: 1000,
    });

    return prices.map(p => ({
      tokenAddress: p.tokenAddress,
      tokenSymbol: p.tokenSymbol,
      priceUsd: p.priceUsd,
      volume24h: p.volume24h || undefined,
      marketCap: p.marketCap || undefined,
      priceChange24h: p.priceChange24h || undefined,
      source: p.source,
    }));
  }
}

// Export singleton instance
let ratesServiceInstance: RatesService | null = null;

export function getRatesService(): RatesService {
  if (!ratesServiceInstance) {
    ratesServiceInstance = new RatesService();
  }
  return ratesServiceInstance;
}

// Auto-start if running as main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const service = new RatesService();
  service.start();

  // Graceful shutdown
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down...');
    await service.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down...');
    await service.stop();
    process.exit(0);
  });
}

