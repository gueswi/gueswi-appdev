import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Maximize2,
  Minimize2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';

interface ActiveCall {
  number: string;
  status: 'ringing' | 'connected' | 'on-hold' | 'transferring';
  duration: number;
  conversationId?: string;
}
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CallBarProps {
  onTogglePanel: () => void;
  isPanelOpen: boolean;
}

export function CallBar({ onTogglePanel, isPanelOpen }: CallBarProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Get active call status - OPTIMIZED POLLING
  const { data: activeCall, isLoading } = useQuery<ActiveCall>({
    queryKey: ['/api/softphone/status'],
    refetchInterval: 2000, // Reduced from 1s to 2s to save resources
    // TODO: Disable polling completely when WebSocket is connected
  });

  const hangupMutation = useMutation({
    mutationFn: () => {
      if (!activeCall?.conversationId) {
        throw new Error('No active call to hangup');
      }
      return apiRequest('POST', `/api/softphone/calls/${activeCall.conversationId}/hangup`);
    },
    onSuccess: () => {
      const conversationId = activeCall?.conversationId;
      
      // CLEAR LOCAL STATE AND CACHE IMMEDIATELY
      queryClient.setQueryData(['/api/softphone/status'], null);
      queryClient.invalidateQueries({ queryKey: ['/api/softphone/status'] });
      
      toast({
        title: "Llamada finalizada",
        description: conversationId 
          ? "La llamada se ha terminado correctamente" 
          : "La llamada se ha terminado correctamente",
        action: conversationId ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setLocation(`/dashboard/conversaciones/${conversationId}`)}
            data-testid="button-view-conversation-toast"
          >
            Ver conversación
          </Button>
        ) : undefined,
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
        description: isMuted ? "Tu voz ahora se escucha" : "Tu voz está silenciada",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50" data-testid="call-bar">
        <div className="flex items-center justify-center px-4 py-3">
          <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full mr-2" />
          <span className="text-sm text-muted-foreground">Cargando estado de llamadas...</span>
        </div>
      </div>
    );
  }

  // ALWAYS SHOW "SIN LLAMADAS" WHEN NO ACTIVE CALL
  if (!activeCall) {
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50" data-testid="call-bar">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground" data-testid="text-no-calls">Sin llamadas activas</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onTogglePanel}
            data-testid="button-open-dialer"
          >
            <Phone className="w-4 h-4 mr-2" />
            Marcar
          </Button>
        </div>
      </div>
    );
  }

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCallStatusColor = (status: string) => {
    switch (status) {
      case 'ringing': return 'bg-yellow-500';
      case 'connected': return 'bg-green-500';
      case 'on-hold': return 'bg-amber-500';
      case 'transferring': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const getCallStatusText = (status: string) => {
    switch (status) {
      case 'ringing': return 'Timbrando...';
      case 'connected': return 'En llamada';
      case 'on-hold': return 'En espera';
      case 'transferring': return 'Transfiriendo...';
      default: return 'Desconocido';
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border shadow-lg z-50" data-testid="call-bar">
      <div className="flex items-center justify-between px-4 py-3">
        {/* Call Info */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <PhoneCall className="w-5 h-5 text-primary" />
            <div className={cn(
              "absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse",
              getCallStatusColor(activeCall.status)
            )} />
          </div>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm" data-testid="call-number">
                {activeCall.number || 'Número desconocido'}
              </span>
              <Badge variant="outline" className="text-xs">
                {getCallStatusText(activeCall.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span data-testid="call-duration">
                {formatCallDuration(activeCall.duration || 0)}
              </span>
            </div>
          </div>
        </div>

        {/* Call Controls */}
        <div className="flex items-center gap-2">
          {/* Mute Button */}
          <Button
            variant={isMuted ? "destructive" : "outline"}
            size="sm"
            onClick={() => toggleMuteMutation.mutate()}
            disabled={toggleMuteMutation.isPending}
            data-testid="button-mute"
          >
            {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </Button>

          {/* Speaker Button */}
          <Button
            variant={isSpeakerMuted ? "destructive" : "outline"}
            size="sm"
            onClick={() => setIsSpeakerMuted(!isSpeakerMuted)}
            data-testid="button-speaker"
          >
            {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </Button>

          {/* Expand Panel Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={onTogglePanel}
            data-testid="button-expand-panel"
          >
            {isPanelOpen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>

          {/* Hangup Button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => hangupMutation.mutate()}
            disabled={hangupMutation.isPending}
            data-testid="button-hangup"
          >
            <PhoneOff className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}