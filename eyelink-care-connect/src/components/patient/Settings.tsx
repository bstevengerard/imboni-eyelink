import { useState } from 'react';
import {
  Settings,
  Lock,
  Globe,
  Moon,
  Sun,
  Smartphone,
  Shield,
  Trash2,
  Download,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function PatientSettings() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState('en');
  const [twoFactor, setTwoFactor] = useState(false);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const handlePasswordChange = () => {
    toast.success('Password changed successfully!');
    setIsPasswordOpen(false);
  };

  const handleExportData = () => {
    toast.success('Data export initiated', {
      description: 'You will receive an email with your data within 24 hours.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Appearance */}
        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-6">
            <Sun className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Appearance</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isDarkMode ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                <div>
                  <p className="font-medium text-foreground">Dark Mode</p>
                  <p className="text-sm text-muted-foreground">Use dark theme</p>
                </div>
              </div>
              <Switch
                checked={isDarkMode}
                onCheckedChange={setIsDarkMode}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5" />
                <div>
                  <p className="font-medium text-foreground">Language</p>
                  <p className="text-sm text-muted-foreground">Select your language</p>
                </div>
              </div>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="rw">Kinyarwanda</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Security */}
        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Security</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="h-5 w-5" />
                <div>
                  <p className="font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-sm text-muted-foreground">Add extra security</p>
                </div>
              </div>
              <Switch
                checked={twoFactor}
                onCheckedChange={setTwoFactor}
              />
            </div>

            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={() => setIsPasswordOpen(true)}
            >
              <Lock className="h-4 w-4" />
              Change Password
            </Button>
          </div>
        </div>

        {/* Privacy & Data */}
        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Privacy & Data</h3>
          </div>

          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full justify-start gap-3"
              onClick={handleExportData}
            >
              <Download className="h-4 w-4" />
              Export My Data
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </Button>
          </div>
        </div>

        {/* Help & Support */}
        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-6">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">Help & Support</h3>
          </div>

          <div className="space-y-4">
            <Button variant="outline" className="w-full justify-start gap-3">
              <HelpCircle className="h-4 w-4" />
              Help Center
            </Button>

            <Button variant="outline" className="w-full justify-start gap-3">
              <Settings className="h-4 w-4" />
              Contact Support
            </Button>
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">App Version: 1.0.0</p>
          </div>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new password
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Current Password</Label>
              <Input type="password" placeholder="Enter current password" />
            </div>
            <div>
              <Label>New Password</Label>
              <Input type="password" placeholder="Enter new password" />
            </div>
            <div>
              <Label>Confirm New Password</Label>
              <Input type="password" placeholder="Confirm new password" />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsPasswordOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handlePasswordChange} className="flex-1">
                Update Password
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All your data will be permanently deleted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg">
              <p className="text-sm text-foreground">
                Are you sure you want to delete your account? This will remove:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• All your medical records</li>
                <li>• Appointment history</li>
                <li>• Prescriptions</li>
                <li>• Messages and consultations</li>
              </ul>
            </div>

            <div>
              <Label>Type "DELETE" to confirm</Label>
              <Input placeholder="DELETE" />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" className="flex-1">
                Delete Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
