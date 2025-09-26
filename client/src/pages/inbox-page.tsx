import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Archive, Clock, User, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const conversationViews = [
  { id: 'open', name: 'Open', count: 12, active: true },
  { id: 'mine', name: 'Mine', count: 5, active: false },
  { id: 'unassigned', name: 'Unassigned', count: 3, active: false },
  { id: 'closed', name: 'Closed', count: 45, active: false },
];

const mockConversations = [
  {
    id: '1',
    contact: 'Juan Pérez',
    lastMessage: 'Hola, necesito ayuda con mi facturación',
    timestamp: '10:30 AM',
    status: 'open',
    channel: 'phone',
    unread: 2
  },
  {
    id: '2', 
    contact: 'María González',
    lastMessage: 'Gracias por la atención',
    timestamp: '09:45 AM',
    status: 'closed',
    channel: 'chat',
    unread: 0
  },
  {
    id: '3',
    contact: '+58 414 123 4567',
    lastMessage: 'Llamada perdida',
    timestamp: '09:15 AM', 
    status: 'open',
    channel: 'phone',
    unread: 1
  }
];

export default function InboxPage() {
  const [selectedView, setSelectedView] = useState('open');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="h-full flex bg-gray-50 dark:bg-gray-900" data-testid="inbox-page">
      {/* Left Panel - Views and Filters */}
      <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar conversaciones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-conversations"
            />
          </div>
        </div>

        {/* Views */}
        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Vistas</h3>
          <div className="space-y-1">
            {conversationViews.map((view) => (
              <button
                key={view.id}
                onClick={() => setSelectedView(view.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors",
                  selectedView === view.id
                    ? "bg-primary text-white"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                data-testid={`view-${view.id}`}
              >
                <span>{view.name}</span>
                <Badge variant={selectedView === view.id ? "secondary" : "outline"} className="text-xs">
                  {view.count}
                </Badge>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="flex-1">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
            <Button variant="outline" size="sm">
              <Archive className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Center Panel - Conversation List */}
      <div className="w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Conversaciones ({mockConversations.length})
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto">
          {mockConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className={cn(
                "p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700",
                selectedConversation === conversation.id && "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700"
              )}
              data-testid={`conversation-${conversation.id}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {conversation.contact}
                    </h4>
                    {conversation.unread > 0 && (
                      <Badge className="bg-blue-600 text-xs">{conversation.unread}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-1">
                    {conversation.lastMessage}
                  </p>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {conversation.channel === 'phone' ? '📞' : '💬'} {conversation.channel}
                    </Badge>
                    <span className="text-xs text-gray-400">{conversation.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Messages and Contact Details */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                      {mockConversations.find(c => c.id === selectedConversation)?.contact}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Última actividad hace 5 min</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">Transferir</Button>
                  <Button variant="outline" size="sm">Cerrar</Button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
              <div className="space-y-4">
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-3 max-w-xs shadow-sm">
                    <p className="text-sm text-gray-900 dark:text-white">
                      Hola, necesito ayuda con mi facturación
                    </p>
                    <p className="text-xs text-gray-500 mt-1">10:30 AM</p>
                  </div>
                </div>
                <div className="flex justify-end">
                  <div className="bg-primary text-white rounded-lg p-3 max-w-xs">
                    <p className="text-sm">
                      Hola, claro que te puedo ayudar. ¿Cuál es tu consulta específica sobre la facturación?
                    </p>
                    <p className="text-xs opacity-75 mt-1">10:32 AM</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-2">
                <Input
                  placeholder="Escribe tu mensaje..."
                  className="flex-1"
                  data-testid="input-message"
                />
                <Button data-testid="button-send-message">
                  <MessageSquare className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Selecciona una conversación
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Elige una conversación de la lista para ver los mensajes
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}