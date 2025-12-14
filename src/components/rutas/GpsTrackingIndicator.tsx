import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Signal, SignalLow, SignalZero } from 'lucide-react';

interface GpsTrackingIndicatorProps {
  isTracking: boolean;
  accuracy: number | null;
  error: string | null;
  compact?: boolean;
}

export const GpsTrackingIndicator = ({ 
  isTracking, 
  accuracy, 
  error,
  compact = false 
}: GpsTrackingIndicatorProps) => {
  const getSignalIcon = () => {
    if (!isTracking || error) return SignalZero;
    if (!accuracy) return SignalLow;
    if (accuracy <= 10) return Signal;
    if (accuracy <= 50) return SignalLow;
    return SignalZero;
  };

  const getSignalColor = () => {
    if (!isTracking || error) return 'text-muted-foreground';
    if (!accuracy) return 'text-yellow-500';
    if (accuracy <= 10) return 'text-green-500';
    if (accuracy <= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  const SignalIcon = getSignalIcon();

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`flex items-center gap-1 ${getSignalColor()}`}>
              <MapPin className="h-3 w-3" />
              {isTracking && !error && (
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : isTracking ? (
              <span>
                GPS Activo {accuracy && `(±${Math.round(accuracy)}m)`}
              </span>
            ) : (
              <span>GPS Inactivo</span>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Badge 
      variant={isTracking && !error ? 'default' : 'secondary'}
      className={`${isTracking && !error ? 'bg-green-600 hover:bg-green-700' : ''}`}
    >
      <SignalIcon className={`h-3 w-3 mr-1 ${getSignalColor()}`} />
      {error ? (
        <span className="text-xs">{error}</span>
      ) : isTracking ? (
        <span className="text-xs flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
          Compartiendo ubicación
          {accuracy && <span className="opacity-75">(±{Math.round(accuracy)}m)</span>}
        </span>
      ) : (
        <span className="text-xs">GPS Inactivo</span>
      )}
    </Badge>
  );
};
