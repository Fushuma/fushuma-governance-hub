import { useEffect, useState } from 'react';
import { useRoute, Link } from 'wouter';
import Navigation from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { BuyTokensCard } from '@/components/launchpad/BuyTokensCard';
import { IIcoInfoWithKey, ILaunchpadMetadata, IUserPurchaseWithKey } from '@/types/launchpad';
import { fetchICO, getBuyHistory, getVestingInfoAsPurchases } from '@/lib/launchpad/ico-evm';
import { getStatus, formatMonthsPeriod, formatNumber, formatDate } from '@/lib/launchpad/utils';
import launchpadsData from '@/lib/launchpad/launchpads.json';
import { Globe, Send, Twitter } from 'lucide-react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';

export default function LaunchpadDetailNew() {
  const [, params] = useRoute('/launchpad/:id');
  const { address, isConnected } = useAccount();
  const [icoInfo, setIcoInfo] = useState<IIcoInfoWithKey | null>(null);
  const [userPurchases, setUserPurchases] = useState<IUserPurchaseWithKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number>(0);

  const launchpads = launchpadsData as ILaunchpadMetadata[];
  const icoPot = params?.id || '';
  const [tokenAddress, icoId] = icoPot.split('-');

  const launchpadData = launchpads.find((l) => l.key === tokenAddress);

  useEffect(() => {
    if (icoId) {
      fetchData();
    }
  }, [icoId]);

  useEffect(() => {
    if (address && icoInfo) {
      fetchUserPurchases();
    }
  }, [address, icoInfo]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await fetchICO(icoId);
      if (data) {
        setIcoInfo(data);
        await fetchCurrentPrice(data);
      }
    } catch (error) {
      console.error('Error fetching ICO data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentPrice = async (ico: IIcoInfoWithKey) => {
    try {
      if (window.ethereum) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const LaunchpadABI = (await import('@/abis/Launchpad.json')).default;
        const proxyAddress = '0x206236eca2dF8FB37EF1d024e1F72f4313f413E4';
        const contract = new ethers.Contract(proxyAddress, LaunchpadABI, provider);
        
        const testAmount = BigInt(ico.data.icoDecimals);
        const result = await contract.getValue(icoId, testAmount);
        const price = Number(result[1]) / Number(testAmount);
        setCurrentPrice(price);
      }
    } catch (error) {
      console.error('Error fetching current price:', error);
    }
  };

  const fetchUserPurchases = async () => {
    if (!address || !icoInfo) return;

    try {
      let purchases: IUserPurchaseWithKey[] = [];

      // Fetch direct purchases from events
      const buyHistory = await getBuyHistory(
        address,
        Number(icoId),
        icoInfo.data.unlockPercentage
      );

      if (buyHistory) {
        purchases = buyHistory.map((purchase: any, index: number) => ({
          key: purchase.seed,
          data: purchase,
        }));
      }

      // If there's a vesting contract, fetch vesting info
      if (icoInfo.data.vestingContracts) {
        const vestingPurchases = await getVestingInfoAsPurchases(
          icoInfo.data.vestingContracts,
          address,
          tokenAddress,
          icoInfo.data.unlockPercentage
        );
        purchases = [...purchases, ...vestingPurchases];
      }

      setUserPurchases(purchases);
    } catch (error) {
      console.error('Error fetching user purchases:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!icoInfo) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive">ICO not found</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const status = getStatus(
    icoInfo.data.isClosed,
    icoInfo.data.amount,
    icoInfo.data.totalSold,
    icoInfo.data.startDate,
    Date.now(),
    icoInfo.data.endDate
  );

  const badgeVariant = status.color === 'success' ? 'default' : 
                       status.color === 'warning' ? 'secondary' : 
                       status.color === 'error' ? 'destructive' : 'outline';

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold mb-6">Token Purchase</h1>

        <div className="flex gap-3 mb-6">
          <Link href="/launchpad">
            <Button variant="outline">← Launchpad</Button>
          </Link>
          <Badge variant={badgeVariant} className="capitalize h-9 px-3 text-sm">
            {status.status}
          </Badge>
        </div>

        {launchpadData && (
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row justify-between items-center md:items-start">
                <div className="flex items-center mb-4 md:mb-0">
                  {launchpadData.projectLogo && (
                    <img
                      src={launchpadData.projectLogo}
                      alt={launchpadData.name}
                      className="w-8 h-8 rounded-full object-contain mr-2"
                    />
                  )}
                  <h2 className="text-xl font-bold">{launchpadData.name}</h2>
                </div>

                <div className="flex gap-3">
                  {launchpadData.links?.web && (
                    <a
                      href={launchpadData.links.web.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Globe className="w-5 h-5" />
                    </a>
                  )}
                  {launchpadData.links?.x && (
                    <a
                      href={launchpadData.links.x.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Twitter className="w-4 h-4" />
                    </a>
                  )}
                  {launchpadData.links?.telegram && (
                    <a
                      href={launchpadData.links.telegram.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-primary"
                    >
                      <Send className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
              <p className="text-sm text-muted-foreground pt-2">{launchpadData.description}</p>
            </CardContent>
          </Card>
        )}

        {!isConnected ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Please connect your wallet to view and purchase tokens</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <BuyTokensCard
              icoInfo={icoInfo}
              icoPot={icoPot}
              status={status.status}
              currentPrice={currentPrice}
              onSuccess={() => {
                fetchData();
                fetchUserPurchases();
              }}
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm text-muted-foreground mb-2">Tokens Available</h3>
                  <p className="text-2xl font-bold">
                    {formatNumber((icoInfo.data.amount - icoInfo.data.totalSold) / icoInfo.data.icoDecimals, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    of {formatNumber(icoInfo.data.amount / icoInfo.data.icoDecimals, 0)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm text-muted-foreground mb-2">Vesting Info</h3>
                  <p className="text-lg font-semibold">
                    {icoInfo.data.unlockPercentage / 100}% unlocked
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cliff: {formatMonthsPeriod(icoInfo.data.cliffPeriod)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Vesting: {icoInfo.data.vestingPercentage / 100}% / {formatMonthsPeriod(icoInfo.data.vestingInterval)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <h3 className="text-sm text-muted-foreground mb-2">Bonus Tokens</h3>
                  <p className="text-lg font-semibold">
                    {icoInfo.data.bonusPercentage / 100}%
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Reserve: {formatNumber(icoInfo.data.bonusReserve / icoInfo.data.icoDecimals, 0)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {userPurchases.length > 0 && (
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4">Your Purchases</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-4">Date</th>
                          <th className="text-right py-2 px-4">Amount</th>
                          <th className="text-right py-2 px-4">Bonus</th>
                          <th className="text-right py-2 px-4">Locked</th>
                          <th className="text-right py-2 px-4">Claimed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {userPurchases.map((purchase) => (
                          <tr key={purchase.key} className="border-b">
                            <td className="py-2 px-4">{formatDate(String(purchase.data.buyDate))}</td>
                            <td className="text-right py-2 px-4">
                              {formatNumber(purchase.data.buyAmount / icoInfo.data.icoDecimals, 2)}
                            </td>
                            <td className="text-right py-2 px-4">
                              {formatNumber(purchase.data.bonus / icoInfo.data.icoDecimals, 2)}
                            </td>
                            <td className="text-right py-2 px-4">
                              {formatNumber(purchase.data.lockedAmount / icoInfo.data.icoDecimals, 2)}
                            </td>
                            <td className="text-right py-2 px-4">
                              {formatNumber(purchase.data.totalClaimed / icoInfo.data.icoDecimals, 2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

