import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, Receipt, Download, Settings } from "lucide-react";

export default function BillingSettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto" data-testid="billing-settings-page">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Facturación</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Administra tu plan, métodos de pago y facturas
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CreditCard className="w-5 h-5" />
              <span>Métodos de Pago</span>
            </CardTitle>
            <CardDescription>
              Administra tarjetas y métodos de pago
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" data-testid="button-manage-payment-methods">
              Administrar Métodos de Pago
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Receipt className="w-5 h-5" />
              <span>Facturas</span>
            </CardTitle>
            <CardDescription>
              Historial de facturas y pagos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" data-testid="button-view-invoices">
              Ver Facturas
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="w-5 h-5" />
              <span>Descargas</span>
            </CardTitle>
            <CardDescription>
              Descarga facturas y reportes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" data-testid="button-download-reports">
              Descargar Reportes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Configuración de Plan</span>
            </CardTitle>
            <CardDescription>
              Cambiar plan y configuraciones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" data-testid="button-change-plan">
              Cambiar Plan
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}