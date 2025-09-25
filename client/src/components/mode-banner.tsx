import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface ModeInfo {
  stripeMode: 'test' | 'live';
  paypalMode: 'sandbox' | 'live';
  isTestMode: boolean;
  environment: 'development' | 'production';
}

export function ModeBanner() {
  const { data: modeInfo } = useQuery<ModeInfo>({
    queryKey: ['/api/system/mode'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (!modeInfo) return null;

  const isTestMode = modeInfo.isTestMode;
  const isDevelopment = modeInfo.environment === 'development';

  return (
    <div className="flex items-center gap-2">
      {isTestMode ? (
        <Badge 
          variant="secondary" 
          className="bg-amber-100 text-amber-800 border-amber-300 flex items-center gap-1"
          data-testid="mode-banner-test"
        >
          <AlertTriangle className="w-3 h-3" />
          {modeInfo.stripeMode === 'test' ? 'Test' : 'Sandbox'} Mode
        </Badge>
      ) : (
        <Badge 
          variant="secondary" 
          className="bg-green-100 text-green-800 border-green-300 flex items-center gap-1"
          data-testid="mode-banner-live"
        >
          <CheckCircle className="w-3 h-3" />
          Live Mode
        </Badge>
      )}
      
      {isDevelopment && (
        <Badge 
          variant="outline" 
          className="text-xs"
          data-testid="mode-banner-dev"
        >
          Dev
        </Badge>
      )}
    </div>
  );
}