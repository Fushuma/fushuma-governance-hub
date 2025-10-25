import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { GaugeCard } from './GaugeCard';
import { GaugeVotingModal } from './GaugeVotingModal';
import { Vote, Filter } from 'lucide-react';

export function GaugeList() {
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [activeOnly, setActiveOnly] = useState(true);
  
  const { data: gauges, isLoading } = trpc.gauge.list.useQuery({ activeOnly });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!gauges || gauges.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="text-gray-400 mb-4">
          <Vote className="w-16 h-16 mx-auto" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Gauges Available</h3>
        <p className="text-gray-600">There are no active gauges at the moment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gauge Voting</h2>
          <p className="text-gray-600 mt-1">
            Allocate your voting power across gauges to direct resource allocation
          </p>
        </div>
        <div className="flex items-center space-x-4">
          {/* Filter Toggle */}
          <button
            onClick={() => setActiveOnly(!activeOnly)}
            className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span className="text-sm font-medium">
              {activeOnly ? 'Active Only' : 'All Gauges'}
            </span>
          </button>

          {/* Vote Button */}
          <button
            onClick={() => setShowVotingModal(true)}
            className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Vote className="w-4 h-4" />
            <span className="font-medium">Vote on Gauges</span>
          </button>
        </div>
      </div>

      {/* Gauge Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {gauges.map(gauge => (
          <GaugeCard key={gauge.id} gauge={gauge} />
        ))}
      </div>

      {/* Voting Modal */}
      {showVotingModal && (
        <GaugeVotingModal
          gauges={gauges}
          onClose={() => setShowVotingModal(false)}
        />
      )}
    </div>
  );
}

