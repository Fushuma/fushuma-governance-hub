import { EpochTimer } from '@/components/epoch/EpochTimer';
import { EpochStats } from '@/components/epoch/EpochStats';
import { EpochTimeline } from '@/components/epoch/EpochTimeline';
import { trpc } from '@/lib/trpc';

export default function EpochsPage() {
  const { data: currentEpoch } = trpc.epoch.getCurrent.useQuery();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Governance Epochs</h1>
          <p className="text-lg text-gray-600">
            Track governance cycles, voting periods, and resource distribution
          </p>
        </div>

        {/* Epoch Timer */}
        <EpochTimer />

        {/* Epoch Stats */}
        {currentEpoch && <EpochStats epochNumber={currentEpoch.number} />}

        {/* Epoch Timeline */}
        <EpochTimeline />
      </div>
    </div>
  );
}

