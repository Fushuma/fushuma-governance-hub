import type { IIcoInfoWithKey, IPurchaseAmount, IUserPurchase, IUserPurchaseWithKey } from '@/types/launchpad';
import LaunchpadABI from '@/abis/Launchpad.json';
import VestingImplementationABI from '@/abis/VestingImplementation.json';

declare global {
  interface Window {
    ethereum?: any;
  }
}

import Web3 from 'web3';
import { ethers } from 'ethers';

// Proxy address (where calls are delegated through)
export const proxyAddress = '0x206236eca2dF8FB37EF1d024e1F72f4313f413E4';
export const vestingImplementationAddress = '0x0d8e696475b233193d21E565C21080EbF6A3C5DA';

// Provider (Infura, Alchemy, or Metamask provider)
// Use with ethers.js v6
const metamask = getMetaMaskEthereum();
const provider = metamask == null? new ethers.JsonRpcProvider("https://rpc.fushuma.com") : new ethers.BrowserProvider(getMetaMaskEthereum());

// Connect the proxy address using the implementation ABI
export const proxyAsLaunchpad = provider == null? null : new ethers.Contract(proxyAddress, LaunchpadABI, provider);
export const vestingImplementation = provider == null? null : new ethers.Contract(vestingImplementationAddress, VestingImplementationABI, provider);

export function getMetaMaskEthereum(): any | null {
  const providers = window?.ethereum?.providers;

  // If multiple providers exist (MetaMask, Phantom, Brave, etc.)
  if (providers?.length) {
    const metamaskProvider = providers.find((p: { isMetaMask: any; }) => p.isMetaMask);
    if (!metamaskProvider) throw new Error('MetaMask provider not found');
    return metamaskProvider;
  }

  // Fallback: window.ethereum is MetaMask
  if (window.ethereum?.isMetaMask) {
    return window.ethereum;
  }

  console.error('MetaMask not found');
  return null;
}

function mapEvmIcoToIIcoInfo(index: number, params: any, state: any): IIcoInfoWithKey {
    return {
        key: params.token.toString(),
        data: {
            seed: index,
            owner: state.ICOOwner,
            icoMint: params.token,
            icoDecimals: 10 ** Number(state.icoTokenDecimals),
            amount: Number(params.amount),
            costMint: params.paymentToken,
            startPrice: BigInt(params.startPrice),
            endPrice: BigInt(params.endPrice),
            startDate: Number(params.startDate) * 1000,
            endDate: Number(params.endDate) * 1000,
            bonusReserve: Number(params.bonusReserve),
            bonusPercentage: Number(params.bonusPercentage),
            bonusActivator: Number(params.bonusActivator),
            isClosed: state.isClosed ? 1 : 0,
            totalSold: Number(state.totalSold),
            totalReceived: Number(state.totalReceived),
            unlockPercentage: Number(params.vestingParams.unlockPercentage),
            cliffPeriod: Number(params.vestingParams.cliffPeriod),
            vestingPercentage: Number(params.vestingParams.vestingPercentage),
            vestingInterval: Number(params.vestingParams.vestingInterval),
            purchaseSeqNum: 0, // Add logic if you need to track purchases per user
            vestingContracts: state.vestingContract || null
        }
    };
}

export async function fetchAllICOs(): Promise<IIcoInfoWithKey[]> {
  const proxy = new ethers.Contract(proxyAddress, LaunchpadABI, new ethers.JsonRpcProvider("https://rpc.fushuma.com"));
    try {
      if(proxy == null) return [];
      const total = await proxy.counter();
      const results: IIcoInfoWithKey[] = [];
  
      for (let i = 26; i < Number(total); i++) {
        const ico = await proxy.getICO(i);
        const { 0: params, 1: state } = ico;
        results.push(mapEvmIcoToIIcoInfo(i, params, state));
      }
  
      return results;
    } catch (err) {
      console.error('Failed to fetch ICOs:', err);
      return [];
    }
}

export async function fetchICO(index: string): Promise<IIcoInfoWithKey | null> {
  const proxy = new ethers.Contract(proxyAddress, LaunchpadABI, new ethers.JsonRpcProvider("https://rpc.fushuma.com"));
  try {
    if(proxy == null) return null;
    const ico = await proxy.getICO(index);
    const { 0: params, 1: state } = ico;
    return mapEvmIcoToIIcoInfo(Number(index), params, state);
  } catch (err) {
    console.error('Failed to fetch ICO:', err);
    return null;
  }
}

async function findClosestBlockByTimestamp(targetTimestamp: number): Promise<number> {
  let latestBlockNumber = await provider.getBlockNumber();
  let earliest = 0;
  let latest = latestBlockNumber;

  while (earliest <= latest) {
    const middle = Math.floor((earliest + latest) / 2);
    const block = await provider.getBlock(middle);

    if (!block) break;

    const blockTimestamp = block.timestamp;

    if (blockTimestamp < targetTimestamp) {
      earliest = middle + 1;
    } else if (blockTimestamp > targetTimestamp) {
      latest = middle - 1;
    } else {
      return middle; // Exact match
    }
  }

  // Return the closest block before the timestamp
  return latest;
}

async function queryLogsInChunks(
  fromBlock: number,
  toBlock: number,
  chunkSize = 1000
) {
  if (proxyAsLaunchpad == null) return [];
  let logs: any[] = [];
  const buyEventFilter = proxyAsLaunchpad.filters.BuyToken();

  for (let start = fromBlock; start <= toBlock; start += chunkSize + 1) {
    const end = Math.min(start + chunkSize, toBlock);

    const chunkLogs = await proxyAsLaunchpad.queryFilter(buyEventFilter, start, end);
    logs = logs.concat(chunkLogs);
  }
  return logs;
}

export async function getBuyHistory(buyerAddress: string, icoId: number, vestUnlockPercentage: number) {
  if (proxyAsLaunchpad == null) return;
  const ico = await proxyAsLaunchpad.getICO(icoId);
  const { 0: params, 1: state } = ico;
  const startTimestamp = parseInt(params.startDate);
  const startBlock = await findClosestBlockByTimestamp(startTimestamp);
  const latestBlock = await provider.getBlockNumber();

  const logs = await queryLogsInChunks(startBlock, latestBlock);

  const filtered = logs.filter(
    (log) =>
      log.args.buyer.toLowerCase() == buyerAddress.toLowerCase() &&
      Number(log.args.ICO_id) == icoId
  );
  filtered.sort((a, b) => (a.blockNumber > b.blockNumber ? -1 : 1));

  return await Promise.all(filtered.map(async (e: any) => {
    const block = await provider.getBlock(e.blockNumber);
    if(!block) return
    return {
      seed: e.transactionHash,
      buyer: e.args.buyer,
      ico: Number(e.args.ICO_id),
      buyAmount: e.args.amountBought.toString(),
      buyDate: block.timestamp * 1000,
      bonus: e.args.bonus.toString(),
      lockedAmount: (Number(e.args.amountBought) * vestUnlockPercentage / 100).toString(),
      totalClaimed: 0,
    };
  }));
}


export async function getEvmCostInfo(id: number, amount: BigInt) : Promise<IPurchaseAmount | null>  {
  try {
    if(!id && id <0 ) return null;
    if(proxyAsLaunchpad == null) return null;
    const ico = await proxyAsLaunchpad.getValue(id, amount);
    const { 0: availableAmount, 1: value } = ico;
    
    return {
      value,
      availableAmount
    };
  } catch (error) {
    console.error('Failed to get EVM Cost Info', error);
    return null;
  }
}

export async function getPurchaseAmount(index: number) {
  if(proxyAsLaunchpad == null) return null;
  const ico = await proxyAsLaunchpad.getICO(index);
  const { 0: params, 1: state } = ico;
}

export async function getVestingInfoAsPurchases(
  vestingContractAddress: string,
  userAddress: string,
  ico: string,
  unlockPercentage: number
): Promise<IUserPurchaseWithKey[]> {
  const vestingImplementation = new ethers.Contract(
    vestingContractAddress,
    VestingImplementationABI,
    provider
  );

  const [allocations, claimedRaw] = await Promise.all([
    vestingImplementation.getBeneficiary(userAddress),
    vestingImplementation.claimedAmount(userAddress)
  ]);

  const totalClaimed = Number(claimedRaw.toString());

  // Assume total claimed is split equally among allocations (for demo)
  const claimedPerAlloc = allocations.length > 0 ? totalClaimed / allocations.length : 0;

  return allocations.map((alloc: any, index: number) => {
    const unlockedPortion = Number(alloc.amount.toString()); // total allocated for this
    const buyDate = Number(alloc.cliffFinish.toString()) * 1000;

    const purchase: IUserPurchase = {
      seed: index, // can use `tx hash` or index if not available
      buyer: userAddress,
      ico: ico, // replace if you know it externally
      buyAmount: unlockPercentage == 0? 0: Number((unlockedPortion * 100 / unlockPercentage).toFixed(2)),
      buyDate: buyDate,
      bonus: 0, // no bonus info from vesting contract
      lockedAmount: unlockedPortion,
      totalClaimed: claimedPerAlloc,
    };

    return {
      key: `${userAddress}-${index}`.toString(), // unique key
      data: purchase,
    };
  });
}
