import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { LaunchpadCard } from '@/components/launchpad/LaunchpadCard';
import { Card, CardContent } from '@/components/ui/card';
import { IIcoInfoWithKey, ILaunchpadMetadata } from '@/types/launchpad';
import { fetchAllICOs } from '@/lib/launchpad/ico-evm';
import { getStatus, IcoStatus } from '@/lib/launchpad/utils';
import launchpadsData from '@/lib/launchpad/launchpads.json';

export default function LaunchpadNew() {
  const [data, setData] = useState<IIcoInfoWithKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const launchpads = launchpadsData as ILaunchpadMetadata[];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(false);

      const evmIcos = await fetchAllICOs();
      const ignoredIcos = [0];
      const filteredIcos = evmIcos.filter((ico: any) => !ignoredIcos.includes(ico.data.seed));

      // Sort by status: Live > Upcoming > Sold Out > Ended > Closed
      const livelaunchpads = filteredIcos.filter((ico) => {
        return getStatus(
          Number(ico.data.isClosed),
          Number(ico.data.amount),
          Number(ico.data.totalSold),
          String(ico.data.startDate),
          String(Date.now()),
          String(ico.data.endDate)
        ).status === IcoStatus.Live;
      });

      livelaunchpads.sort((a, b) => {
        if (a.data.seed === 18 && b.data.seed !== 18) return -1;
        if (b.data.seed === 18 && a.data.seed !== 18) return 1;
        if (a.data.seed === 19 && b.data.seed !== 19) return -1;
        if (b.data.seed === 19 && a.data.seed !== 19) return 1;
        if (a.data.startDate > b.data.startDate) return -1;
        return 1;
      });

      const upcominglaunchpads = filteredIcos.filter((ico) => {
        return getStatus(
          Number(ico.data.isClosed),
          Number(ico.data.amount),
          Number(ico.data.totalSold),
          String(ico.data.startDate),
          String(Date.now()),
          String(ico.data.endDate)
        ).status === IcoStatus.Upcoming;
      });

      upcominglaunchpads.sort((a, b) => (a.data.startDate > b.data.startDate ? -1 : 1));

      const soldoutlaunchpads = filteredIcos.filter((ico) => {
        return getStatus(
          Number(ico.data.isClosed),
          Number(ico.data.amount),
          Number(ico.data.totalSold),
          String(ico.data.startDate),
          String(Date.now()),
          String(ico.data.endDate)
        ).status === IcoStatus.SoldOut;
      });

      soldoutlaunchpads.sort((a, b) => (a.data.startDate > b.data.startDate ? -1 : 1));

      const closedlaunchpads = filteredIcos.filter((ico) => {
        return getStatus(
          Number(ico.data.isClosed),
          Number(ico.data.amount),
          Number(ico.data.totalSold),
          String(ico.data.startDate),
          String(Date.now()),
          String(ico.data.endDate)
        ).status === IcoStatus.Closed;
      });

      closedlaunchpads.sort((a, b) => (a.data.startDate > b.data.startDate ? -1 : 1));

      const endedlaunchpads = filteredIcos.filter((ico) => {
        return getStatus(
          Number(ico.data.isClosed),
          Number(ico.data.amount),
          Number(ico.data.totalSold),
          String(ico.data.startDate),
          String(Date.now()),
          String(ico.data.endDate)
        ).status === IcoStatus.Ended;
      });

      endedlaunchpads.sort((a, b) => (a.data.startDate > b.data.startDate ? -1 : 1));

      const combined = [
        ...livelaunchpads,
        ...upcominglaunchpads,
        ...soldoutlaunchpads,
        ...endedlaunchpads,
        ...closedlaunchpads,
      ];

      setData(combined);
    } catch (e: any) {
      console.error('Error fetching launchpad data:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Fushuma Launchpad</h1>
          <p className="text-muted-foreground">
            Create your own ICO or participate in token sales on the Fushuma network
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive">Failed to load launchpad data</p>
            </CardContent>
          </Card>
        ) : data.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No launchpads are published right now.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.map((item) => (
              <LaunchpadCard
                key={item.key}
                data={item}
                launchpad={launchpads.find((l) => l.key === item.key)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

