import { GaugeList } from '@/components/gauge/GaugeList';
import { EpochTimer } from '@/components/epoch/EpochTimer';

export default function GaugesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Gauge Voting</h1>
          <p className="text-lg text-gray-600">
            Direct resource allocation by voting on gauges with your veNFT
          </p>
        </div>

        {/* Current Epoch Info */}
        <EpochTimer />

        {/* Gauge List */}
        <GaugeList />
      </div>
    </div>
  );
}

