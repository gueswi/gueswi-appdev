import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

interface WebSocketMessage {
  type: 'broadcast' | 'authenticated';
  channel?: string;
  data?: any;
  timestamp?: string;
  tenantId?: string;
}

interface UseWebSocketOptions {
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
    heartbeatInterval = 30000
  } = options;

  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [lastError, setLastError] = useState<string | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const isReconnecting = useRef(false);

  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isAuthenticated = !!user;
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (!isAuthenticated || !user?.tenantId || isReconnecting.current) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      console.log('🔌 Connecting to WebSocket:', wsUrl);
      setConnectionState('connecting');
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🔐 WebSocket connected, authenticating...');
        reconnectAttempts.current = 0;
        setConnectionState('connected');
        setLastError(null);

        // Send authentication message (simplified for development)
        ws.send(JSON.stringify({
          type: 'authenticate',
          tenantId: user.tenantId
        }));

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, heartbeatInterval);
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          if (message.type === 'authenticated') {
            console.log('✅ WebSocket authenticated for tenant:', message.tenantId);
            return;
          }

          if (message.type === 'broadcast' && message.channel && message.data) {
            handleBroadcastMessage(message.channel, message.data);
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setConnectionState('disconnected');
        
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Attempt reconnection if not manually closed
        if (!isReconnecting.current && event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          isReconnecting.current = true;
          reconnectAttempts.current++;
          
          console.log(`🔄 Reconnecting... Attempt ${reconnectAttempts.current}/${maxReconnectAttempts}`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            isReconnecting.current = false;
            connect();
          }, reconnectDelay);
        }
      };

      ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        setConnectionState('error');
        setLastError('WebSocket connection error');
      };

    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setConnectionState('error');
      setLastError('Failed to create WebSocket connection');
    }
  }, [isAuthenticated, user?.tenantId, user?.id, reconnectDelay, maxReconnectAttempts, heartbeatInterval]);

  const handleBroadcastMessage = useCallback((channel: string, data: any) => {
    console.log('📨 WebSocket broadcast received:', channel, data);

    switch (channel) {
      case 'conversations:updated':
        if (data.conversation) {
          // Update conversation in cache
          queryClient.setQueryData(
            ['/api/conversations', data.conversation.id],
            data.conversation
          );
          
          // Update conversations list
          queryClient.invalidateQueries({
            queryKey: ['/api/conversations']
          });
          
          toast({
            title: "Conversación actualizada",
            description: "La conversación ha sido actualizada en tiempo real."
          });
        }
        break;

      case 'conversations:closed':
        if (data.conversation) {
          queryClient.setQueryData(
            ['/api/conversations', data.conversation.id],
            data.conversation
          );
          
          queryClient.invalidateQueries({
            queryKey: ['/api/conversations']
          });
          
          toast({
            title: "Conversación cerrada",
            description: "La conversación ha sido cerrada."
          });
        }
        break;

      case 'conversations:reopened':
        if (data.conversation) {
          queryClient.setQueryData(
            ['/api/conversations', data.conversation.id],
            data.conversation
          );
          
          queryClient.invalidateQueries({
            queryKey: ['/api/conversations']
          });
          
          toast({
            title: "Conversación reabierta",
            description: "La conversación ha sido reabierta."
          });
        }
        break;

      case 'conversations:tags-added':
        if (data.conversation && data.addedTags) {
          queryClient.setQueryData(
            ['/api/conversations', data.conversation.id],
            data.conversation
          );
          
          queryClient.invalidateQueries({
            queryKey: ['/api/conversations']
          });
          
          toast({
            title: "Etiquetas agregadas",
            description: `Se agregaron las etiquetas: ${data.addedTags.join(', ')}`
          });
        }
        break;

      case 'conversations:tag-removed':
        if (data.conversation && data.removedTag) {
          queryClient.setQueryData(
            ['/api/conversations', data.conversation.id],
            data.conversation
          );
          
          queryClient.invalidateQueries({
            queryKey: ['/api/conversations']
          });
          
          toast({
            title: "Etiqueta eliminada",
            description: `Se eliminó la etiqueta: ${data.removedTag}`
          });
        }
        break;

      case 'messages:new':
        if (data.message) {
          // Invalidate conversation messages and list
          queryClient.invalidateQueries({
            queryKey: ['/api/conversations', data.message.conversationId, 'messages']
          });
          
          queryClient.invalidateQueries({
            queryKey: ['/api/conversations']
          });
        }
        break;

      default:
        console.log('📨 Unknown broadcast channel:', channel, data);
    }
  }, [queryClient, toast]);

  const disconnect = useCallback(() => {
    isReconnecting.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
    }
    
    setConnectionState('disconnected');
  }, []);

  // Auto-connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.tenantId) {
      connect();
    } else {
      disconnect();
    }

    return () => disconnect();
  }, [isAuthenticated, user?.tenantId, connect, disconnect]);

  return {
    connectionState,
    lastError,
    connect,
    disconnect,
    isConnected: connectionState === 'connected'
  };
}