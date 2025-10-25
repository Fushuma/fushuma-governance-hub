import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getRatesService } from "../services/rates";
import { ethereumAddressSchema } from "../validation";

export const ratesRouter = router({
  // Get current token price
  getCurrentPrice: publicProcedure
    .input(z.object({ tokenAddress: ethereumAddressSchema }))
    .query(async ({ input }) => {
      const ratesService = getRatesService();
      return await ratesService.getCurrentPrice(input.tokenAddress);
    }),

  // Get historical prices
  getHistoricalPrices: publicProcedure
    .input(z.object({
      tokenAddress: ethereumAddressSchema,
      from: z.date(),
      to: z.date(),
    }))
    .query(async ({ input }) => {
      const ratesService = getRatesService();
      return await ratesService.getHistoricalPrices(
        input.tokenAddress,
        input.from,
        input.to
      );
    }),

  // Get multiple token prices
  getMultiplePrices: publicProcedure
    .input(z.object({
      tokenAddresses: z.array(ethereumAddressSchema).max(50),
    }))
    .query(async ({ input }) => {
      const ratesService = getRatesService();
      const prices = await Promise.all(
        input.tokenAddresses.map(address => 
          ratesService.getCurrentPrice(address)
        )
      );
      
      return prices.filter(p => p !== null);
    }),
});

