import { useState } from 'react';
import { 
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Phone, 
  PhoneOff, 
  Pause, 
  Play, 
  RotateCcw, 
  MessageSquare,
  User,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Hash,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { featureFlags } from '@/lib/feature-flags';

interface ActiveCall {
  number: string;
  status: 'ringing' | 'connected' | 'on-hold' | 'transferring';
  duration: number;
  conversationId?: string;
}

interface ConversationMessage {
  id: string;
  content: string;
  type: 'note' | 'chat';
  timestamp: string;
}

interface Conversation {
  id: string;
  messages: ConversationMessage[];
}
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface CallPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CallPanel({ isOpen, onClose }: CallPanelProps) {
  const [dialNumber, setDialNumber] = useState('');
  const [callNotes, setCallNotes] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [transferNumber, setTransferNumber] = useState('');
  const [activeTab, setActiveTab] = useState('dial');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get active call status
  const { data: activeCall } = useQuery<ActiveCall>({
    queryKey: ['/api/softphone/status'],
    refetchInterval: featureFlags.softphoneStatusPollMs,
  });

  // Get call conversation if call is active
  const { data: conversation } = useQuery<Conversation>({
    queryKey: ['/api/conversations', activeCall?.conversationId],
    enabled: !!activeCall?.conversationId,
  });

  const dialMutation = useMutation({
    mutationFn: (number: string) => apiRequest('POST', '/api/softphone/calls/dial', { to: number }),
    onSuccess: () => {
      toast({
        title: "Llamada iniciada",
        description: `Llamando a ${dialNumber}...`,
      });
      setDialNumber('');
      queryClient.invalidateQueries({ queryKey: ['/api/softphone/status'] });
    }
  });

  const holdMutation = useMutation({
    mutationFn: () => {
      if (!activeCall?.conversationId) {
        throw new Error('No active call to hold');
      }
      return apiRequest('POST', `/api/softphone/calls/${activeCall.conversationId}/hold`);
    },
    onSuccess: () => {
      toast({
        title: "Llamada en espera",
        description: "La llamada se ha puesto en espera",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/softphone/status'] });
    }
  });

  const transferMutation = useMutation({
    mutationFn: (number: string) => {
      if (!activeCall?.conversationId) {
        throw new Error('No active call to transfer');
      }
      return apiRequest('POST', `/api/softphone/calls/${activeCall.conversationId}/transfer`, { to: number });
    },
    onSuccess: () => {
      toast({
        title: "Transferencia iniciada",
        description: `Transfiriendo a ${transferNumber}...`,
      });
      setTransferNumber('');
      queryClient.invalidateQueries({ queryKey: ['/api/softphone/status'] });
    }
  });

  const addNoteMutation = useMutation({
    mutationFn: (note: string) => apiRequest('POST', `/api/conversations/${activeCall?.conversationId}/messages`, {
      content: note,
      type: 'note'
    }),
    onSuccess: () => {
      toast({
        title: "Nota agregada",
        description: "La nota se ha guardado en la conversación",
      });
      setCallNotes('');
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', activeCall?.conversationId] });
    }
  });

  const sendChatMutation = useMutation({
    mutationFn: (message: string) => apiRequest('POST', `/api/conversations/${activeCall?.conversationId}/messages`, {
      content: message,
      type: 'chat'
    }),
    onSuccess: () => {
      toast({
        title: "Mensaje enviado",
        description: "El mensaje se ha enviado al chat",
      });
      setChatMessage('');
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', activeCall?.conversationId] });
    }
  });

  const dialpadNumbers = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['*', '0', '#']
  ];

  const handleDialpadPress = (digit: string) => {
    setDialNumber(prev => prev + digit);
  };

  const handleDial = () => {
    if (!dialNumber.trim()) return;
    dialMutation.mutate(dialNumber);
  };

  const handleHold = () => {
    holdMutation.mutate();
  };

  const handleTransfer = () => {
    if (!transferNumber.trim()) return;
    transferMutation.mutate(transferNumber);
  };

  const handleAddNote = () => {
    if (!callNotes.trim() || !activeCall) return;
    addNoteMutation.mutate(callNotes);
  };

  const handleSendChat = () => {
    if (!chatMessage.trim() || !activeCall) return;
    sendChatMutation.mutate(chatMessage);
  };

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent className="max-h-[80vh]" data-testid="call-panel">
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5" />
            {activeCall ? `En llamada con ${activeCall.number}` : 'Panel de Llamadas'}
          </DrawerTitle>
        </DrawerHeader>

        <div className="px-6 pb-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="dial" data-testid="tab-dial">
                <Hash className="w-4 h-4 mr-2" />
                Marcar
              </TabsTrigger>
              <TabsTrigger value="controls" data-testid="tab-controls">
                <Phone className="w-4 h-4 mr-2" />
                Controles
              </TabsTrigger>
              <TabsTrigger value="notes" data-testid="tab-notes">
                <MessageSquare className="w-4 h-4 mr-2" />
                Notas
              </TabsTrigger>
              <TabsTrigger value="transfer" data-testid="tab-transfer">
                <Users className="w-4 h-4 mr-2" />
                Transferir
              </TabsTrigger>
            </TabsList>

            {/* Dial Tab */}
            <TabsContent value="dial" className="mt-6" data-testid="dial-content">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="dial-number">Número a llamar</Label>
                      <Input
                        id="dial-number"
                        value={dialNumber}
                        onChange={(e) => setDialNumber(e.target.value)}
                        placeholder="Ingresa el número"
                        className="text-center text-lg font-mono"
                        data-testid="input-dial-number"
                      />
                    </div>

                    {/* Dialpad */}
                    <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
                      {dialpadNumbers.map((row, rowIndex) =>
                        row.map((digit) => (
                          <Button
                            key={digit}
                            variant="outline"
                            size="lg"
                            className="h-12 text-lg font-semibold"
                            onClick={() => handleDialpadPress(digit)}
                            data-testid={`dialpad-${digit}`}
                          >
                            {digit}
                          </Button>
                        ))
                      )}
                    </div>

                    <Button 
                      onClick={handleDial}
                      disabled={!dialNumber.trim() || dialMutation.isPending}
                      className="w-full"
                      size="lg"
                      data-testid="button-dial"
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      {dialMutation.isPending ? 'Llamando...' : 'Llamar'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Controls Tab */}
            <TabsContent value="controls" className="mt-6" data-testid="controls-content">
              <Card>
                <CardContent className="p-6">
                  {activeCall ? (
                    <div className="space-y-4">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <User className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="font-semibold text-lg">{activeCall.number}</h3>
                        <p className="text-muted-foreground">{activeCall.status}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <Button
                          variant={activeCall.status === 'on-hold' ? 'default' : 'outline'}
                          onClick={handleHold}
                          disabled={holdMutation.isPending}
                          data-testid="button-hold"
                        >
                          {activeCall.status === 'on-hold' ? (
                            <><Play className="w-4 h-4 mr-2" />Reanudar</>
                          ) : (
                            <><Pause className="w-4 h-4 mr-2" />Pausar</>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => {/* TODO: Implement record */}}
                          data-testid="button-record"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Grabar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Phone className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No hay llamada activa</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notes Tab */}
            <TabsContent value="notes" className="mt-6" data-testid="notes-content">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="call-notes">Notas de la llamada</Label>
                      <Textarea
                        id="call-notes"
                        value={callNotes}
                        onChange={(e) => setCallNotes(e.target.value)}
                        placeholder="Agregar notas sobre la llamada..."
                        rows={4}
                        data-testid="textarea-call-notes"
                      />
                    </div>

                    <Button 
                      onClick={handleAddNote}
                      disabled={!callNotes.trim() || !activeCall || addNoteMutation.isPending}
                      className="w-full"
                      data-testid="button-add-note"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {addNoteMutation.isPending ? 'Guardando...' : 'Agregar Nota'}
                    </Button>

                    {/* Show existing messages */}
                    {conversation?.messages && conversation.messages.length > 0 && (
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        <h4 className="font-medium text-sm">Historial:</h4>
                        {conversation.messages.map((message: any) => (
                          <div 
                            key={message.id} 
                            className="p-3 bg-muted rounded-lg text-sm"
                            data-testid={`message-${message.id}`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{message.type === 'note' ? 'Nota' : 'Chat'}</span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p>{message.content}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transfer Tab */}
            <TabsContent value="transfer" className="mt-6" data-testid="transfer-content">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="transfer-number">Número de destino</Label>
                      <Input
                        id="transfer-number"
                        value={transferNumber}
                        onChange={(e) => setTransferNumber(e.target.value)}
                        placeholder="Número o extensión"
                        className="text-center text-lg font-mono"
                        data-testid="input-transfer-number"
                      />
                    </div>

                    <Button 
                      onClick={handleTransfer}
                      disabled={!transferNumber.trim() || !activeCall || transferMutation.isPending}
                      className="w-full"
                      size="lg"
                      data-testid="button-transfer"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      {transferMutation.isPending ? 'Transfiriendo...' : 'Transferir Llamada'}
                    </Button>

                    {!activeCall && (
                      <div className="text-center py-4 text-muted-foreground">
                        <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>No hay llamada para transferir</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}