import { trpc } from '@/lib/trpc';
import { Calendar, Clock } from 'lucide-react';

export function EpochTimeline() {
  const { data: timeline, isLoading } = trpc.epoch.getTimeline.useQuery();

  if (isLoading || !timeline) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDuration = (seconds: number) => {
    const days = Math.floor(seconds / (24 * 60 * 60));
    return `${days} day${days !== 1 ? 's' : ''}`;
  };

  const phaseColors = {
    Voting: 'bg-green-100 text-green-800 border-green-300',
    Distribution: 'bg-blue-100 text-blue-800 border-blue-300',
    Preparation: 'bg-purple-100 text-purple-800 border-purple-300',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
        <Calendar className="w-5 h-5 mr-2" />
        Epoch Timeline
      </h3>

      <div className="space-y-8">
        {timeline.map((epoch, epochIndex) => (
          <div key={epoch.epochNumber} className="relative">
            {/* Epoch Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Epoch {epoch.epochNumber}</h4>
                <p className="text-sm text-gray-600">
                  {formatDate(epoch.startTime)} - {formatDate(epoch.endTime)}
                </p>
              </div>
              {epochIndex === 0 && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  Current
                </span>
              )}
            </div>

            {/* Phases */}
            <div className="space-y-3">
              {epoch.phases.map((phase, phaseIndex) => {
                const isActive = epochIndex === 0 && phaseIndex === 0; // Simplified active check
                
                return (
                  <div
                    key={phaseIndex}
                    className={`border-2 rounded-lg p-4 transition-all ${
                      isActive
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : phaseColors[phase.name as keyof typeof phaseColors]
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Clock className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-600'}`} />
                        <div>
                          <div className={`font-semibold ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                            {phase.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDate(phase.startTime)} - {formatDate(phase.endTime)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                          {formatDuration(phase.duration)}
                        </div>
                        {isActive && (
                          <div className="text-xs text-blue-600 font-medium mt-1">Active Now</div>
                        )}
                      </div>
                    </div>

                    {/* Phase Description */}
                    <div className="mt-2 text-sm text-gray-600">
                      {phase.name === 'Voting' && '• Vote on proposals and allocate gauge weights'}
                      {phase.name === 'Distribution' && '• Calculate weights and distribute resources'}
                      {phase.name === 'Preparation' && '• Create proposals and prepare for next epoch'}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Connector Line */}
            {epochIndex < timeline.length - 1 && (
              <div className="flex justify-center my-6">
                <div className="w-0.5 h-8 bg-gray-300"></div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

