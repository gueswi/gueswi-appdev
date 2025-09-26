import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Phone, 
  Settings, 
  Users, 
  Play, 
  Plus,
  AlertCircle,
  RefreshCw
} from "lucide-react";

interface EmptyStateProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    testId?: string;
  };
}

function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
        {description}
      </p>
      {action && (
        <Button onClick={action.onClick} data-testid={action.testId}>
          <Plus className="h-4 w-4 mr-2" />
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function ExtensionsEmptyState({ onCreateExtension }: { onCreateExtension: () => void }) {
  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState
          icon={Phone}
          title="No hay extensiones configuradas"
          description="Las extensiones permiten a los usuarios realizar y recibir llamadas. Crea tu primera extensión para comenzar a configurar tu sistema telefónico."
          action={{
            label: "Crear Primera Extensión",
            onClick: onCreateExtension,
            testId: "button-create-first-extension"
          }}
        />
      </CardContent>
    </Card>
  );
}

export function IvrsEmptyState({ onCreateIvr }: { onCreateIvr: () => void }) {
  return (
    <Card>
      <CardContent>
        <EmptyState
          icon={Settings}
          title="No hay menús IVR configurados"
          description="Los menús IVR (Interactive Voice Response) permiten a los llamantes navegar por opciones automáticas. Configura tu primer menú para mejorar la experiencia del cliente."
          action={{
            label: "Crear Primer IVR",
            onClick: onCreateIvr,
            testId: "button-create-first-ivr"
          }}
        />
      </CardContent>
    </Card>
  );
}

export function QueuesEmptyState({ onCreateQueue }: { onCreateQueue: () => void }) {
  return (
    <Card>
      <CardContent>
        <EmptyState
          icon={Users}
          title="No hay colas configuradas"
          description="Las colas de llamadas organizan y distribuyen las llamadas entrantes entre los agentes disponibles. Configura tu primera cola para gestionar el flujo de llamadas."
          action={{
            label: "Crear Primera Cola",
            onClick: onCreateQueue,
            testId: "button-create-first-queue"
          }}
        />
      </CardContent>
    </Card>
  );
}

export function RecordingsEmptyState() {
  return (
    <Card>
      <CardContent className="p-0">
        <EmptyState
          icon={Play}
          title="No hay grabaciones disponibles"
          description="Las grabaciones de llamadas aparecerán aquí una vez que se realicen llamadas con grabación habilitada. Configura la grabación en las extensiones para comenzar a grabar llamadas."
        />
      </CardContent>
    </Card>
  );
}

export function ErrorState({ 
  title = "Error al cargar datos", 
  description = "Ha ocurrido un error al cargar la información. Por favor, inténtalo de nuevo.", 
  onRetry 
}: { 
  title?: string; 
  description?: string; 
  onRetry: () => void; 
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <AlertCircle className="h-12 w-12 text-destructive mb-4" />
          <h3 className="text-lg font-medium mb-2">{title}</h3>
          <p className="text-sm text-muted-foreground text-center mb-6 max-w-md">
            {description}
          </p>
          <Button variant="outline" onClick={onRetry} data-testid="button-retry">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}