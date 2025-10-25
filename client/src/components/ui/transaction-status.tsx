import { CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TransactionStatus = 'pending' | 'confirming' | 'success' | 'error';

interface TransactionStatusProps {
  status: TransactionStatus;
  txHash?: string;
  message?: string;
  explorerUrl?: string;
  className?: string;
}

/**
 * Transaction status indicator component
 */
export function TransactionStatus({
  status,
  txHash,
  message,
  explorerUrl,
  className,
}: TransactionStatusProps) {
  const statusConfig: Record<TransactionStatus, {
    icon: any;
    color: string;
    bgColor: string;
    defaultMessage: string;
    animate?: boolean;
  }> = {
    pending: {
      icon: Clock,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10',
      defaultMessage: 'Transaction pending...',
    },
    confirming: {
      icon: Loader2,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      defaultMessage: 'Confirming transaction...',
      animate: true,
    },
    success: {
      icon: CheckCircle2,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      defaultMessage: 'Transaction successful!',
    },
    error: {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      defaultMessage: 'Transaction failed',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg border p-4',
        config.bgColor,
        className
      )}
    >
      <Icon
        className={cn(
          'h-5 w-5 mt-0.5',
          config.color,
          config.animate && 'animate-spin'
        )}
      />
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium">
          {message || config.defaultMessage}
        </p>
        {txHash && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono">
              {txHash.slice(0, 10)}...{txHash.slice(-8)}
            </span>
            {explorerUrl && (
              <a
                href={`${explorerUrl}/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                View on Explorer →
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Transaction progress steps component
 */
interface TransactionStep {
  label: string;
  status: 'pending' | 'active' | 'complete' | 'error';
}

interface TransactionProgressProps {
  steps: TransactionStep[];
  className?: string;
}

export function TransactionProgress({ steps, className }: TransactionProgressProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {steps.map((step, index) => (
        <div key={index} className="flex items-center gap-3">
          <div className="flex-shrink-0">
            {step.status === 'complete' && (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            )}
            {step.status === 'active' && (
              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
            )}
            {step.status === 'pending' && (
              <div className="h-5 w-5 rounded-full border-2 border-muted" />
            )}
            {step.status === 'error' && (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
          </div>
          <span
            className={cn(
              'text-sm',
              step.status === 'complete' && 'text-green-600',
              step.status === 'active' && 'text-blue-600 font-medium',
              step.status === 'pending' && 'text-muted-foreground',
              step.status === 'error' && 'text-red-600'
            )}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}

