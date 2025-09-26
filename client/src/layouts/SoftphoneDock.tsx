import { useState } from "react";
import { Phone, PhoneCall, Mic, MicOff, Volume2, VolumeX, MoreHorizontal, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSoftphone } from "@/components/softphone/softphone-provider";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { featureFlags } from '@/lib/feature-flags';

interface ActiveCall {
  number: string;
  status: 'ringing' | 'connected' | 'on-hold' | 'transferring';
  duration: number;
  conversationId?: string;
}

export function SoftphoneDock() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);
  const { openPanel } = useSoftphone();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Get active call status using the same pattern as CallBar
  const { data: activeCall } = useQuery<ActiveCall>({
    queryKey: ['/api/softphone/status'],
    refetchInterval: featureFlags.softphoneStatusPollMs,
  });
  
  // Dock states: inactive, ringing, active
  const dockState = activeCall ? 
    (activeCall.status === 'ringing' ? 'ringing' : 'active') : 
    'inactive';

  const hangupMutation = useMutation({
    mutationFn: () => {
      if (!activeCall?.conversationId) {
        throw new Error('No active call to hangup');
      }
      return apiRequest('POST', `/api/softphone/calls/${activeCall.conversationId}/hangup`);
    },
    onSuccess: () => {
      // Clear cache immediately
      queryClient.setQueryData(['/api/softphone/status'], null);
      queryClient.invalidateQueries({ queryKey: ['/api/softphone/status'] });
      toast({
        title: "Llamada finalizada",
        description: "La llamada se ha terminado correctamente",
      });
    }
  });

  const toggleMuteMutation = useMutation({
    mutationFn: () => {
      if (!activeCall?.conversationId) {
        throw new Error('No active call to mute');
      }
      return apiRequest('POST', `/api/softphone/calls/${activeCall.conversationId}/mute`, { muted: !isMuted });
    },
    onSuccess: () => {
      setIsMuted(!isMuted);
      toast({
        title: isMuted ? "Micrófono activado" : "Micrófono silenciado",
        description: isMuted ? "Ahora pueden escucharte" : "Tu micrófono está silenciado",
      });
    }
  });

  const toggleHoldMutation = useMutation({
    mutationFn: () => {
      if (!activeCall?.conversationId) {
        throw new Error('No active call to hold');
      }
      return apiRequest('POST', `/api/softphone/calls/${activeCall.conversationId}/hold`, { onHold: !isOnHold });
    },
    onSuccess: () => {
      setIsOnHold(!isOnHold);
      toast({
        title: isOnHold ? "Llamada reanudada" : "Llamada en espera",
        description: isOnHold ? "La llamada ha sido reanudada" : "La llamada está en espera",
      });
    }
  });

  const handleHangup = () => {
    if (activeCall) {
      hangupMutation.mutate();
    }
  };

  const handleToggleMute = () => {
    if (activeCall) {
      toggleMuteMutation.mutate();
    }
  };

  const handleToggleHold = () => {
    if (activeCall) {
      toggleHoldMutation.mutate();
    }
  };

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 transition-all duration-300",
      isExpanded ? "h-48" : "h-16"
    )} data-testid="softphone-dock">
      
      {/* Dock Header - Always visible */}
      <div className="h-16 flex items-center justify-between px-4">
        {/* Left section - Call status */}
        <div className="flex items-center space-x-3">
          {dockState === 'inactive' && (
            <>
              <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <Phone className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Sin llamadas activas</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Listo para recibir llamadas</p>
              </div>
            </>
          )}
          
          {dockState === 'ringing' && (
            <>
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center animate-pulse">
                <PhoneCall className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Llamada entrante</p>
                <p className="text-xs text-gray-500 dark:text-gray-400" data-testid="call-number">
                  {activeCall?.number || 'Número desconocido'}
                </p>
              </div>
            </>
          )}
          
          {dockState === 'active' && (
            <>
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <PhoneCall className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Llamada activa</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <span data-testid="call-number">{activeCall?.number}</span>
                  {' • '}
                  <span data-testid="call-duration">{activeCall?.duration || '00:00'}</span>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Right section - Controls */}
        <div className="flex items-center space-x-2">
          {/* Call controls - only show when there's an active call */}
          {activeCall && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleMute}
                className={cn(
                  "w-9 h-9 p-0",
                  isMuted ? "bg-red-50 text-red-600 border-red-200" : ""
                )}
                data-testid="button-toggle-mute"
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleToggleHold}
                className={cn(
                  "w-9 h-9 p-0",
                  isOnHold ? "bg-yellow-50 text-yellow-600 border-yellow-200" : ""
                )}
                data-testid="button-toggle-hold"
              >
                {isOnHold ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handleHangup}
                className="w-9 h-9 p-0"
                data-testid="button-hangup"
              >
                <Phone className="w-4 h-4" />
              </Button>
            </>
          )}
          
          {/* Expand/collapse button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-9 h-9 p-0"
            data-testid="button-toggle-expand"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Expanded panel - show when expanded */}
      {isExpanded && (
        <div className="h-32 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 h-full">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Panel de llamada expandido</p>
            <div className="grid grid-cols-4 gap-2">
              <Button variant="outline" size="sm" className="text-xs">Transferir</Button>
              <Button variant="outline" size="sm" className="text-xs">Grabar</Button>
              <Button variant="outline" size="sm" className="text-xs">Notas</Button>
              <Button variant="outline" size="sm" className="text-xs">Más</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}