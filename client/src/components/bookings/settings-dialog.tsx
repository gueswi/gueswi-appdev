import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Clock, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface NotificationSettings {
  emailEnabled: boolean;
  smsEnabled: boolean;
  appointmentCreated: boolean;
  appointmentUpdated: boolean;
  appointmentCancelled: boolean;
}

interface ReminderSettings {
  enabled: boolean;
  emailReminder: boolean;
  smsReminder: boolean;
  hoursBeforeFirst: number;
  hoursBeforeSecond: number;
}

interface GeneralSettings {
  defaultDuration: number;
  workingHoursStart: string;
  workingHoursEnd: string;
  slotDuration: number;
  maxAdvanceBooking: number;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { toast } = useToast();

  // Notification settings state
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailEnabled: true,
    smsEnabled: false,
    appointmentCreated: true,
    appointmentUpdated: true,
    appointmentCancelled: true,
  });

  // Reminder settings state
  const [reminders, setReminders] = useState<ReminderSettings>({
    enabled: true,
    emailReminder: true,
    smsReminder: false,
    hoursBeforeFirst: 24,
    hoursBeforeSecond: 2,
  });

  // General settings state
  const [general, setGeneral] = useState<GeneralSettings>({
    defaultDuration: 60,
    workingHoursStart: "09:00",
    workingHoursEnd: "18:00",
    slotDuration: 30,
    maxAdvanceBooking: 30,
  });

  const handleSaveSettings = () => {
    // TODO: Implement API call to save settings
    toast({
      title: "Configuración guardada",
      description: "Tus preferencias han sido actualizadas correctamente",
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración del Calendario
          </DialogTitle>
          <DialogDescription>
            Personaliza las preferencias de notificaciones, recordatorios y configuración general
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="notifications" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notifications" data-testid="tab-notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notificaciones
            </TabsTrigger>
            <TabsTrigger value="reminders" data-testid="tab-reminders">
              <Clock className="h-4 w-4 mr-2" />
              Recordatorios
            </TabsTrigger>
            <TabsTrigger value="general" data-testid="tab-general">
              <Settings className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
          </TabsList>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notifications">Notificaciones por Email</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibe notificaciones de citas por correo electrónico
                  </p>
                </div>
                <Switch
                  id="email-notifications"
                  checked={notifications.emailEnabled}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, emailEnabled: checked })
                  }
                  data-testid="switch-email-notifications"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="sms-notifications">Notificaciones por SMS</Label>
                  <p className="text-sm text-muted-foreground">
                    Recibe notificaciones de citas por mensaje de texto
                  </p>
                </div>
                <Switch
                  id="sms-notifications"
                  checked={notifications.smsEnabled}
                  onCheckedChange={(checked) =>
                    setNotifications({ ...notifications, smsEnabled: checked })
                  }
                  data-testid="switch-sms-notifications"
                />
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-medium mb-4">Eventos a notificar</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-created">Cita creada</Label>
                    <Switch
                      id="notify-created"
                      checked={notifications.appointmentCreated}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, appointmentCreated: checked })
                      }
                      data-testid="switch-notify-created"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-updated">Cita modificada</Label>
                    <Switch
                      id="notify-updated"
                      checked={notifications.appointmentUpdated}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, appointmentUpdated: checked })
                      }
                      data-testid="switch-notify-updated"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="notify-cancelled">Cita cancelada</Label>
                    <Switch
                      id="notify-cancelled"
                      checked={notifications.appointmentCancelled}
                      onCheckedChange={(checked) =>
                        setNotifications({ ...notifications, appointmentCancelled: checked })
                      }
                      data-testid="switch-notify-cancelled"
                    />
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Reminders Tab */}
          <TabsContent value="reminders" className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="reminders-enabled">Recordatorios automáticos</Label>
                  <p className="text-sm text-muted-foreground">
                    Envía recordatorios automáticos a los clientes antes de sus citas
                  </p>
                </div>
                <Switch
                  id="reminders-enabled"
                  checked={reminders.enabled}
                  onCheckedChange={(checked) =>
                    setReminders({ ...reminders, enabled: checked })
                  }
                  data-testid="switch-reminders-enabled"
                />
              </div>

              {reminders.enabled && (
                <>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="email-reminder">Recordatorio por Email</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar recordatorios por correo electrónico
                      </p>
                    </div>
                    <Switch
                      id="email-reminder"
                      checked={reminders.emailReminder}
                      onCheckedChange={(checked) =>
                        setReminders({ ...reminders, emailReminder: checked })
                      }
                      data-testid="switch-email-reminder"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sms-reminder">Recordatorio por SMS</Label>
                      <p className="text-sm text-muted-foreground">
                        Enviar recordatorios por mensaje de texto
                      </p>
                    </div>
                    <Switch
                      id="sms-reminder"
                      checked={reminders.smsReminder}
                      onCheckedChange={(checked) =>
                        setReminders({ ...reminders, smsReminder: checked })
                      }
                      data-testid="switch-sms-reminder"
                    />
                  </div>

                  <div className="pt-4 border-t space-y-4">
                    <h4 className="font-medium">Tiempos de recordatorio</h4>
                    <div className="space-y-2">
                      <Label htmlFor="hours-before-first">Primer recordatorio (horas antes)</Label>
                      <Select
                        value={reminders.hoursBeforeFirst.toString()}
                        onValueChange={(value) =>
                          setReminders({ ...reminders, hoursBeforeFirst: parseInt(value) })
                        }
                      >
                        <SelectTrigger id="hours-before-first" data-testid="select-first-reminder">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="24">24 horas antes</SelectItem>
                          <SelectItem value="48">48 horas antes</SelectItem>
                          <SelectItem value="72">72 horas antes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="hours-before-second">Segundo recordatorio (horas antes)</Label>
                      <Select
                        value={reminders.hoursBeforeSecond.toString()}
                        onValueChange={(value) =>
                          setReminders({ ...reminders, hoursBeforeSecond: parseInt(value) })
                        }
                      >
                        <SelectTrigger id="hours-before-second" data-testid="select-second-reminder">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 hora antes</SelectItem>
                          <SelectItem value="2">2 horas antes</SelectItem>
                          <SelectItem value="4">4 horas antes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6 pt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-duration">Duración predeterminada de citas (minutos)</Label>
                <Select
                  value={general.defaultDuration.toString()}
                  onValueChange={(value) =>
                    setGeneral({ ...general, defaultDuration: parseInt(value) })
                  }
                >
                  <SelectTrigger id="default-duration" data-testid="select-default-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="45">45 minutos</SelectItem>
                    <SelectItem value="60">60 minutos</SelectItem>
                    <SelectItem value="90">90 minutos</SelectItem>
                    <SelectItem value="120">120 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="working-start">Hora de inicio laboral</Label>
                  <Input
                    id="working-start"
                    type="time"
                    value={general.workingHoursStart}
                    onChange={(e) =>
                      setGeneral({ ...general, workingHoursStart: e.target.value })
                    }
                    data-testid="input-working-start"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="working-end">Hora de fin laboral</Label>
                  <Input
                    id="working-end"
                    type="time"
                    value={general.workingHoursEnd}
                    onChange={(e) =>
                      setGeneral({ ...general, workingHoursEnd: e.target.value })
                    }
                    data-testid="input-working-end"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="slot-duration">Duración de slots del calendario (minutos)</Label>
                <Select
                  value={general.slotDuration.toString()}
                  onValueChange={(value) =>
                    setGeneral({ ...general, slotDuration: parseInt(value) })
                  }
                >
                  <SelectTrigger id="slot-duration" data-testid="select-slot-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutos</SelectItem>
                    <SelectItem value="30">30 minutos</SelectItem>
                    <SelectItem value="60">60 minutos</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-advance">Reservas anticipadas máximas (días)</Label>
                <Select
                  value={general.maxAdvanceBooking.toString()}
                  onValueChange={(value) =>
                    setGeneral({ ...general, maxAdvanceBooking: parseInt(value) })
                  }
                >
                  <SelectTrigger id="max-advance" data-testid="select-max-advance">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 días</SelectItem>
                    <SelectItem value="14">14 días</SelectItem>
                    <SelectItem value="30">30 días</SelectItem>
                    <SelectItem value="60">60 días</SelectItem>
                    <SelectItem value="90">90 días</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel-settings"
          >
            Cancelar
          </Button>
          <Button onClick={handleSaveSettings} data-testid="button-save-settings">
            Guardar Configuración
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
