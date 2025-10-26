import { useEffect, useState, useMemo } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { IIcoInfoWithKey, ILaunchpadMetadata } from '@/types/launchpad';
import { formatMonthsPeriod, formatNumber, getStatus } from '@/lib/launchpad/utils';
import { ethers } from 'ethers';
import ERC20ABI from '@/abis/ERC20.json';

interface LaunchpadCardProps {
  data: IIcoInfoWithKey;
  launchpad?: ILaunchpadMetadata;
}

export function LaunchpadCard({ data, launchpad }: LaunchpadCardProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [icoTokenName, setIcoTokenName] = useState<string>('');
  const [paymentTokenName, setPaymentTokenName] = useState<string>('FUMA');
  const [paymentDecimals, setPaymentDecimals] = useState<number>(18);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchTokenInfo = async () => {
      try {
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          
          // Fetch ICO token name
          if (data.data.icoMint !== '0x0000000000000000000000000000000000000000') {
            const icoToken = new ethers.Contract(data.data.icoMint, ERC20ABI, provider);
            const symbol = await icoToken.symbol();
            setIcoTokenName(symbol);
          }

          // Fetch payment token info
          if (data.data.costMint !== '0x0000000000000000000000000000000000000000') {
            const paymentToken = new ethers.Contract(data.data.costMint, ERC20ABI, provider);
            const symbol = await paymentToken.symbol();
            const decimals = await paymentToken.decimals();
            setPaymentTokenName(symbol);
            setPaymentDecimals(Number(decimals));
          }
        }
      } catch (error) {
        console.error('Error fetching token info:', error);
      }
    };

    fetchTokenInfo();
  }, [data.data.icoMint, data.data.costMint]);

  const status = useMemo(() => {
    return getStatus(
      Number(data.data.isClosed),
      Number(data.data.amount),
      Number(data.data.totalSold),
      String(data.data.startDate),
      String(currentTime),
      String(data.data.endDate)
    );
  }, [data.data, currentTime]);

  const formattedStartDate = useMemo(() => {
    return new Date(Number(data.data.startDate)).toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }, [data.data.startDate]);

  const formattedEndDate = useMemo(() => {
    return data.data.endDate
      ? new Date(Number(data.data.endDate)).toLocaleString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })
      : '∞';
  }, [data.data.endDate]);

  const progressPercentage = useMemo(() => {
    const totalSold = Number(data.data.totalSold);
    const amount = Number(data.data.amount);
    return (totalSold / amount) * 100;
  }, [data.data.totalSold, data.data.amount]);

  const priceRange = useMemo(() => {
    const startPrice = Number(data.data.startPrice);
    const endPrice = Number(data.data.endPrice);
    const icoDecimals = Number(data.data.icoDecimals);
    const decimalPlaces = icoDecimals.toString().length - 1;

    return endPrice === 0
      ? ethers.formatUnits(data.data.startPrice, paymentDecimals)
      : `${formatNumber(startPrice / icoDecimals, decimalPlaces)} - ${formatNumber(endPrice / icoDecimals, decimalPlaces)}`;
  }, [data.data.startPrice, data.data.endPrice, data.data.icoDecimals, paymentDecimals]);

  const detailUrl = `/launchpad/${data.key}-${data.data.seed}`;

  const displayName = launchpad?.name || icoTokenName || `ICO #${data.data.seed}`;

  const badgeVariant = status.color === 'success' ? 'default' : 
                       status.color === 'warning' ? 'secondary' : 
                       status.color === 'error' ? 'destructive' : 'outline';

  return (
    <Link href={detailUrl}>
      <Card className="hover:shadow-lg transition-all cursor-pointer h-full hover:-translate-y-1">
        <CardContent className="p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              {launchpad?.projectLogo && (
                <img
                  src={launchpad.projectLogo}
                  alt={displayName}
                  className="w-9 h-9 object-contain rounded-full"
                />
              )}
              <div className="font-bold text-lg">{displayName}</div>
            </div>
            <Badge variant={badgeVariant} className="capitalize">
              {status.status}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-muted-foreground">ICO Token</div>
              <div className="font-medium">{icoTokenName || 'Loading...'}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Payment Token</div>
              <div className="font-medium">{paymentTokenName}</div>
            </div>
          </div>

          <div className="pb-4">
            <div className="text-sm text-muted-foreground">Price Range</div>
            <div className="font-medium">{priceRange} {paymentTokenName}</div>
          </div>

          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm text-muted-foreground">
                {formatNumber(Number(data.data.totalSold) / Number(data.data.icoDecimals), 0)} / {formatNumber(Number(data.data.amount) / Number(data.data.icoDecimals), 0)}
              </span>
            </div>
            <Progress value={Math.min(progressPercentage, 100)} className="h-2" />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Unlocked</div>
              <div className="font-medium">{Number(data.data.unlockPercentage) / 100}%</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Cliff</div>
              <div className="font-medium">{formatMonthsPeriod(Number(data.data.cliffPeriod))}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Vesting</div>
              <div className="font-medium">
                {Number(data.data.vestingPercentage) / 100}% / {formatMonthsPeriod(Number(data.data.vestingInterval))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
            <div>
              <div className="text-sm text-muted-foreground">Started</div>
              <div className="font-medium text-sm">{formattedStartDate}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Ends</div>
              <div className="font-medium text-sm">{formattedEndDate}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

