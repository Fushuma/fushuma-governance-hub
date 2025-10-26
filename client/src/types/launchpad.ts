export interface IUserPurchaseWithKey {
    key: string;
    data: IUserPurchase;
}

export interface IPurchaseAmount {
    value: number;
    availableAmount: number;
}

export interface IUserPurchase {
    seed: number;
    buyer: string;
    ico: string;
    buyAmount: number;
    buyDate: number;
    bonus: number;
    lockedAmount: number;
    totalClaimed: number;
}

export interface IIcoInfoWithKey {
    key: string;
    data: IIcoInfo;
}

export interface IIcoInfo {
    seed: number;
    owner: string;
    icoMint: string;
    icoDecimals: number;
    amount: number;
    costMint: string;
    startPrice: bigint;
    endPrice: bigint;
    startDate: number;
    endDate: number;
    bonusReserve: number;
    bonusPercentage: number;
    bonusActivator: number;
    isClosed: number;
    totalSold: number;
    totalReceived: number;
    unlockPercentage: number;
    cliffPeriod: number;
    vestingPercentage: number;
    vestingInterval: number;
    purchaseSeqNum: number;
    vestingContracts?: string;
}

export interface ILaunchpadMetadata {
    key: string;
    name: string;
    projectLogo?: string;
    links?: {
        web?: { name: string; url: string };
        x?: { name: string; url: string };
        telegram?: { name: string; url: string };
    };
    evmAddressMemo?: boolean;
    description: string;
}

