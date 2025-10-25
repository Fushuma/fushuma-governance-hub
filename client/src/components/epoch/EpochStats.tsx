import { trpc } from '@/lib/trpc';
import { TrendingUp, Users, Vote, DollarSign } from 'lucide-react';

interface EpochStatsProps {
  epochNumber: number;
}

export function EpochStats({ epochNumber }: EpochStatsProps) {
  const { data: stats, isLoading } = trpc.epoch.getStats.useQuery({ number: epochNumber });

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-32"></div>
          </div>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total Voting Power',
      value: `${(stats.totalVotingPower / 1000000).toFixed(2)}M`,
      icon: Vote,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      label: 'Total Distributed',
      value: `${(stats.totalDistributed / 1000).toFixed(0)}K`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      label: 'Unique Voters',
      value: stats.votersCount.toString(),
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      label: 'Participation Rate',
      value: `${(stats.participationRate * 100).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-gray-600">{stat.label}</div>
                <div className={`${stat.bgColor} ${stat.color} p-2 rounded-lg`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
            </div>
          );
        })}
      </div>

      {/* Top Gauges */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Gauges by Weight</h3>
        <div className="space-y-4">
          {stats.topGauges.map((gauge, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-semibold text-sm">
                  {index + 1}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{gauge.name}</div>
                  <div className="text-sm text-gray-500">{(gauge.weight / 100).toFixed(1)}% weight</div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-gray-900">
                  {(gauge.allocation / 1000).toFixed(0)}K
                </div>
                <div className="text-sm text-gray-500">allocated</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Voting Trends */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Voting Trends</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-gray-600 mb-1">Avg Voting Power</div>
            <div className="text-2xl font-bold text-gray-900">
              {(stats.votingTrends.avgVotingPower / 1000).toFixed(1)}K
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Unique Voters</div>
            <div className="text-2xl font-bold text-gray-900">{stats.votingTrends.uniqueVoters}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Total Votes</div>
            <div className="text-2xl font-bold text-gray-900">{stats.votingTrends.totalVotes}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

