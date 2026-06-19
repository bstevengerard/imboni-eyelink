import { useState, useEffect } from 'react';
import { User, Mail, Phone, Edit, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/api';

type ProfileData = {
  id: number | string;
  email: string;
  name: string;
  phone: string;
  role: string;
};

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function PatientProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<ProfileData>('/api/patient/profile');
        if (!cancelled && res.success && res.data) {
          setProfile(res.data);
          setEditName(res.data.name || '');
          setEditPhone(res.data.phone || '');
        }
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await api.patch('/api/patient/profile', { name: editName, phone: editPhone });
      setProfile({ ...profile, name: editName, phone: editPhone });
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">My Profile</h2>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-foreground">My Profile</h2>
        <p className="text-muted-foreground">Could not load profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">My Profile</h2>
          <p className="text-muted-foreground">Manage your personal information</p>
        </div>
        <Button
          onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
          className="gap-2"
          disabled={saving}
        >
          {isEditing ? (
            <>
              <Save className="h-4 w-4" />
              Save Changes
            </>
          ) : (
            <>
              <Edit className="h-4 w-4" />
              Edit Profile
            </>
          )}
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card-elevated text-center">
          <div className="mb-4">
            <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <span className="text-3xl font-bold text-primary">{initials(profile.name)}</span>
            </div>
          </div>
          <h3 className="text-xl font-bold text-foreground">{profile.name}</h3>
          <p className="text-muted-foreground text-sm">Patient</p>
          <div className="mt-6 space-y-3 text-left">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{profile.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-foreground">{profile.phone || '—'}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="card-elevated">
            <div className="flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Personal Information</h3>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <Label>Full Name</Label>
                <Input
                  value={isEditing ? editName : profile.name}
                  onChange={(e) => setEditName(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={profile.email} disabled />
                <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
              </div>
              <div>
                <Label>Phone</Label>
                <Input
                  value={isEditing ? editPhone : profile.phone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  disabled={!isEditing}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
