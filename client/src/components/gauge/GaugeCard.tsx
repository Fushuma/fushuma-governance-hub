import { TrendingUp, Users, DollarSign, Award } from 'lucide-react';
import { Link } from 'wouter';

interface Gauge {
  id: number;
  gaugeId: number;
  name: string;
  description: string;
  gaugeType: 'grant' | 'treasury' | 'parameter';
  weight: number;
  totalVotes: number;
  currentAllocation: number;
  votersCount: number;
  isActive: boolean;
}

interface GaugeCardProps {
  gauge: Gauge;
}

export function GaugeCard({ gauge }: GaugeCardProps) {
  const typeColors = {
    grant: 'bg-green-100 text-green-800 border-green-200',
    treasury: 'bg-blue-100 text-blue-800 border-blue-200',
    parameter: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  const typeLabels = {
    grant: 'Development Grant',
    treasury: 'Treasury',
    parameter: 'Parameters',
  };

  const weightPercentage = (gauge.weight / 100).toFixed(1);

  return (
    <Link
      to={`/gauge/${gauge.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-lg transition-all p-6 border-2 border-transparent hover:border-blue-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{gauge.name}</h3>
            {!gauge.isActive && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded">
                Inactive
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 line-clamp-2">{gauge.description}</p>
        </div>
        <span className={`px-3 py-1 text-xs font-medium rounded-full border ${typeColors[gauge.gaugeType]}`}>
          {typeLabels[gauge.gaugeType]}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span className="text-xs text-gray-600">Weight</span>
          </div>
          <div className="text-xl font-bold text-gray-900">{weightPercentage}%</div>
        </div>

        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <DollarSign className="w-4 h-4 text-green-600" />
            <span className="text-xs text-gray-600">Allocation</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {(gauge.currentAllocation / 1000).toFixed(0)}K
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span>{gauge.votersCount} voters</span>
          </div>
          <div className="flex items-center space-x-1">
            <Award className="w-4 h-4" />
            <span>{(gauge.totalVotes / 1000).toFixed(0)}K votes</span>
          </div>
        </div>
        
        <div className="text-sm font-medium text-blue-600">
          View Details →
        </div>
      </div>
    </Link>
  );
}

