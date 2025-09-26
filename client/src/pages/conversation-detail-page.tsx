import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Phone, 
  Clock, 
  User, 
  Bot, 
  MessageSquare,
  StickyNote,
  Settings,
  ExternalLink,
  Save
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type Conversation, type Message } from "@shared/schema";

export default function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const [notesChanged, setNotesChanged] = useState(false);

  const { data: conversation, isLoading } = useQuery({
    queryKey: ['/api/conversations', id],
    queryFn: async () => {
      const response = await fetch(`/api/conversations/${id}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Conversation not found');
        }
        throw new Error('Failed to fetch conversation');
      }
      const data = await response.json();
      setNotes(data.notes || "");
      return data;
    },
    enabled: !!id
  });

  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      if (!conversation) throw new Error('No conversation');
      const updatedConversation = await apiRequest('POST', `/api/calls/${conversation.callId}/notes`, { notes: newNotes });
      return updatedConversation;
    },
    onSuccess: () => {
      toast({
        title: "Notas guardadas",
        description: "Las notas se han actualizado correctamente."
      });
      setNotesChanged(false);
      // Invalidate both the specific conversation detail and the conversations list
      queryClient.invalidateQueries({ queryKey: ['/api/conversations', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudieron guardar las notas. Intenta de nuevo.",
        variant: "destructive"
      });
    }
  });

  const handleNotesChange = (value: string) => {
    setNotes(value);
    setNotesChanged(value !== (conversation?.notes || ""));
  };

  const handleSaveNotes = () => {
    updateNotesMutation.mutate(notes);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'ended': 'secondary',
      'answered': 'default', 
      'ringing': 'destructive',
      'active': 'default'
    } as const;
    
    const labels = {
      'ended': 'Finalizada',
      'answered': 'Respondida',
      'ringing': 'Sonando', 
      'active': 'Activa'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getMessageIcon = (from: string) => {
    switch (from) {
      case 'customer':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'agent':
        return <MessageSquare className="h-4 w-4 text-green-500" />;
      case 'ai':
        return <Bot className="h-4 w-4 text-purple-500" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getMessageLabel = (from: string) => {
    const labels = {
      'customer': 'Cliente',
      'agent': 'Agente',
      'ai': 'IA'
    };
    return labels[from as keyof typeof labels] || from;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-4">Conversación no encontrada</h1>
          <Link href="/dashboard/conversaciones">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a conversaciones
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/conversaciones">
          <Button variant="outline" size="sm" data-testid="button-back-to-conversations">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Conversaciones
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold" data-testid="text-conversation-title">
            Conversación con {conversation.phoneNumber || 'Número no disponible'}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span data-testid="text-call-id">ID: {conversation.callId}</span>
            <span data-testid="text-conversation-created">
              {format(new Date(conversation.createdAt), "PPpp", { locale: es })}
            </span>
          </div>
        </div>
        {getStatusBadge(conversation.status)}
      </div>

      {/* Call Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Número</p>
                <p className="font-medium" data-testid="text-phone-number">
                  {conversation.phoneNumber || 'No disponible'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Duración</p>
                <p className="font-medium" data-testid="text-call-duration">
                  {conversation.duration ? formatDuration(conversation.duration) : 'N/A'}
                </p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Iniciada</p>
              <p className="font-medium" data-testid="text-call-started">
                {formatDistanceToNow(new Date(conversation.startedAt), { 
                  addSuffix: true, 
                  locale: es 
                })}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <div className="mt-1">
                {getStatusBadge(conversation.status)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="transcript" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="transcript" data-testid="tab-transcript">
            <MessageSquare className="h-4 w-4 mr-2" />
            Transcripción
          </TabsTrigger>
          <TabsTrigger value="notes" data-testid="tab-notes">
            <StickyNote className="h-4 w-4 mr-2" />
            Notas
          </TabsTrigger>
          <TabsTrigger value="actions" data-testid="tab-actions">
            <Settings className="h-4 w-4 mr-2" />
            Acciones
          </TabsTrigger>
        </TabsList>

        {/* Transcript Panel */}
        <TabsContent value="transcript">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Transcripción de la llamada
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!conversation.messages?.length ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p data-testid="text-no-messages">No hay transcripción disponible para esta conversación.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {conversation.messages.map((message: Message, index: number) => (
                    <div key={message.id} className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getMessageIcon(message.from)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium" data-testid={`text-message-from-${index}`}>
                            {getMessageLabel(message.from)}
                          </span>
                          <span className="text-xs text-muted-foreground" data-testid={`text-message-time-${index}`}>
                            {format(new Date(message.timestamp), "HH:mm:ss")}
                          </span>
                        </div>
                        <p className="text-sm" data-testid={`text-message-content-${index}`}>
                          {message.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Panel */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <StickyNote className="h-5 w-5" />
                  Notas de la conversación
                </CardTitle>
                {notesChanged && (
                  <Button 
                    onClick={handleSaveNotes}
                    disabled={updateNotesMutation.isPending}
                    data-testid="button-save-notes"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateNotesMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Añade notas sobre esta conversación..."
                value={notes}
                onChange={(e) => handleNotesChange(e.target.value)}
                className="min-h-[200px]"
                data-testid="textarea-notes"
              />
              {notesChanged && (
                <p className="text-sm text-muted-foreground mt-2">
                  Tienes cambios sin guardar
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Actions Panel */}
        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Acciones disponibles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4">
                <Button variant="outline" className="justify-start" disabled data-testid="button-transfer-call">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Transferir llamada
                  <Badge variant="secondary" className="ml-auto">Próximamente</Badge>
                </Button>
                
                <Button variant="outline" className="justify-start" disabled data-testid="button-create-ticket">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Crear ticket de soporte
                  <Badge variant="secondary" className="ml-auto">Próximamente</Badge>
                </Button>

                <Separator />
                
                <div className="text-sm text-muted-foreground">
                  <p>Más acciones estarán disponibles en futuras actualizaciones:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Programar llamada de seguimiento</li>
                    <li>Enviar resumen por email</li>
                    <li>Exportar transcripción</li>
                    <li>Marcar como resuelto</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}