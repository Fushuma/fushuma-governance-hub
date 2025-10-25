import { useEffect, useState } from 'react';
import { trpc } from '@/lib/trpc';

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function formatTimeRemaining(seconds: number): TimeRemaining {
  const days = Math.floor(seconds / (24 * 60 * 60));
  const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((seconds % (60 * 60)) / 60);
  const secs = seconds % 60;

  return { days, hours, minutes, seconds: secs };
}

export function EpochTimer() {
  const { data: currentEpoch, isLoading } = trpc.epoch.getCurrent.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    if (!currentEpoch) return;

    // Initial time
    setTimeRemaining(formatTimeRemaining(currentEpoch.timeRemaining));

    // Update every second
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        const totalSeconds = prev.days * 24 * 60 * 60 + prev.hours * 60 * 60 + prev.minutes * 60 + prev.seconds;
        if (totalSeconds <= 0) {
          return prev;
        }
        return formatTimeRemaining(totalSeconds - 1);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [currentEpoch]);

  if (isLoading || !currentEpoch) {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="animate-pulse">
          <div className="h-4 bg-white/20 rounded w-32 mb-4"></div>
          <div className="h-8 bg-white/20 rounded w-48"></div>
        </div>
      </div>
    );
  }

  const phaseColors = {
    voting: 'from-green-500 to-emerald-600',
    distribution: 'from-blue-500 to-cyan-600',
    preparation: 'from-purple-500 to-pink-600',
  };

  const phaseLabels = {
    voting: 'Voting Phase',
    distribution: 'Distribution Phase',
    preparation: 'Preparation Phase',
  };

  return (
    <div className={`bg-gradient-to-r ${phaseColors[currentEpoch.phase]} rounded-lg p-6 text-white shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-medium opacity-90">Epoch {currentEpoch.number}</div>
          <div className="text-2xl font-bold">{phaseLabels[currentEpoch.phase]}</div>
        </div>
        <div className="text-right">
          <div className="text-sm opacity-90">Time Remaining</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold">{timeRemaining.days}</div>
          <div className="text-sm opacity-90">Days</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{timeRemaining.hours}</div>
          <div className="text-sm opacity-90">Hours</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{timeRemaining.minutes}</div>
          <div className="text-sm opacity-90">Minutes</div>
        </div>
        <div className="text-center">
          <div className="text-3xl font-bold">{timeRemaining.seconds}</div>
          <div className="text-sm opacity-90">Seconds</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/20">
        <div className="flex items-center justify-between text-sm">
          <div>
            <span className="opacity-90">Voters:</span>{' '}
            <span className="font-semibold">{currentEpoch.votersCount}</span>
          </div>
          <div>
            <span className="opacity-90">Proposals:</span>{' '}
            <span className="font-semibold">{currentEpoch.proposalsCount}</span>
          </div>
          <div>
            <span className="opacity-90">Voting Power:</span>{' '}
            <span className="font-semibold">{(currentEpoch.totalVotingPower / 1000000).toFixed(2)}M</span>
          </div>
        </div>
      </div>
    </div>
  );
}

