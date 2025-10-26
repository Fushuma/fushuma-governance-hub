import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { IIcoInfoWithKey } from '@/types/launchpad';
import { IcoStatus, formatNumber } from '@/lib/launchpad/utils';
import { getEvmCostInfo, proxyAddress } from '@/lib/launchpad/ico-evm';
import { ethers } from 'ethers';
import LaunchpadABI from '@/abis/Launchpad.json';
import ERC20ABI from '@/abis/ERC20.json';
import { toast } from 'sonner';
import { useAccount } from 'wagmi';

interface BuyTokensCardProps {
  icoInfo: IIcoInfoWithKey;
  icoPot: string;
  status: IcoStatus;
  currentPrice: number;
  onSuccess: () => void;
}

export function BuyTokensCard({ icoInfo, icoPot, status, currentPrice, onSuccess }: BuyTokensCardProps) {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [isPriceLoading, setIsPriceLoading] = useState(false);
  const [purchaseAmount, setPurchaseAmount] = useState<number>(0);
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [isSetPurchasePrice, setIsSetPurchasePrice] = useState(true);
  const [icoTokenSymbol, setIcoTokenSymbol] = useState<string>('');
  const [paymentTokenSymbol, setPaymentTokenSymbol] = useState<string>('FUMA');
  const [paymentDecimals, setPaymentDecimals] = useState<number>(18);
  const [icoDecimals, setIcoDecimals] = useState<number>(18);

  const [price, setPrice] = useState({
    value: 0,
    availableAmount: 0,
  });

  useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          
          // Fetch ICO token info
          const icoToken = new ethers.Contract(icoInfo.data.icoMint, ERC20ABI, provider);
          const icoSymbol = await icoToken.symbol();
          const icoDecimalsValue = await icoToken.decimals();
          setIcoTokenSymbol(icoSymbol);
          setIcoDecimals(Number(icoDecimalsValue));

          // Fetch payment token info
          if (icoInfo.data.costMint !== '0x0000000000000000000000000000000000000000') {
            const paymentToken = new ethers.Contract(icoInfo.data.costMint, ERC20ABI, provider);
            const paymentSymbol = await paymentToken.symbol();
            const paymentDecimalsValue = await paymentToken.decimals();
            setPaymentTokenSymbol(paymentSymbol);
            setPaymentDecimals(Number(paymentDecimalsValue));
          }
        }
      } catch (error) {
        console.error('Error fetching token info:', error);
      }
    };

    fetchTokenInfo();
  }, [icoInfo.data.icoMint, icoInfo.data.costMint]);

  const minTokenAmount = useMemo(() => {
    return 1 / icoInfo.data.icoDecimals;
  }, [icoInfo.data.icoDecimals]);

  const bonusProgressValue = useMemo(() => {
    if (isSetPurchasePrice) {
      if (!price.availableAmount || !purchaseAmount) return 0;
      if (price.availableAmount < purchaseAmount) return 0;
      if (icoInfo.data.bonusReserve === 0) return 0;

      const bonusAmount = Math.min(
        price.availableAmount * (icoInfo.data.bonusPercentage / 100 / 100),
        icoInfo.data.bonusReserve / icoInfo.data.icoDecimals
      );
      const maxAmount = icoInfo.data.bonusReserve / icoInfo.data.icoDecimals;

      return Math.min((bonusAmount / maxAmount) * 100, 100);
    } else {
      if (!purchaseAmount) return 0;
      if (icoInfo.data.bonusReserve === 0) return 0;

      const bonusAmount = Math.min(
        purchaseAmount * (icoInfo.data.bonusPercentage / 100 / 100),
        icoInfo.data.bonusReserve / icoInfo.data.icoDecimals
      );
      const maxAmount = icoInfo.data.bonusReserve / icoInfo.data.icoDecimals;

      return Math.min((bonusAmount / maxAmount) * 100, 100);
    }
  }, [isSetPurchasePrice, price, purchaseAmount, icoInfo.data]);

  const getPrice = async (tokensAmount?: number) => {
    if (tokensAmount && tokensAmount > 0) {
      setIsPriceLoading(true);
      try {
        const id = icoPot.split('-')[1];
        const decimals = BigInt(icoInfo.data.icoDecimals);
        const amount = BigInt(Math.floor(tokensAmount)) * decimals;
        const p = await getEvmCostInfo(Number(id), amount);

        if (!p) throw new Error('Failed to fetch EVM cost info');

        setPrice({
          availableAmount: Number(p.availableAmount) / icoInfo.data.icoDecimals,
          value: Number(p.value) / icoInfo.data.icoDecimals,
        });
      } catch (error) {
        console.error('Error getting price:', error);
      } finally {
        setIsPriceLoading(false);
      }
    }
  };

  useEffect(() => {
    if (purchaseAmount > 0) {
      getPrice(purchaseAmount);
    }
  }, [purchaseAmount]);

  const buy = async () => {
    if (!price.availableAmount || !isConnected) return;

    setIsLoading(true);

    try {
      const id = icoPot.split('-')[1];
      
      if (!window.ethereum) {
        throw new Error('MetaMask not found');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const proxyAsLaunchpad = new ethers.Contract(proxyAddress, LaunchpadABI, signer);

      // Check if payment is in native token (FUMA) or ERC20
      if (icoInfo.data.costMint === '0x0000000000000000000000000000000000000000') {
        // Native token payment
        const amountToBuy = Math.floor(price.availableAmount * icoInfo.data.icoDecimals);
        const { availableAmount, value: amountToPay } = await proxyAsLaunchpad.getValue(
          id,
          amountToBuy.toString()
        );

        toast.info('Preparing transaction...');

        const tx = await proxyAsLaunchpad.buyToken(id, amountToBuy.toString(), await signer.getAddress(), {
          value: amountToPay.toString(),
        });

        toast.info('Transaction submitted. Waiting for confirmation...');
        await tx.wait();
        toast.success('Tokens purchased successfully!');
      } else {
        // ERC20 payment
        const paymentToken = new ethers.Contract(icoInfo.data.costMint, ERC20ABI, signer);
        const amountToBuy = Math.floor(price.availableAmount * icoInfo.data.icoDecimals);
        const { availableAmount, value: amountToPay } = await proxyAsLaunchpad.getValue(id, amountToBuy);

        const allowance = await paymentToken.allowance(await signer.getAddress(), proxyAddress);

        if (allowance < amountToPay) {
          toast.info('Approving token spending...');
          const approveTx = await paymentToken.approve(proxyAddress, amountToPay);
          await approveTx.wait();
        }

        toast.info('Preparing transaction...');
        const tx = await proxyAsLaunchpad.buyToken(id, amountToBuy, await signer.getAddress());

        toast.info('Transaction submitted. Waiting for confirmation...');
        await tx.wait();
        toast.success('Tokens purchased successfully!');
      }

      onSuccess();
      setPurchaseAmount(0);
      setPurchasePrice(0);
      setPrice({ value: 0, availableAmount: 0 });
    } catch (error: any) {
      console.error('Error buying tokens:', error);
      toast.error(error.message || 'Failed to purchase tokens');
    } finally {
      setIsLoading(false);
    }
  };

  const canBuy = status === IcoStatus.Live && isConnected && price.availableAmount > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Purchase Tokens</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount of {icoTokenSymbol} to purchase</Label>
          <Input
            id="amount"
            type="number"
            min={minTokenAmount}
            step={minTokenAmount}
            value={purchaseAmount || ''}
            onChange={(e) => setPurchaseAmount(Number(e.target.value))}
            placeholder={`Min: ${minTokenAmount}`}
            disabled={status !== IcoStatus.Live || !isConnected}
          />
        </div>

        {isPriceLoading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : price.availableAmount > 0 ? (
          <div className="space-y-3">
            <div className="flex justify-between p-3 bg-muted rounded-lg">
              <span className="text-muted-foreground">You will receive:</span>
              <span className="font-semibold">
                {formatNumber(price.availableAmount, 4)} {icoTokenSymbol}
              </span>
            </div>
            <div className="flex justify-between p-3 bg-muted rounded-lg">
              <span className="text-muted-foreground">Cost:</span>
              <span className="font-semibold">
                {formatNumber(price.value, 6)} {paymentTokenSymbol}
              </span>
            </div>

            {icoInfo.data.bonusReserve > 0 && bonusProgressValue > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Bonus tokens</span>
                  <span className="font-medium">{bonusProgressValue.toFixed(2)}%</span>
                </div>
                <Progress value={bonusProgressValue} className="h-2" />
              </div>
            )}
          </div>
        ) : null}

        {!isConnected ? (
          <p className="text-sm text-muted-foreground text-center">Please connect your wallet to purchase tokens</p>
        ) : status !== IcoStatus.Live ? (
          <p className="text-sm text-muted-foreground text-center">This ICO is not currently active</p>
        ) : null}

        <Button onClick={buy} disabled={!canBuy || isLoading} className="w-full" size="lg">
          {isLoading ? 'Processing...' : 'Buy Tokens'}
        </Button>
      </CardContent>
    </Card>
  );
}

