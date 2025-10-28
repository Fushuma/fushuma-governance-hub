/**
 * PancakeSwap V4 Contract Addresses on Fushuma Network
 * 
 * These addresses will be populated after deployment
 * See deployment-guide.md for deployment instructions
 */

export const FUSHUMA_CONTRACTS = {
  // Core Contracts
  vault: '0x0000000000000000000000000000000000000000', // To be deployed
  clPoolManager: '0x0000000000000000000000000000000000000000', // To be deployed
  binPoolManager: '0x0000000000000000000000000000000000000000', // To be deployed (optional)
  
  // Periphery Contracts
  clPositionManager: '0x0000000000000000000000000000000000000000', // To be deployed
  infinityRouter: '0x0000000000000000000000000000000000000000', // To be deployed
  mixedQuoter: '0x0000000000000000000000000000000000000000', // To be deployed
  
  // Protocol Governance
  clProtocolFeeController: '0x0000000000000000000000000000000000000000', // To be deployed
  clPoolManagerOwner: '0x0000000000000000000000000000000000000000', // To be deployed
  
  // Standard Contracts
  permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3', // Canonical Permit2 (deploy if not exists)
  wfuma: '0x0000000000000000000000000000000000000000', // Wrapped FUMA (to be deployed)
  
  // Custom Hooks
  fumaDiscountHook: '0x0000000000000000000000000000000000000000', // To be deployed
  launchpadHook: '0x0000000000000000000000000000000000000000', // To be deployed
} as const;

export const FUSHUMA_TESTNET_CONTRACTS = {
  // Testnet contract addresses (if testnet is available)
  vault: '0x0000000000000000000000000000000000000000',
  clPoolManager: '0x0000000000000000000000000000000000000000',
  clPositionManager: '0x0000000000000000000000000000000000000000',
  infinityRouter: '0x0000000000000000000000000000000000000000',
  mixedQuoter: '0x0000000000000000000000000000000000000000',
  permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  wfuma: '0x0000000000000000000000000000000000000000',
} as const;

/**
 * Get contract addresses for the current network
 */
export function getContracts(chainId: number) {
  switch (chainId) {
    case 121224: // Fushuma Mainnet
      return FUSHUMA_CONTRACTS;
    case 121225: // Fushuma Testnet (adjust based on actual testnet chain ID)
      return FUSHUMA_TESTNET_CONTRACTS;
    default:
      throw new Error(`Unsupported chain ID: ${chainId}`);
  }
}

/**
 * Common token addresses on Fushuma Network
 */
export const COMMON_TOKENS = {
  FUMA: '0x0000000000000000000000000000000000000000', // Native FUMA token contract
  WFUMA: '0x0000000000000000000000000000000000000000', // Wrapped FUMA
  USDC: '0x0000000000000000000000000000000000000000', // USDC on Fushuma
  USDT: '0x0000000000000000000000000000000000000000', // USDT on Fushuma
  WETH: '0x0000000000000000000000000000000000000000', // Wrapped ETH on Fushuma
  WBTC: '0x0000000000000000000000000000000000000000', // Wrapped BTC on Fushuma
} as const;

/**
 * Fee tiers for concentrated liquidity pools
 */
export enum FeeAmount {
  LOWEST = 100, // 0.01%
  LOW = 500, // 0.05%
  MEDIUM = 3000, // 0.3%
  HIGH = 10000, // 1%
}

/**
 * Tick spacings for each fee tier
 */
export const TICK_SPACINGS: { [amount in FeeAmount]: number } = {
  [FeeAmount.LOWEST]: 1,
  [FeeAmount.LOW]: 10,
  [FeeAmount.MEDIUM]: 60,
  [FeeAmount.HIGH]: 200,
};

