import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Search, 
  Plus, 
  Phone, 
  Settings, 
  RotateCcw,
  Edit,
  Trash2,
  Play,
  Pause,
  Download,
  Users,
  Volume2
} from "lucide-react";
import { 
  useExtensions, 
  useIvrs, 
  useQueues, 
  useRecordings,
  useCreateExtension,
  useUpdateExtension,
  useDeleteExtension,
  useResetExtensionPin,
  useCreateQueue
} from "@/hooks/use-telephony";
import { ExtensionModal } from "@/components/telephony/extension-modal";
import { IvrModal } from "@/components/telephony/ivr-modal";
import { AudioPlayer } from "@/components/telephony/audio-player";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useUrlState } from "@/hooks/use-url-state";
import { 
  ExtensionsTableSkeleton, 
  RecordingsTableSkeleton, 
  IvrCardsSkeleton, 
  QueueCardsSkeleton 
} from "@/components/telephony/loading-states";
import { 
  ExtensionsEmptyState, 
  IvrsEmptyState, 
  QueuesEmptyState, 
  RecordingsEmptyState,
  ErrorState 
} from "@/components/telephony/empty-states";
import { PaginationControls } from "@/components/ui/pagination-controls";
import type { Extension, IvrMenu } from "@shared/schema";

function ExtensionsTab() {
  const { getParam, getNumberParam, setParam, setMultipleParams } = useUrlState();
  
  const search = getParam("search", "");
  const status = getParam("status", "");
  const page = getNumberParam("page", 1);
  
  const [extensionModal, setExtensionModal] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    extension?: Extension | null;
  }>({ isOpen: false, mode: "create", extension: null });
  const pageSize = 10;

  const { data: extensionsData, isLoading } = useExtensions({
    q: search,
    status: status || undefined,
    page,
    pageSize,
  });


  // Bounds checking for pagination - ensure page is within valid range (always >=1)
  const validExtensionsPage = Math.max(1, Math.min(page, extensionsData?.totalPages ?? 1));

  // Automatically correct page if it's out of bounds (use effect to avoid render-time mutations)
  useEffect(() => {
    if (!isLoading && page !== validExtensionsPage) {
      setParam("page", validExtensionsPage);
    }
  }, [isLoading, page, validExtensionsPage, setParam]);

  const createExtensionMutation = useCreateExtension();
  const updateExtensionMutation = useUpdateExtension();
  const deleteExtensionMutation = useDeleteExtension();
  const resetPinMutation = useResetExtensionPin();

  const openCreateModal = () => {
    setExtensionModal({ isOpen: true, mode: "create", extension: null });
  };

  const openEditModal = (extension: Extension) => {
    setExtensionModal({ isOpen: true, mode: "edit", extension });
  };

  const closeModal = () => {
    setExtensionModal({ isOpen: false, mode: "create", extension: null });
  };

  const handleDelete = async (extensionId: string) => {
    if (confirm("¿Estás seguro de que quieres eliminar esta extensión?")) {
      deleteExtensionMutation.mutate(extensionId);
    }
  };

  const handleResetPin = (extensionId: string) => {
    if (confirm("¿Estás seguro de que quieres reiniciar el PIN de esta extensión?")) {
      resetPinMutation.mutate(extensionId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Extensiones</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona las extensiones telefónicas de tu organización
          </p>
        </div>
        <Button onClick={openCreateModal} data-testid="button-create-extension">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Extensión
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar extensiones..."
            value={search}
            onChange={(e) => setParam("search", e.target.value)}
            className="pl-8"
            data-testid="input-search-extensions"
          />
        </div>
        <Select value={status} onValueChange={(value) => setParam("status", value)}>
          <SelectTrigger className="w-40" data-testid="select-status-filter">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ACTIVE">Activas</SelectItem>
            <SelectItem value="INACTIVE">Inactivas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Extensions Table */}
      {isLoading ? (
        <ExtensionsTableSkeleton />
      ) : extensionsData?.data.length === 0 ? (
        <ExtensionsEmptyState onCreateExtension={openCreateModal} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Extensión</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>SIP</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {
                extensionsData?.data.map((extension) => (
                  <TableRow key={extension.id} data-testid={`row-extension-${extension.id}`}>
                    <TableCell className="font-medium">
                      {extension.number}
                    </TableCell>
                    <TableCell>{extension.userName || "Sin asignar"}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={extension.status === "ACTIVE" ? "default" : "secondary"}
                        data-testid={`badge-status-${extension.id}`}
                      >
                        {extension.status === "ACTIVE" ? "Activa" : "Inactiva"}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {extension.number}@gueswi.com
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditModal(extension)}
                          data-testid={`button-edit-${extension.id}`}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleResetPin(extension.id)}
                          disabled={resetPinMutation.isPending}
                          data-testid={`button-reset-pin-${extension.id}`}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(extension.id)}
                          disabled={deleteExtensionMutation.isPending}
                          data-testid={`button-delete-${extension.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      {/* Pagination */}
      <PaginationControls
        currentPage={validExtensionsPage}
        totalPages={extensionsData?.totalPages}
        isLoading={isLoading}
        onPageChange={(newPage) => setParam("page", newPage)}
        testIdPrefix="extensions"
        showFirstLast={true}
        showPageInput={true}
        className="mt-4"
      />

      <ExtensionModal
        isOpen={extensionModal.isOpen}
        onClose={closeModal}
        extension={extensionModal.extension}
        mode={extensionModal.mode}
      />
    </div>
  );
}

function IvrsTab() {
  const { data: ivrs, isLoading } = useIvrs();
  
  const [ivrModal, setIvrModal] = useState<{
    isOpen: boolean;
    mode: "create" | "edit";
    ivr?: IvrMenu | null;
  }>({ isOpen: false, mode: "create", ivr: null });

  const openCreateIvrModal = () => {
    setIvrModal({ isOpen: true, mode: "create", ivr: null });
  };

  const openEditIvrModal = (ivr: IvrMenu) => {
    setIvrModal({ isOpen: true, mode: "edit", ivr });
  };

  const closeIvrModal = () => {
    setIvrModal({ isOpen: false, mode: "create", ivr: null });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Menús IVR</h3>
          <p className="text-sm text-muted-foreground">
            Configura los menús de respuesta automática
          </p>
        </div>
        <Button onClick={openCreateIvrModal} data-testid="button-create-ivr">
          <Plus className="h-4 w-4 mr-2" />
          Nuevo IVR
        </Button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <IvrCardsSkeleton />
        ) : ivrs?.length === 0 ? (
          <IvrsEmptyState onCreateIvr={openCreateIvrModal} />
        ) : (
          ivrs?.map((ivr) => (
            <Card key={ivr.id} data-testid={`card-ivr-${ivr.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{ivr.name}</span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => openEditIvrModal(ivr)}
                    data-testid={`button-edit-ivr-${ivr.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <CardDescription>
                  Opciones: {typeof ivr.options === 'string' ? JSON.parse(ivr.options || "[]").length : Array.isArray(ivr.options) ? ivr.options.length : 0}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Saludo personalizado</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ivr.greetingUrl ? "Audio configurado" : "Sin audio"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <IvrModal
        isOpen={ivrModal.isOpen}
        onClose={closeIvrModal}
        ivr={ivrModal.ivr}
        mode={ivrModal.mode}
      />
    </div>
  );
}

function QueuesTab() {
  const { data: queues, isLoading } = useQueues();
  const createQueue = useCreateQueue();

  const handleCreateQueue = () => {
    // Simple queue creation with basic data
    const queueName = prompt("Nombre de la nueva cola:");
    if (queueName && queueName.trim()) {
      createQueue.mutate({
        name: queueName.trim(),
        waiting: 0, // Default waiting count
        avgWaitSec: 0 // Default average wait time
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Colas de Llamadas</h3>
          <p className="text-sm text-muted-foreground">
            Gestiona las colas y distribución de llamadas
          </p>
        </div>
        <Button onClick={handleCreateQueue} data-testid="button-create-queue">
          <Plus className="h-4 w-4 mr-2" />
          Nueva Cola
        </Button>
      </div>

      <div className="grid gap-4">
        {isLoading ? (
          <QueueCardsSkeleton />
        ) : queues?.length === 0 ? (
          <QueuesEmptyState onCreateQueue={handleCreateQueue} />
        ) : (
          queues?.map((queue) => (
            <Card key={queue.id} data-testid={`card-queue-${queue.id}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{queue.name}</span>
                  <Button variant="ghost" size="sm" data-testid={`button-edit-queue-${queue.id}`}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </CardTitle>
                <CardDescription>
                  En espera: {queue.waiting} | Promedio: {queue.avgWaitSec}s
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">En espera:</span>
                    <div>{queue.waiting}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tiempo promedio:</span>
                    <div>{queue.avgWaitSec}s</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

function RecordingsTab() {
  const { getNumberParam, setParam } = useUrlState();
  const page = getNumberParam("recordings_page", 1);
  const [audioPlayer, setAudioPlayer] = useState<{
    isOpen: boolean;
    recording: any | null;
  }>({
    isOpen: false,
    recording: null,
  });
  const pageSize = 10;

  const { data: recordingsData, isLoading } = useRecordings({
    page,
    pageSize,
  });

  // Bounds checking for pagination - ensure page is within valid range (always >=1)
  const validRecordingsPage = Math.max(1, Math.min(page, recordingsData?.totalPages ?? 1));

  // Automatically correct page if it's out of bounds (use effect to avoid render-time mutations)
  useEffect(() => {
    if (!isLoading && page !== validRecordingsPage) {
      setParam("recordings_page", validRecordingsPage);
    }
  }, [isLoading, page, validRecordingsPage, setParam]);

  const openAudioPlayer = (recording: any) => {
    setAudioPlayer({
      isOpen: true,
      recording,
    });
  };

  const closeAudioPlayer = () => {
    setAudioPlayer({
      isOpen: false,
      recording: null,
    });
  };

  const getRecordingUrl = (recording: any) => {
    // In a real implementation, this would be the actual audio file URL
    // For demo purposes, we'll use a placeholder or local audio file
    return recording.fileUrl || `/api/recordings/${recording.id}/audio`;
  };

  const getRecordingFileName = (recording: any) => {
    const date = new Date(recording.startedAt).toISOString().split('T')[0];
    return `recording-${recording.callId}-${date}.wav`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Grabaciones</h3>
          <p className="text-sm text-muted-foreground">
            Reproduce y gestiona las grabaciones de llamadas
          </p>
        </div>
      </div>

      {isLoading ? (
        <RecordingsTableSkeleton />
      ) : recordingsData?.data.length === 0 ? (
        <RecordingsEmptyState />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Duración</TableHead>
                  <TableHead>Extensión</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {
                recordingsData?.data.map((recording) => (
                  <TableRow key={recording.id} data-testid={`row-recording-${recording.id}`}>
                    <TableCell>
                      {new Date(recording.startedAt).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>{recording.durationSec}s</TableCell>
                    <TableCell>{recording.callId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        Grabación
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openAudioPlayer(recording)}
                          data-testid={`button-play-${recording.id}`}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          data-testid={`button-download-${recording.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      )}

      {/* Pagination */}
      <PaginationControls
        currentPage={validRecordingsPage}
        totalPages={recordingsData?.totalPages}
        isLoading={isLoading}
        onPageChange={(newPage) => setParam("recordings_page", newPage)}
        testIdPrefix="recordings"
        showFirstLast={true}
        showPageInput={true}
        className="mt-4"
      />

      {/* Audio Player Dialog */}
      <Dialog open={audioPlayer.isOpen} onOpenChange={closeAudioPlayer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reproducir Grabación</DialogTitle>
          </DialogHeader>
          {audioPlayer.recording && (
            <AudioPlayer
              audioUrl={getRecordingUrl(audioPlayer.recording)}
              fileName={getRecordingFileName(audioPlayer.recording)}
              onClose={closeAudioPlayer}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Settings version of TelephonyPage without DashboardLayout
export default function TelephonySettingsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Telefonía</h1>
        <p className="text-muted-foreground">
          Gestiona todas las funciones telefónicas de tu centralita virtual
        </p>
      </div>

      <Tabs defaultValue="extensions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="extensions" data-testid="tab-extensions">
            <Phone className="h-4 w-4 mr-2" />
            Extensiones
          </TabsTrigger>
          <TabsTrigger value="ivrs" data-testid="tab-ivrs">
            <Settings className="h-4 w-4 mr-2" />
            IVR
          </TabsTrigger>
          <TabsTrigger value="queues" data-testid="tab-queues">
            <Users className="h-4 w-4 mr-2" />
            Colas
          </TabsTrigger>
          <TabsTrigger value="recordings" data-testid="tab-recordings">
            <Play className="h-4 w-4 mr-2" />
            Grabaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="extensions">
          <ExtensionsTab />
        </TabsContent>

        <TabsContent value="ivrs">
          <IvrsTab />
        </TabsContent>

        <TabsContent value="queues">
          <QueuesTab />
        </TabsContent>

        <TabsContent value="recordings">
          <RecordingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}