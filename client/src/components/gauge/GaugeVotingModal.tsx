import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle } from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface Gauge {
  id: number;
  gaugeId: number;
  name: string;
  gaugeType: string;
  isActive: boolean;
}

interface GaugeVotingModalProps {
  gauges: Gauge[];
  onClose: () => void;
}

interface VoteAllocation {
  gaugeId: number;
  weight: number;
}

export function GaugeVotingModal({ gauges, onClose }: GaugeVotingModalProps) {
  const [allocations, setAllocations] = useState<Record<number, number>>({});
  const [veNftId, setVeNftId] = useState<string>('1'); // Mock veNFT ID
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const voteMutation = trpc.gauge.vote.useMutation();

  // Calculate total allocated weight
  const totalWeight = Object.values(allocations).reduce((sum, weight) => sum + weight, 0);
  const remainingWeight = 10000 - totalWeight;
  const isValid = totalWeight === 10000;

  const handleWeightChange = (gaugeId: number, value: string) => {
    const weight = parseInt(value) || 0;
    
    if (weight < 0 || weight > 10000) {
      return;
    }

    setAllocations(prev => ({
      ...prev,
      [gaugeId]: weight,
    }));
    setError(null);
  };

  const handlePercentageChange = (gaugeId: number, value: string) => {
    const percentage = parseFloat(value) || 0;
    const weight = Math.round(percentage * 100);
    
    if (weight < 0 || weight > 10000) {
      return;
    }

    setAllocations(prev => ({
      ...prev,
      [gaugeId]: weight,
    }));
    setError(null);
  };

  const distributeEvenly = () => {
    const activeGauges = gauges.filter(g => g.isActive);
    const weightPerGauge = Math.floor(10000 / activeGauges.length);
    const remainder = 10000 - (weightPerGauge * activeGauges.length);

    const newAllocations: Record<number, number> = {};
    activeGauges.forEach((gauge, index) => {
      newAllocations[gauge.gaugeId] = weightPerGauge + (index === 0 ? remainder : 0);
    });

    setAllocations(newAllocations);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Total weight must equal 100%');
      return;
    }

    const votes: VoteAllocation[] = Object.entries(allocations)
      .filter(([_, weight]) => weight > 0)
      .map(([gaugeId, weight]) => ({
        gaugeId: parseInt(gaugeId),
        weight,
      }));

    if (votes.length === 0) {
      setError('Please allocate weight to at least one gauge');
      return;
    }

    try {
      await voteMutation.mutateAsync({
        votes,
        veNftId: parseInt(veNftId),
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit votes');
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Votes Submitted!</h3>
          <p className="text-gray-600">Your gauge votes have been recorded successfully.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Vote on Gauges</h2>
            <p className="text-sm text-gray-600 mt-1">
              Allocate your voting power across gauges (total must equal 100%)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Weight Summary */}
          <div className={`rounded-lg p-4 ${
            isValid ? 'bg-green-50 border-2 border-green-200' : 
            remainingWeight < 0 ? 'bg-red-50 border-2 border-red-200' :
            'bg-blue-50 border-2 border-blue-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-gray-700">Total Allocated</div>
                <div className="text-2xl font-bold text-gray-900">
                  {(totalWeight / 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-gray-700">Remaining</div>
                <div className={`text-2xl font-bold ${
                  remainingWeight < 0 ? 'text-red-600' : 
                  remainingWeight === 0 ? 'text-green-600' : 
                  'text-blue-600'
                }`}>
                  {(remainingWeight / 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-4">
            <button
              onClick={distributeEvenly}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Distribute Evenly
            </button>
            <button
              onClick={() => setAllocations({})}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
            >
              Clear All
            </button>
          </div>

          {/* Gauge Allocations */}
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {gauges.filter(g => g.isActive).map(gauge => {
              const weight = allocations[gauge.gaugeId] || 0;
              const percentage = (weight / 100).toFixed(1);

              return (
                <div key={gauge.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold text-gray-900">{gauge.name}</div>
                      <div className="text-sm text-gray-600">{gauge.gaugeType}</div>
                    </div>
                    <div className="text-lg font-bold text-blue-600">{percentage}%</div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <input
                        type="range"
                        min="0"
                        max="10000"
                        step="100"
                        value={weight}
                        onChange={e => handleWeightChange(gauge.gaugeId, e.target.value)}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={percentage}
                      onChange={e => handlePercentageChange(gauge.gaugeId, e.target.value)}
                      className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">%</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!isValid || voteMutation.isLoading}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${
              isValid && !voteMutation.isLoading
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {voteMutation.isLoading ? 'Submitting...' : 'Submit Votes'}
          </button>
        </div>
      </div>
    </div>
  );
}

