import { useEffect, useState } from "react";
import { Settings as SettingsIcon, Bell, Shield, Globe, Database, Mail, Save, Eye, EyeOff, AlertTriangle, CheckCircle, Info, Zap, Users, Calendar, MessageSquare, Languages, HardDrive, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { api } from "@/lib/api";

type SettingsState = {
  platformName: string;
  supportEmail: string;
  maintenanceMode: boolean;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  maxAppointmentsPerDay: number;
  appointmentDuration: number;
  enableTeleConsultation: boolean;
  enableSMS: boolean;
  enableEmailNotifications: boolean;
  defaultLanguage: string;
  backupFrequency: string;
};

const defaultSettings: SettingsState = {
  platformName: "IMBONI EyeLink",
  supportEmail: "support@imboni.rw",
  maintenanceMode: false,
  allowRegistration: true,
  requireEmailVerification: true,
  maxAppointmentsPerDay: 50,
  appointmentDuration: 30,
  enableTeleConsultation: true,
  enableSMS: true,
  enableEmailNotifications: true,
  defaultLanguage: "en",
  backupFrequency: "daily",
};

function normalizeSettings(data: Record<string, unknown>): SettingsState {
  return {
    platformName: typeof data.platformName === "string" ? data.platformName : defaultSettings.platformName,
    supportEmail: typeof data.supportEmail === "string" ? data.supportEmail : defaultSettings.supportEmail,
    maintenanceMode: typeof data.maintenanceMode === "boolean" ? data.maintenanceMode : defaultSettings.maintenanceMode,
    allowRegistration: typeof data.allowRegistration === "boolean" ? data.allowRegistration : defaultSettings.allowRegistration,
    requireEmailVerification:
      typeof data.requireEmailVerification === "boolean" ? data.requireEmailVerification : defaultSettings.requireEmailVerification,
    maxAppointmentsPerDay: Number(data.maxAppointmentsPerDay ?? defaultSettings.maxAppointmentsPerDay),
    appointmentDuration: Number(data.appointmentDuration ?? defaultSettings.appointmentDuration),
    enableTeleConsultation:
      typeof data.enableTeleConsultation === "boolean" ? data.enableTeleConsultation : defaultSettings.enableTeleConsultation,
    enableSMS: typeof data.enableSMS === "boolean" ? data.enableSMS : defaultSettings.enableSMS,
    enableEmailNotifications:
      typeof data.enableEmailNotifications === "boolean" ? data.enableEmailNotifications : defaultSettings.enableEmailNotifications,
    defaultLanguage: typeof data.defaultLanguage === "string" ? data.defaultLanguage : defaultSettings.defaultLanguage,
    backupFrequency: typeof data.backupFrequency === "string" ? data.backupFrequency : defaultSettings.backupFrequency,
  };
}

export default function AdminSettings() {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const handleSave = async () => {
    setSaving(true);
    const payload: SettingsState = {
      ...settings,
      maxAppointmentsPerDay: Number(settings.maxAppointmentsPerDay) || 50,
      appointmentDuration: Number(settings.appointmentDuration) || 30,
    };
    try {
      await Promise.all(
        Object.entries(payload).map(([key, value]) => api.patch(`/api/admin/settings/${key}`, { value })),
      );
      setSettings(payload);
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      try {
        const res = await api.get<Record<string, unknown>>("/api/admin/settings");
        if (!cancelled && res.success && res.data) setSettings(normalizeSettings(res.data));
      } catch {
        if (!cancelled) setSettings(defaultSettings);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadSettings();
    return () => { cancelled = true; };
  }, []);

  const settingSections = [
    {
      title: "General Settings",
      description: "Basic platform configuration",
      icon: SettingsIcon,
      gradient: "from-slate-600 to-slate-700",
      bgLight: "bg-slate-100 dark:bg-slate-800/50",
      iconColor: "text-slate-600 dark:text-slate-400",
      content: (
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-2 block">Platform Name</label>
            <Input
              value={settings.platformName}
              onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
              className="h-11"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Support Email</label>
            <Input
              type="email"
              value={settings.supportEmail}
              onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
              className="h-11"
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${settings.maintenanceMode ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-green-100 dark:bg-green-900/30'}`}>
                {settings.maintenanceMode ? (
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                ) : (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div>
                <p className="font-medium">Maintenance Mode</p>
                <p className="text-sm text-muted-foreground">Temporarily disable platform access</p>
              </div>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
            />
          </div>
        </div>
      ),
    },
    {
      title: "User Management",
      description: "Registration and authentication",
      icon: Shield,
      gradient: "from-blue-500 to-cyan-600",
      bgLight: "bg-blue-100 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Allow New Registrations</p>
                <p className="text-sm text-muted-foreground">Allow users to create accounts</p>
              </div>
            </div>
            <Switch
              checked={settings.allowRegistration}
              onCheckedChange={(checked) => setSettings({ ...settings, allowRegistration: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Mail className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium">Require Email Verification</p>
                <p className="text-sm text-muted-foreground">Users must verify email to login</p>
              </div>
            </div>
            <Switch
              checked={settings.requireEmailVerification}
              onCheckedChange={(checked) => setSettings({ ...settings, requireEmailVerification: checked })}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Appointment Settings",
      description: "Configure appointment options",
      icon: Calendar,
      gradient: "from-emerald-500 to-teal-600",
      bgLight: "bg-emerald-100 dark:bg-emerald-900/30",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      content: (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Max Per Day</label>
              <Input
                type="number"
                value={settings.maxAppointmentsPerDay}
                onChange={(e) => setSettings({ ...settings, maxAppointmentsPerDay: parseInt(e.target.value) })}
                className="h-11"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Duration (min)</label>
              <Input
                type="number"
                value={settings.appointmentDuration}
                onChange={(e) => setSettings({ ...settings, appointmentDuration: parseInt(e.target.value) })}
                className="h-11"
              />
            </div>
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Zap className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="font-medium">Enable Tele-Consultation</p>
                <p className="text-sm text-muted-foreground">Allow video consultations</p>
              </div>
            </div>
            <Switch
              checked={settings.enableTeleConsultation}
              onCheckedChange={(checked) => setSettings({ ...settings, enableTeleConsultation: checked })}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Notifications",
      description: "Configure notification channels",
      icon: Bell,
      gradient: "from-violet-500 to-purple-600",
      bgLight: "bg-violet-100 dark:bg-violet-900/30",
      iconColor: "text-violet-600 dark:text-violet-400",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <MessageSquare className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">SMS Notifications</p>
                <p className="text-sm text-muted-foreground">Send SMS for appointments</p>
              </div>
            </div>
            <Switch
              checked={settings.enableSMS}
              onCheckedChange={(checked) => setSettings({ ...settings, enableSMS: checked })}
            />
          </div>
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                <Mail className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-muted-foreground">Send email reminders</p>
              </div>
            </div>
            <Switch
              checked={settings.enableEmailNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, enableEmailNotifications: checked })}
            />
          </div>
        </div>
      ),
    },
    {
      title: "Localization",
      description: "Language and regional settings",
      icon: Globe,
      gradient: "from-pink-500 to-rose-600",
      bgLight: "bg-pink-100 dark:bg-pink-900/30",
      iconColor: "text-pink-600 dark:text-pink-400",
      content: (
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-2 block">Default Language</label>
            <select
              value={settings.defaultLanguage}
              onChange={(e) => setSettings({ ...settings, defaultLanguage: e.target.value })}
              className="w-full h-11 px-4 rounded-lg border bg-background"
            >
              <option value="en">English</option>
              <option value="fr">French</option>
              <option value="rw">Kinyarwanda</option>
            </select>
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
            <Languages className="w-5 h-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">More languages coming soon</p>
          </div>
        </div>
      ),
    },
    {
      title: "Data & Backup",
      description: "Database and backup settings",
      icon: Database,
      gradient: "from-orange-500 to-amber-600",
      bgLight: "bg-orange-100 dark:bg-orange-900/30",
      iconColor: "text-orange-600 dark:text-orange-400",
      content: (
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium mb-2 block">Backup Frequency</label>
            <select
              value={settings.backupFrequency}
              onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
              className="w-full h-11 px-4 rounded-lg border bg-background"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </div>
          <Button variant="outline" className="w-full h-11">
            <RefreshCw className="w-4 h-4 mr-2" />
            Create Manual Backup
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-slate-700 via-slate-600 to-slate-700 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30"></div>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <SettingsIcon className="w-5 h-5" />
              <span className="text-sm font-medium text-white/80">System Configuration</span>
            </div>
            <h2 className="text-2xl font-bold">Platform Settings</h2>
            <p className="text-white/80 text-sm mt-1">Configure global platform settings and preferences</p>
          </div>
          <Button onClick={handleSave} disabled={saving || loading} className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl p-4 bg-card border border-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">Active</p>
            <p className="text-xs text-muted-foreground">Platform Status</p>
          </div>
        </div>
        <div className="rounded-xl p-4 bg-card border border-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{settings.allowRegistration ? 'Open' : 'Closed'}</p>
            <p className="text-xs text-muted-foreground">Registration</p>
          </div>
        </div>
        <div className="rounded-xl p-4 bg-card border border-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/30">
            <Bell className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">{(settings.enableSMS ? 1 : 0) + (settings.enableEmailNotifications ? 1 : 0)}</p>
            <p className="text-xs text-muted-foreground">Active Channels</p>
          </div>
        </div>
        <div className="rounded-xl p-4 bg-card border border-border flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <HardDrive className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold capitalize">{settings.backupFrequency}</p>
            <p className="text-xs text-muted-foreground">Backup Schedule</p>
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="grid lg:grid-cols-2 gap-4">
        {settingSections.map((section, index) => {
          const Icon = section.icon;
          return (
            <div 
              key={index}
              className="group relative rounded-xl overflow-hidden bg-card border border-border hover:shadow-lg hover:border-primary/30 transition-all duration-300"
            >
              {/* Color indicator bar */}
              <div className={`h-1.5 bg-gradient-to-r ${section.gradient}`}></div>
              
              <div className="p-5">
                <div className="flex items-center gap-3 mb-5">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${section.gradient} flex items-center justify-center text-white shadow-md`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                </div>
                
                {section.content}
              </div>
            </div>
          );
        })}
      </div>

      {/* Danger Zone */}
      <div className="relative rounded-xl overflow-hidden border-2 border-destructive/30 bg-destructive/5">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-destructive">Danger Zone</h3>
              <p className="text-sm text-muted-foreground">Irreversible actions</p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center p-4 rounded-xl bg-background border border-destructive/20">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Reset Platform</p>
                <p className="text-sm text-muted-foreground">This will reset all data. This action cannot be undone.</p>
              </div>
            </div>
            <Button variant="destructive" className="shrink-0">
              Reset Platform
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
