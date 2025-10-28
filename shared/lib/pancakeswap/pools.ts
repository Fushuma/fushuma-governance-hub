import { Token } from '@pancakeswap/sdk';
import { Pool, Position, nearestUsableTick, TickMath, priceToClosestTick } from '@pancakeswap/v3-sdk';
import { FeeAmount, TICK_SPACINGS } from './contracts';
import { encodePacked, keccak256 } from 'viem';

/**
 * Compute pool address (deterministic)
 */
export function computePoolAddress(
  factoryAddress: string,
  tokenA: Token,
  tokenB: Token,
  fee: FeeAmount,
  hookAddress?: string
): string {
  const [token0, token1] = tokenA.sortsBefore(tokenB) ? [tokenA, tokenB] : [tokenB, tokenA];
  
  // This is a simplified version - actual implementation depends on CREATE3 factory
  const salt = keccak256(
    encodePacked(
      ['address', 'address', 'uint24', 'address'],
      [token0.address as `0x${string}`, token1.address as `0x${string}`, fee, (hookAddress || '0x0000000000000000000000000000000000000000') as `0x${string}`]
    )
  );
  
  return salt; // Placeholder - actual address computation depends on factory
}

/**
 * Create a pool instance from on-chain data
 */
export function createPool(
  tokenA: Token,
  tokenB: Token,
  fee: FeeAmount,
  sqrtPriceX96: bigint,
  liquidity: bigint,
  tick: number
): Pool {
  return new Pool(
    tokenA,
    tokenB,
    fee,
    sqrtPriceX96.toString(),
    liquidity.toString(),
    tick
  );
}

/**
 * Calculate position from amounts
 */
export function createPosition(
  pool: Pool,
  tickLower: number,
  tickUpper: number,
  amount0: bigint,
  amount1: bigint
): Position {
  // Ensure ticks are valid
  const tickSpacing = TICK_SPACINGS[pool.fee as FeeAmount];
  const validTickLower = nearestUsableTick(tickLower, tickSpacing);
  const validTickUpper = nearestUsableTick(tickUpper, tickSpacing);

  return Position.fromAmounts({
    pool,
    tickLower: validTickLower,
    tickUpper: validTickUpper,
    amount0: amount0.toString(),
    amount1: amount1.toString(),
    useFullPrecision: true,
  });
}

/**
 * Get nearest usable tick for a price
 */
export function getNearestUsableTick(price: number, fee: FeeAmount): number {
  const tick = priceToClosestTick(price);
  const tickSpacing = TICK_SPACINGS[fee];
  return nearestUsableTick(tick, tickSpacing);
}

/**
 * Calculate price range from tick range
 */
export function ticksToPriceRange(
  tickLower: number,
  tickUpper: number,
  token0: Token,
  token1: Token
): { priceLower: string; priceUpper: string } {
  const sqrtPriceLower = TickMath.getSqrtRatioAtTick(tickLower);
  const sqrtPriceUpper = TickMath.getSqrtRatioAtTick(tickUpper);

  // Convert to human-readable prices
  const priceLower = (Number(sqrtPriceLower) / (2 ** 96)) ** 2;
  const priceUpper = (Number(sqrtPriceUpper) / (2 ** 96)) ** 2;

  return {
    priceLower: priceLower.toFixed(6),
    priceUpper: priceUpper.toFixed(6),
  };
}

/**
 * Calculate liquidity from amounts
 */
export function getLiquidityForAmounts(
  sqrtPriceX96: bigint,
  sqrtPriceAX96: bigint,
  sqrtPriceBX96: bigint,
  amount0: bigint,
  amount1: bigint
): bigint {
  // Simplified liquidity calculation
  // Actual implementation should use Position.fromAmounts
  
  if (sqrtPriceX96 <= sqrtPriceAX96) {
    return getLiquidityForAmount0(sqrtPriceAX96, sqrtPriceBX96, amount0);
  } else if (sqrtPriceX96 < sqrtPriceBX96) {
    const liquidity0 = getLiquidityForAmount0(sqrtPriceX96, sqrtPriceBX96, amount0);
    const liquidity1 = getLiquidityForAmount1(sqrtPriceAX96, sqrtPriceX96, amount1);
    return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
  } else {
    return getLiquidityForAmount1(sqrtPriceAX96, sqrtPriceBX96, amount1);
  }
}

function getLiquidityForAmount0(
  sqrtPriceAX96: bigint,
  sqrtPriceBX96: bigint,
  amount0: bigint
): bigint {
  if (sqrtPriceAX96 > sqrtPriceBX96) {
    [sqrtPriceAX96, sqrtPriceBX96] = [sqrtPriceBX96, sqrtPriceAX96];
  }
  const intermediate = (sqrtPriceAX96 * sqrtPriceBX96) / (BigInt(2) ** BigInt(96));
  return (amount0 * intermediate) / (sqrtPriceBX96 - sqrtPriceAX96);
}

function getLiquidityForAmount1(
  sqrtPriceAX96: bigint,
  sqrtPriceBX96: bigint,
  amount1: bigint
): bigint {
  if (sqrtPriceAX96 > sqrtPriceBX96) {
    [sqrtPriceAX96, sqrtPriceBX96] = [sqrtPriceBX96, sqrtPriceAX96];
  }
  return (amount1 * (BigInt(2) ** BigInt(96))) / (sqrtPriceBX96 - sqrtPriceAX96);
}

/**
 * Format pool fee for display
 */
export function formatFee(fee: FeeAmount): string {
  return `${fee / 10000}%`;
}

/**
 * Get fee tier name
 */
export function getFeeTierName(fee: FeeAmount): string {
  switch (fee) {
    case FeeAmount.LOWEST:
      return 'Best for stable pairs';
    case FeeAmount.LOW:
      return 'Best for stable pairs';
    case FeeAmount.MEDIUM:
      return 'Best for most pairs';
    case FeeAmount.HIGH:
      return 'Best for exotic pairs';
    default:
      return 'Custom fee tier';
  }
}

/**
 * Check if pool exists
 */
export function isPoolInitialized(sqrtPriceX96: bigint): boolean {
  return sqrtPriceX96 > BigInt(0);
}

/**
 * Calculate pool TVL (Total Value Locked)
 */
export function calculatePoolTVL(
  reserve0: bigint,
  reserve1: bigint,
  price0USD: number,
  price1USD: number,
  decimals0: number,
  decimals1: number
): number {
  const value0 = Number(reserve0) / (10 ** decimals0) * price0USD;
  const value1 = Number(reserve1) / (10 ** decimals1) * price1USD;
  
  return value0 + value1;
}

/**
 * Calculate APR from fees
 */
export function calculateAPR(
  fees24h: number,
  tvl: number
): number {
  if (tvl === 0) return 0;
  return (fees24h * 365 / tvl) * 100;
}

