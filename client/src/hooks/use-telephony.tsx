import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { 
  Extension, 
  IvrMenu, 
  Queue, 
  Recording,
  InsertExtension,
  InsertIvrMenu,
  InsertQueue 
} from "@shared/schema";

// Types for API responses with pagination
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ExtensionFilters {
  status?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

interface RecordingFilters {
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// Extensions hooks
export function useExtensions(filters: ExtensionFilters = {}) {
  const params = new URLSearchParams();
  if (filters.status) params.append('status', filters.status);
  if (filters.q) params.append('q', filters.q);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
  
  const queryString = params.toString();
  const queryKey = queryString 
    ? ["/api/extensions", queryString] 
    : ["/api/extensions"];

  return useQuery<PaginatedResponse<Extension>>({
    queryKey,
    queryFn: getQueryFn({ on401: "throw" }),
  });
}

export function useCreateExtension() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (extension: Omit<InsertExtension, 'sipPassword'>) => {
      const res = await apiRequest("POST", "/api/extensions", extension);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Extensión creada",
        description: "La extensión se ha creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/extensions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear extensión",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateExtension() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertExtension> }) => {
      const res = await apiRequest("PATCH", `/api/extensions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Extensión actualizada",
        description: "La extensión se ha actualizado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/extensions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar extensión",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteExtension() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/extensions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Extensión eliminada",
        description: "La extensión se ha eliminado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/extensions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al eliminar extensión",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useResetExtensionPin() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/extensions/${id}/reset-pin`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "PIN reiniciado",
        description: `Nuevo PIN: ${data.newPin}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/extensions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al reiniciar PIN",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// IVR hooks
export function useIvrs() {
  return useQuery<IvrMenu[]>({
    queryKey: ["/api/ivrs"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
}

export function useCreateIvr() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (ivr: InsertIvrMenu) => {
      const res = await apiRequest("POST", "/api/ivrs", ivr);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "IVR creado",
        description: "El menú IVR se ha creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ivrs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear IVR",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateIvr() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertIvrMenu> }) => {
      const res = await apiRequest("PATCH", `/api/ivrs/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "IVR actualizado",
        description: "El menú IVR se ha actualizado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/ivrs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar IVR",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Queue hooks
export function useQueues() {
  return useQuery<Queue[]>({
    queryKey: ["/api/queues"],
    queryFn: getQueryFn({ on401: "throw" }),
  });
}

export function useCreateQueue() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (data: InsertQueue) => {
      const res = await apiRequest("POST", "/api/queues", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cola creada",
        description: "La cola se ha creado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al crear cola",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useUpdateQueue() {
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InsertQueue> }) => {
      const res = await apiRequest("PATCH", `/api/queues/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cola actualizada",
        description: "La cola se ha actualizado exitosamente.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/queues"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error al actualizar cola",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Recordings hooks
export function useRecordings(filters: RecordingFilters = {}) {
  const params = new URLSearchParams();
  if (filters.from) params.append('from', filters.from);
  if (filters.to) params.append('to', filters.to);
  if (filters.page) params.append('page', filters.page.toString());
  if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());
  
  const queryString = params.toString();
  const queryKey = queryString 
    ? ["/api/recordings", queryString] 
    : ["/api/recordings"];

  return useQuery<PaginatedResponse<Recording>>({
    queryKey,
    queryFn: getQueryFn({ on401: "throw" }),
  });
}