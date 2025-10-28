import { Token, CurrencyAmount, TradeType, Percent } from '@pancakeswap/sdk';
import { Pool, Route, Trade, SwapQuoter } from '@pancakeswap/v3-sdk';
import { encodeSqrtRatioX96, TickMath } from '@pancakeswap/v3-sdk';
import { parseUnits, formatUnits } from 'viem';

/**
 * Calculate the best route for a swap
 */
export async function getBestRoute(
  tokenIn: Token,
  tokenOut: Token,
  amountIn: string,
  pools: Pool[]
): Promise<Route<Token, Token> | null> {
  if (pools.length === 0) return null;

  // Find direct pool
  const directPool = pools.find(
    (pool) =>
      (pool.token0.equals(tokenIn) && pool.token1.equals(tokenOut)) ||
      (pool.token0.equals(tokenOut) && pool.token1.equals(tokenIn))
  );

  if (directPool) {
    return new Route([directPool], tokenIn, tokenOut);
  }

  // TODO: Implement multi-hop routing
  // For now, return null if no direct route exists
  return null;
}

/**
 * Get a quote for a swap
 */
export async function getSwapQuote(
  route: Route<Token, Token>,
  amountIn: string,
  tokenIn: Token
): Promise<{
  amountOut: string;
  priceImpact: string;
  executionPrice: string;
} | null> {
  try {
    const amount = CurrencyAmount.fromRawAmount(
      tokenIn,
      parseUnits(amountIn, tokenIn.decimals).toString()
    );

    const trade = await Trade.fromRoute(
      route,
      amount,
      TradeType.EXACT_INPUT
    );

    const amountOut = formatUnits(
      BigInt(trade.outputAmount.quotient.toString()),
      trade.outputAmount.currency.decimals
    );

    const priceImpact = trade.priceImpact.toSignificant(2);
    const executionPrice = trade.executionPrice.toSignificant(6);

    return {
      amountOut,
      priceImpact,
      executionPrice,
    };
  } catch (error) {
    console.error('Error getting swap quote:', error);
    return null;
  }
}

/**
 * Calculate minimum amount out with slippage tolerance
 */
export function calculateMinimumAmountOut(
  amountOut: string,
  slippageTolerance: number, // in basis points (e.g., 50 = 0.5%)
  decimals: number
): bigint {
  const amount = parseUnits(amountOut, decimals);
  const slippage = BigInt(slippageTolerance);
  const basisPoints = BigInt(10000);
  
  return (amount * (basisPoints - slippage)) / basisPoints;
}

/**
 * Calculate price impact percentage
 */
export function calculatePriceImpact(
  amountIn: string,
  amountOut: string,
  spotPrice: string
): string {
  const expectedOut = parseFloat(amountIn) * parseFloat(spotPrice);
  const actualOut = parseFloat(amountOut);
  const impact = ((expectedOut - actualOut) / expectedOut) * 100;
  
  return impact.toFixed(2);
}

/**
 * Format price for display
 */
export function formatPrice(price: string, significantDigits: number = 6): string {
  const num = parseFloat(price);
  
  if (num === 0) return '0';
  if (num < 0.000001) return '< 0.000001';
  if (num > 1000000) return num.toExponential(2);
  
  return num.toFixed(significantDigits);
}

/**
 * Calculate sqrt price X96 from human-readable price
 */
export function priceToSqrtPriceX96(price: number): bigint {
  return encodeSqrtRatioX96(
    BigInt(Math.floor(price * 1e18)),
    BigInt(1e18)
  );
}

/**
 * Calculate human-readable price from sqrt price X96
 */
export function sqrtPriceX96ToPrice(sqrtPriceX96: bigint, decimals0: number, decimals1: number): string {
  const Q96 = BigInt(2) ** BigInt(96);
  const price = (sqrtPriceX96 * sqrtPriceX96 * BigInt(10 ** decimals0)) / (Q96 * Q96 * BigInt(10 ** decimals1));
  
  return formatUnits(price, decimals0);
}

/**
 * Validate swap parameters
 */
export function validateSwapParams(
  tokenIn: Token | null,
  tokenOut: Token | null,
  amountIn: string
): { valid: boolean; error?: string } {
  if (!tokenIn || !tokenOut) {
    return { valid: false, error: 'Please select both tokens' };
  }

  if (tokenIn.equals(tokenOut)) {
    return { valid: false, error: 'Cannot swap the same token' };
  }

  if (!amountIn || parseFloat(amountIn) <= 0) {
    return { valid: false, error: 'Please enter a valid amount' };
  }

  return { valid: true };
}

/**
 * Get swap route description
 */
export function getRouteDescription(route: Route<Token, Token>): string {
  const path = route.path.map((token) => token.symbol).join(' → ');
  return path;
}

/**
 * Estimate gas for swap
 */
export function estimateSwapGas(isMultiHop: boolean): bigint {
  // Base gas estimate
  const baseGas = BigInt(150000);
  const hopGas = BigInt(50000);
  
  return isMultiHop ? baseGas + hopGas : baseGas;
}

