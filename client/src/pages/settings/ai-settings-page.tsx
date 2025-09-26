import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Settings, Volume2, FileText } from "lucide-react";

export default function AISettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto" data-testid="ai-settings-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Configuración de IA</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Administra agentes de IA, prompts y configuración de síntesis de voz
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bot className="w-5 h-5" />
              <span>Agentes de IA</span>
            </CardTitle>
            <CardDescription>
              Configura y administra tus agentes conversacionales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" data-testid="button-manage-agents">
              Administrar Agentes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Volume2 className="w-5 h-5" />
              <span>Síntesis de Voz (TTS)</span>
            </CardTitle>
            <CardDescription>
              Configuración de voces y síntesis de texto a voz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" data-testid="button-configure-tts">
              Configurar TTS
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Base de Conocimiento</span>
            </CardTitle>
            <CardDescription>
              Administra documentos y conocimiento para IA
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" data-testid="button-manage-knowledge">
              Administrar Conocimiento
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Configuración Avanzada</span>
            </CardTitle>
            <CardDescription>
              Parámetros avanzados y configuración de modelo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" data-testid="button-advanced-settings">
              Configuración Avanzada
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}