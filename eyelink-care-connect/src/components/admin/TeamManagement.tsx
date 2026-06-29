import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { Plus, Edit, Trash2, X, User, Upload, Loader2, Users as UsersIcon, Award, Briefcase, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TeamMember = {
  _id: string;
  name: string;
  role: string;
  specialty?: string;
  bio?: string;
  photo_url?: string;
  order: number;
  createdAt: string;
};

export default function TeamManagement() {
  const { toast } = useToast();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    specialty: "",
    bio: "",
    photo_url: "",
    order: 0,
  });

  const fetchMembers = async () => {
    try {
      const res = await api.get<TeamMember[]>('/api/admin/team');
      if (res.success && Array.isArray(res.data)) {
        setMembers(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch team members:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleOpenAdd = () => {
    setEditMode(false);
    setSelectedMember(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData({ name: "", role: "", specialty: "", bio: "", photo_url: "", order: members.length });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setDialogOpen(true);
  };

  const handleOpenEdit = (member: TeamMember) => {
    setEditMode(true);
    setSelectedMember(member);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData({
      name: member.name,
      role: member.role,
      specialty: member.specialty || "",
      bio: member.bio || "",
      photo_url: member.photo_url || "",
      order: member.order,
    });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type (including HEIC/HEIF which may not have standard MIME types)
      const validTypes = ['image/', '.heic', '.heif'];
      const fileName = file.name.toLowerCase();
      const isValidType = validTypes.some(type => 
        file.type.startsWith(type) || fileName.endsWith(type)
      );
      if (!isValidType) {
        toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Error", description: "Image size must be less than 5MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData({ ...formData, photo_url: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('[TeamManagement] Starting upload for:', file.name, 'size:', file.size);
    
    try {
      const res = await api.upload('/api/upload', formData);
      console.log('[TeamManagement] Upload response:', res);
      if (res.success && res.data?.url) {
        return res.data.url;
      }
      console.error('[TeamManagement] Upload failed:', res.message);
      return null;
    } catch (error) {
      console.error('[TeamManagement] Upload error:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      // Upload file first if selected
      let photoUrl = formData.photo_url;
      if (selectedFile) {
        const uploadedUrl = await uploadFile(selectedFile);
        if (uploadedUrl) {
          photoUrl = uploadedUrl;
        } else {
          toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
          setUploading(false);
          return;
        }
      }

      const submitData = { ...formData, photo_url: photoUrl };
      let res;
      if (editMode && selectedMember) {
        res = await api.patch(`/api/admin/team/${selectedMember._id}`, submitData);
      } else {
        res = await api.post('/api/admin/team', submitData);
      }
      if (res.success) {
        toast({ title: "Success", description: res.message });
        setDialogOpen(false);
        fetchMembers();
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save team member", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/admin/team/${id}`);
      if (res.success) {
        toast({ title: "Success", description: res.message });
        setDeleteId(null);
        fetchMembers();
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete team member", variant: "destructive" });
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-card border border-border animate-pulse">
              <div className="aspect-[4/3] bg-muted" />
              <div className="p-4">
                <div className="h-5 bg-muted rounded mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <UsersIcon className="w-5 h-5" />
              <span className="text-sm font-medium">Team Management</span>
            </div>
            <h2 className="text-2xl font-semibold">Leadership Team</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage team members displayed on the About page</p>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Member
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <UsersIcon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{members.length}</p>
              <p className="text-sm text-muted-foreground">Total Members</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{members.filter(m => m.specialty).length}</p>
              <p className="text-sm text-muted-foreground">Specialists</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{members.filter(m => m.role.toLowerCase().includes('director') || m.role.toLowerCase().includes('lead')).length}</p>
              <p className="text-sm text-muted-foreground">Leaders</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{members.filter(m => m.photo_url).length}</p>
              <p className="text-sm text-muted-foreground">With Photos</p>
            </div>
          </div>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-border bg-card">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Team Members Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Add leadership team members to display on the About page</p>
          <Button onClick={handleOpenAdd} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Add First Team Member
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {members.map((member) => (
            <div key={member._id} className="rounded-xl overflow-hidden bg-card border border-border">
              <div className="aspect-[4/3] relative">
                {member.photo_url ? (
                  <img
                    src={member.photo_url}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted/50">
                    <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center text-2xl font-bold">
                      {getInitials(member.name)}
                    </div>
                  </div>
                )}
                <div className="absolute top-3 left-3 w-7 h-7 rounded-full bg-background/90 border border-border flex items-center justify-center text-xs font-bold">
                  {member.order + 1}
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold truncate text-lg">{member.name}</h3>
                  <p className="text-primary text-sm font-medium truncate">{member.role}</p>
                </div>
                {member.specialty && (
                  <div className="flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground text-sm truncate">{member.specialty}</span>
                  </div>
                )}
                {member.bio && (
                  <p className="text-muted-foreground text-sm line-clamp-2">{member.bio}</p>
                )}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleOpenEdit(member)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="flex-1 text-destructive" onClick={() => setDeleteId(member._id)}>
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="w-5 h-5 text-primary" />
              </div>
              {editMode ? "Edit Team Member" : "Add Team Member"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 pb-6">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Dr. XXXXXX"
                required
              />
            </div>
            <div>
              <Label htmlFor="role">Role/Title *</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                placeholder="Founder & Medical Director"
                required
              />
            </div>
            <div>
              <Label htmlFor="specialty">Specialty</Label>
              <Input
                id="specialty"
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                placeholder="Ophthalmology"
              />
            </div>
            <div>
              <Label htmlFor="photo">Photo</Label>
              <div className="mt-1">
                {(previewUrl || formData.photo_url) ? (
                  <div className="relative inline-block">
                    <img
                      src={previewUrl || formData.photo_url}
                      alt="Preview"
                      className="w-32 h-32 object-cover rounded-lg border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => fileInputRef.current?.click()}
                      title="Click to replace photo"
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        removePhoto();
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Click to upload</span>
                  </div>
                )}
                <Input
                  ref={fileInputRef}
                  id="photo"
                  type="file"
                  accept="image/*,.heic,.heif"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Upload a photo (max 5MB, JPG/PNG/WebP/HEIC)</p>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Brief description of the team member..."
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="order">Display Order</Label>
              <Input
                id="order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                min={0}
              />
            </div>

            <DialogFooter className="mt-4 pt-4 border-t flex-shrink-0 md:col-span-2 sticky bottom-0 bg-background/95 backdrop-blur">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {editMode ? "Saving..." : "Adding..."}
                  </>
                ) : (
                  editMode ? "Save Changes" : "Add Team Member"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete team member</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the team member from the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={!deleteId} onClick={() => deleteId && handleDelete(deleteId)}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
