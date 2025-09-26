import { useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone, Clock, Filter, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { type Conversation } from "@shared/schema";

export default function ConversationsPage() {
  const [page, setPage] = useState(1);
  const [type, setType] = useState("call");
  const [search, setSearch] = useState("");
  const pageSize = 10;

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['/api/conversations', { page, pageSize, type, search }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        type
      });
      if (search.trim()) {
        params.append('search', search.trim());
      }
      const response = await fetch(`/api/conversations?${params}`);
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json();
    }
  });

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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-conversations-title">Conversaciones</h1>
          <p className="text-muted-foreground">
            Historial de llamadas y transcripciones
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-medium">Filtros</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por número de teléfono..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-conversations"
                />
              </div>
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-40" data-testid="select-conversation-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="call">Llamadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Conversations List */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !conversations?.data?.length ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-no-conversations">
              No hay conversaciones
            </h3>
            <p className="text-muted-foreground">
              Las conversaciones aparecerán aquí después de realizar llamadas.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {conversations.data.map((conversation: Conversation) => (
            <Card key={conversation.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Phone className="h-4 w-4 text-primary" />
                      <span className="font-medium" data-testid={`text-phone-${conversation.id}`}>
                        {conversation.phoneNumber || 'Número no disponible'}
                      </span>
                      {getStatusBadge(conversation.status)}
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span data-testid={`text-created-${conversation.id}`}>
                          {formatDistanceToNow(new Date(conversation.createdAt), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </span>
                      </div>
                      {conversation.duration && (
                        <span data-testid={`text-duration-${conversation.id}`}>
                          Duración: {formatDuration(conversation.duration)}
                        </span>
                      )}
                    </div>

                    {conversation.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {conversation.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Link href={`/dashboard/conversaciones/${conversation.id}`}>
                      <Button variant="outline" size="sm" data-testid={`button-view-conversation-${conversation.id}`}>
                        Ver conversación
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {conversations.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                data-testid="button-prev-page"
              >
                Anterior
              </Button>
              <span className="px-4 py-2 text-sm">
                Página {page} de {conversations.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(conversations.totalPages, p + 1))}
                disabled={page === conversations.totalPages}
                data-testid="button-next-page"
              >
                Siguiente
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}