import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone,
  MessageSquare,
  Search,
  Filter,
  Plus,
  AlertCircle,
  Mail,
  User,
  MoreHorizontal,
  StickyNote,
  Paperclip,
  Smile,
  Send,
  Trash2,
  FileText,
  Image,
  X,
  AtSign,
  RotateCcw,
  ArrowRight,
  Flag,
  Tag
} from "lucide-react";

interface Conversation {
  id: string;
  customerPhone: string;
  customerName?: string;
  subject?: string;
  status: string;
  channel?: string;
  priority?: string;
  assignedTo?: string;
  lastMessage?: string;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  conversationId: string;
  role: string;
  type: string;
  content: string;
  timestamp: string;
  agentName?: string;
}

interface ConversationWithMessages extends Conversation {
  messages: Message[];
}

export function OmnichannelInbox() {
  const [activeView, setActiveView] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageType, setMessageType] = useState<"reply" | "internal">("reply");
  const [showCreateViewDialog, setShowCreateViewDialog] = useState<boolean>(false);
  const [newViewName, setNewViewName] = useState<string>("");
  const [newViewShared, setNewViewShared] = useState<boolean>(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showMentions, setShowMentions] = useState<boolean>(false);
  const [mentionQuery, setMentionQuery] = useState<string>("");
  const [caretPosition, setCaretPosition] = useState<number>(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Build query params based on active view
  const buildQueryParams = () => {
    const params = new URLSearchParams();
    params.set("pageSize", "50");
    
    if (activeView !== "all") {
      params.set("view", activeView);
    }
    
    if (searchQuery.trim()) {
      params.set("q", searchQuery.trim());
    }
    
    return params.toString();
  };

  // Fetch conversations list
  const queryParams = buildQueryParams();
  const { data: conversationsData, isLoading: conversationsLoading } = useQuery<{
    conversations: Conversation[];
    total: number;
  }>({
    queryKey: ["/api/conversations", queryParams],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch conversation counts for all views
  const { data: viewCounts } = useQuery<Record<string, number>>({
    queryKey: ["/api/conversations/counts-by-view"],
    queryFn: getQueryFn({ on401: "throw" }),
    refetchInterval: 30000,
  });

  // Fetch saved views
  const { data: savedViews } = useQuery<any[]>({
    queryKey: ["/api/views"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Fetch team members for @mentions (mock data for now)
  const teamMembers = [
    { id: "1", name: "María García", email: "maria@gueswi.com" },
    { id: "2", name: "Carlos Rodriguez", email: "carlos@gueswi.com" },
    { id: "3", name: "Ana López", email: "ana@gueswi.com" },
    { id: "4", name: "Pedro Martín", email: "pedro@gueswi.com" },
  ].filter(member => 
    member.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  // Fetch selected conversation with messages
  const { data: selectedConversation, isLoading: messagesLoading } = useQuery<ConversationWithMessages>({
    queryKey: [`/api/conversations/${selectedConversationId}`],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!selectedConversationId,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content, type, role }: {
      conversationId: string;
      content: string;
      type: string;
      role: string;
    }) => {
      const res = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, {
        content,
        type,
        role,
      });
      return res.json();
    },
    onSuccess: () => {
      // Refresh the conversation messages
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConversationId}`] });
      // Refresh conversations list
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessageText("");
      toast({
        title: "Mensaje enviado",
        description: "El mensaje se ha enviado correctamente.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Error al enviar el mensaje",
        variant: "destructive",
      });
    },
  });

  // Create saved view mutation
  const createViewMutation = useMutation({
    mutationFn: async (data: { name: string; shared: boolean }) => {
      const res = await apiRequest("POST", "/api/views", {
        name: data.name,
        query: { view: activeView, search: searchQuery },
        shared: data.shared,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/views"] });
      setShowCreateViewDialog(false);
      setNewViewName("");
      setNewViewShared(false);
      toast({
        title: "Vista guardada",
        description: "La vista personalizada se ha guardado exitosamente.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al guardar vista",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete saved view mutation
  const deleteViewMutation = useMutation({
    mutationFn: async (viewId: string) => {
      await apiRequest("DELETE", `/api/views/${viewId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/views"] });
      toast({
        title: "Vista eliminada",
        description: "La vista personalizada se ha eliminado.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar vista",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update conversation mutation
  const updateConversationMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; status?: string; assigneeId?: string; priority?: string; notes?: string }) => {
      const res = await apiRequest("PATCH", `/api/conversations/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConversationId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Conversación actualizada", description: "Los cambios han sido guardados." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "No se pudo actualizar la conversación.", variant: "destructive" });
    },
  });

  // Close conversation mutation  
  const closeConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await apiRequest("POST", `/api/conversations/${conversationId}/close`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConversationId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Conversación cerrada", description: "La conversación ha sido cerrada exitosamente." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "No se pudo cerrar la conversación.", variant: "destructive" });
    },
  });

  // Reopen conversation mutation  
  const reopenConversationMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await apiRequest("POST", `/api/conversations/${conversationId}/reopen`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConversationId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Conversación reabierta", description: "La conversación ha sido reabierta exitosamente." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "No se pudo reabrir la conversación.", variant: "destructive" });
    },
  });

  // Add tags mutation
  const addTagsMutation = useMutation({
    mutationFn: async ({ conversationId, tags }: { conversationId: string; tags: string[] }) => {
      const res = await apiRequest("POST", `/api/conversations/${conversationId}/tags`, { tags });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConversationId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Etiquetas agregadas", description: "Las etiquetas han sido añadidas." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "No se pudieron agregar las etiquetas.", variant: "destructive" });
    },
  });

  // Remove tag mutation
  const removeTagMutation = useMutation({
    mutationFn: async ({ conversationId, tag }: { conversationId: string; tag: string }) => {
      const res = await apiRequest("DELETE", `/api/conversations/${conversationId}/tags/${encodeURIComponent(tag)}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/conversations/${selectedConversationId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Etiqueta eliminada", description: "La etiqueta ha sido eliminada." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "No se pudo eliminar la etiqueta.", variant: "destructive" });
    },
  });

  // Fetch team members for assignee selector
  const { data: realTeamMembers } = useQuery<any[]>({
    queryKey: ["/api/team-members"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  const handleSendMessage = () => {
    if (!selectedConversationId || !messageText.trim()) return;

    sendMessageMutation.mutate({
      conversationId: selectedConversationId,
      content: messageText.trim(),
      type: messageType === "internal" ? "internal" : "outgoing",
      role: messageType === "internal" ? "internal" : "agent",
    });
  };

  const conversations = conversationsData?.conversations || [];
  const totalCount = viewCounts?.all || conversationsData?.total || 0;

  // Auto-select first conversation if none selected
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [selectedConversationId, conversations]);

  return (
    <div className="flex h-[calc(100vh-200px)]">
      {/* Left Sidebar - Views */}
      <div className="w-72 border-r bg-muted/30 flex flex-col" data-testid="sidebar-views">
        <div className="p-4 border-b">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Vistas</h3>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="p-2 space-y-1">
            {[
              { id: 'all', name: 'Todas', count: viewCounts?.all || conversationsData?.total || 0 },
              { id: 'mine', name: 'Asignadas a mí', count: viewCounts?.mine || 0 },
              { id: 'unassigned', name: 'Sin asignar', count: viewCounts?.unassigned || 0 },
              { id: 'mentioned', name: 'Con menciones', count: viewCounts?.mentioned || 0 },
              { id: 'closed', name: 'Cerradas', count: viewCounts?.closed || 0 }
            ].map((view) => (
              <Button
                key={view.id}
                variant={activeView === view.id ? "secondary" : "ghost"}
                className="w-full justify-between text-left h-8"
                onClick={() => setActiveView(view.id)}
                data-testid={`view-${view.id}`}
              >
                <span className="text-sm">{view.name}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {view.count}
                </Badge>
              </Button>
            ))}
          </div>
          
          <div className="p-2 mt-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-xs text-muted-foreground uppercase tracking-wide">Vistas guardadas</h4>
              <Dialog open={showCreateViewDialog} onOpenChange={setShowCreateViewDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0" data-testid="button-add-view">
                    <Plus className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Guardar vista personalizada</DialogTitle>
                    <DialogDescription>
                      Guarda la configuración actual de filtros como una vista personalizada.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Input
                        placeholder="Nombre de la vista"
                        value={newViewName}
                        onChange={(e) => setNewViewName(e.target.value)}
                        data-testid="input-view-name"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        id="shared"
                        checked={newViewShared}
                        onChange={(e) => setNewViewShared(e.target.checked)}
                      />
                      <label htmlFor="shared" className="text-sm">Compartir con el equipo</label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowCreateViewDialog(false)}
                      data-testid="button-cancel-view"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={() => createViewMutation.mutate({ name: newViewName, shared: newViewShared })}
                      disabled={!newViewName.trim() || createViewMutation.isPending}
                      data-testid="button-save-view"
                    >
                      Guardar vista
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            {/* Saved Views List */}
            <div className="space-y-1">
              {savedViews && savedViews.length > 0 ? (
                savedViews.map((view) => (
                  <div key={view.id} className="flex items-center justify-between group">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex-1 justify-start text-left h-7 text-xs"
                      onClick={() => {
                        const query = view.query || {};
                        setActiveView(query.view || "all");
                        setSearchQuery(query.search || "");
                      }}
                      data-testid={`saved-view-${view.id}`}
                    >
                      <span className="truncate">{view.name}</span>
                      {view.shared && (
                        <span className="ml-1 text-xs text-muted-foreground">🔗</span>
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => deleteViewMutation.mutate(view.id)}
                      data-testid={`delete-view-${view.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground px-2">No hay vistas guardadas</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Middle Panel - Conversation List */}
      <div className="w-96 border-r flex flex-col" data-testid="conversation-list">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Todas las conversaciones</h2>
            <Button size="sm" variant="outline" data-testid="button-new-conversation">
              <Plus className="h-4 w-4 mr-2" />
              Nueva
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conversaciones..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-conversations"
            />
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button size="sm" variant="outline" className="text-xs">
              <Filter className="h-3 w-3 mr-1" />
              Filtros
            </Button>
            <Button size="sm" variant="outline" className="text-xs">
              Estado
            </Button>
            <Button size="sm" variant="outline" className="text-xs">
              Canal
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {conversationsLoading ? (
            // Loading skeleton
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-4 w-4 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No hay conversaciones</h3>
                <p className="text-muted-foreground">Inicia una nueva conversación para comenzar.</p>
              </div>
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-4 border-b hover:bg-muted/50 cursor-pointer ${
                  conversation.id === selectedConversationId ? 'bg-accent/50' : ''
                }`}
                onClick={() => setSelectedConversationId(conversation.id)}
                data-testid={`conversation-item-${conversation.id}`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    {conversation.channel === 'voice' && <Phone className="h-4 w-4 text-blue-500" />}
                    {conversation.channel === 'whatsapp' && <MessageSquare className="h-4 w-4 text-green-500" />}
                    {conversation.channel === 'email' && <Mail className="h-4 w-4 text-gray-500" />}
                    {(!conversation.channel || conversation.channel === 'phone') && <Phone className="h-4 w-4 text-blue-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm truncate">
                        {conversation.customerName || conversation.customerPhone}
                      </h4>
                      <div className="flex items-center gap-2">
                        {conversation.priority === 'high' && (
                          <AlertCircle className="h-3 w-3 text-red-500" />
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(conversation.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {(conversation.unreadCount || 0) > 0 && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1 truncate">
                      {conversation.subject || "Conversación"}
                    </p>
                    <p className="text-sm text-foreground/80 truncate">
                      {conversation.lastMessage || "Sin mensajes"}
                    </p>
                    {conversation.assignedTo && (
                      <div className="flex items-center mt-2">
                        <User className="h-3 w-3 text-muted-foreground mr-1" />
                        <span className="text-xs text-muted-foreground">
                          {conversation.assignedTo}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Conversation Thread */}
      <div className="flex-1 flex flex-col" data-testid="conversation-thread">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-blue-500" />
                  <div>
                    <h3 className="font-semibold">
                      {selectedConversation.customerName || selectedConversation.customerPhone}
                    </h3>
                    <p className="text-sm text-muted-foreground">{selectedConversation.customerPhone}</p>
                  </div>
                  {selectedConversation.priority === 'high' && (
                    <Badge variant="outline" className="text-xs">
                      <AlertCircle className="h-3 w-3 mr-1 text-red-500" />
                      Alta prioridad
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select defaultValue={selectedConversation.status}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Abierta</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="resolved">Resuelta</SelectItem>
                      <SelectItem value="closed">Cerrada</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select defaultValue="">
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Asignar a..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ana">Ana López</SelectItem>
                      <SelectItem value="carlos">Carlos Ruiz</SelectItem>
                      <SelectItem value="me">Asignarme a mí</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="sm" variant="outline">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4" data-testid="messages-container">
              {messagesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex justify-start">
                      <div className="max-w-[80%]">
                        <Skeleton className="h-16 w-64 rounded-lg" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : selectedConversation.messages?.length > 0 ? (
                selectedConversation.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.type === 'outgoing' || message.type === 'internal' ? 'justify-end' : 'justify-start'
                    }`}
                    data-testid={`message-${message.id}`}
                  >
                    <div className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'incoming' ? 'bg-muted' :
                      message.type === 'outgoing' ? 'bg-primary text-primary-foreground' :
                      message.type === 'internal' ? 'bg-amber-100 border border-amber-200 text-amber-900' :
                      'bg-gray-100 text-center w-full max-w-none py-2 text-xs text-muted-foreground'
                    }`}>
                      {message.type === 'system' ? (
                        <p>{message.content}</p>
                      ) : (
                        <>
                          {message.type === 'internal' && (
                            <div className="flex items-center gap-2 mb-2">
                              <MessageSquare className="h-3 w-3" />
                              <span className="text-xs font-medium">Nota interna</span>
                            </div>
                          )}
                          <p className="text-sm">{message.content}</p>
                          <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                            <span>
                              {message.agentName || (message.role === 'customer' ? 'Cliente' : '')}
                            </span>
                            <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2">No hay mensajes</h3>
                    <p className="text-muted-foreground">Inicia la conversación enviando un mensaje.</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-muted/30" data-testid="composer-container">
              <div className="flex items-center gap-2 mb-3">
                <Button 
                  size="sm" 
                  variant={messageType === "reply" ? "secondary" : "outline"} 
                  className="text-xs"
                  onClick={() => setMessageType("reply")}
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Responder
                </Button>
                <Button 
                  size="sm" 
                  variant={messageType === "internal" ? "secondary" : "outline"} 
                  className="text-xs"
                  onClick={() => setMessageType("internal")}
                >
                  <StickyNote className="h-3 w-3 mr-1" />
                  Nota interna
                </Button>
              </div>
              <div className="relative">
                <Textarea
                  placeholder={messageType === "internal" ? "Escribe una nota interna... (@ para mencionar)" : "Escribe tu respuesta... (@ para mencionar)"}
                  className="resize-none pr-20"
                  rows={3}
                  value={messageText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                      handleSendMessage();
                    }
                  }}
                  data-testid="textarea-message-composer"
                />
                
                {/* @Mentions Dropdown */}
                {showMentions && teamMembers.length > 0 && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="px-3 py-2 hover:bg-accent cursor-pointer flex items-center gap-2"
                        onClick={() => {
                          const beforeAt = messageText.slice(0, caretPosition);
                          const afterMention = messageText.slice(caretPosition + 1 + mentionQuery.length);
                          const newText = beforeAt + `@${member.name} ` + afterMention;
                          setMessageText(newText);
                          setShowMentions(false);
                        }}
                        data-testid={`mention-${member.id}`}
                      >
                        <AtSign className="h-3 w-3 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <label htmlFor="file-upload">
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" asChild>
                      <span className="cursor-pointer">
                        <Paperclip className="h-3 w-3" />
                      </span>
                    </Button>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.gif"
                      data-testid="file-upload-input"
                    />
                  </label>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
                    <Smile className="h-3 w-3" />
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendMessageMutation.isPending}
                    data-testid="button-send-message"
                  >
                    {sendMessageMutation.isPending ? (
                      <div className="animate-spin h-3 w-3 border-2 border-current border-t-transparent rounded-full" />
                    ) : (
                      <Send className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-medium mb-2">Selecciona una conversación</h3>
              <p className="text-muted-foreground">Elige una conversación del panel izquierdo para ver los mensajes.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}