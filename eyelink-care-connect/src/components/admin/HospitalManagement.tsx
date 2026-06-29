import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { Plus, Edit, Trash2, Star, Building2, MapPin, Upload, X, ImageIcon, Globe, Heart, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type Hospital = {
  _id: string;
  name: string;
  region?: string;
  district?: string;
  address?: string;
  phone?: string;
  hours?: string;
  rating: number;
  services: string[];
  featured: boolean;
  photo_url?: string;
  createdAt: string;
};

type FormDataType = {
  name: string;
  region: string;
  district: string;
  address: string;
  phone: string;
  hours: string;
  rating: number;
  services: string;
  featured: boolean;
  photo_url: string;
};

export default function HospitalManagement() {
  const { toast } = useToast();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<FormDataType>({
    name: "",
    region: "",
    district: "",
    address: "",
    phone: "",
    hours: "",
    rating: 0,
    services: "",
    featured: false,
    photo_url: "",
  });

  const fetchHospitals = async () => {
    try {
      const res = await api.get<Hospital[]>('/api/admin/hospitals');
      if (res.success && Array.isArray(res.data)) {
        setHospitals(res.data);
      }
    } catch (error) {
      console.error('Failed to fetch hospitals:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      try {
        const base64 = await fileToBase64(file);
        setPreviewUrl(base64);
      } catch {
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData({ ...formData, photo_url: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenAdd = () => {
    setEditMode(false);
    setSelectedHospital(null);
    setFormData({
      name: "",
      region: "",
      district: "",
      address: "",
      phone: "",
      hours: "",
      rating: 0,
      services: "",
      featured: false,
      photo_url: "",
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (hospital: Hospital) => {
    setEditMode(true);
    setSelectedHospital(hospital);
    setFormData({
      name: hospital.name,
      region: hospital.region || "",
      district: hospital.district || "",
      address: hospital.address || "",
      phone: hospital.phone || "",
      hours: hospital.hours || "",
      rating: hospital.rating || 0,
      services: hospital.services?.join(", ") || "",
      featured: hospital.featured || false,
      photo_url: hospital.photo_url || "",
    });
    setSelectedFile(null);
    setPreviewUrl(hospital.photo_url || null);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    
    try {
      let photoUrl = formData.photo_url;
      
      if (selectedFile) {
        photoUrl = await fileToBase64(selectedFile);
      }
      
      const data = {
        ...formData,
        photo_url: photoUrl,
        services: formData.services.split(",").map(s => s.trim()).filter(Boolean),
        rating: Number(formData.rating) || 0,
      };
      
      let res;
      if (editMode && selectedHospital) {
        res = await api.patch(`/api/admin/hospitals/${selectedHospital._id}`, data);
      } else {
        res = await api.post('/api/admin/hospitals', data);
      }
      if (res.success) {
        toast({ title: "Success", description: res.message });
        setDialogOpen(false);
        fetchHospitals();
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save hospital", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await api.delete(`/api/admin/hospitals/${id}`);
      if (res.success) {
        toast({ title: "Success", description: res.message });
        setDeleteId(null);
        fetchHospitals();
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete hospital", variant: "destructive" });
    }
  };

  const toggleFeatured = async (hospital: Hospital) => {
    try {
      const res = await api.patch(`/api/admin/hospitals/${hospital._id}`, { featured: !hospital.featured });
      if (res.success) {
        fetchHospitals();
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update featured status", variant: "destructive" });
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-card border border-border animate-pulse">
              <div className="h-40 bg-muted" />
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
              <Building2 className="w-5 h-5" />
              <span className="text-sm font-medium">Hospital Management</span>
            </div>
            <h2 className="text-2xl font-semibold">Partner Hospitals</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage hospitals displayed on the platform</p>
          </div>
          <Button type="button" onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Hospital
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{hospitals.length}</p>
              <p className="text-sm text-muted-foreground">Total Hospitals</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{hospitals.filter(h => h.featured).length}</p>
              <p className="text-sm text-muted-foreground">Featured</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{new Set(hospitals.map(h => h.region).filter(Boolean)).size}</p>
              <p className="text-sm text-muted-foreground">Regions</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Heart className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{hospitals.reduce((acc, h) => acc + (h.services?.length || 0), 0)}</p>
              <p className="text-sm text-muted-foreground">Services</p>
            </div>
          </div>
        </div>
      </div>

      {hospitals.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Hospitals Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Add partner hospitals to display on the Hospitals page</p>
          <Button onClick={handleOpenAdd} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Add First Hospital
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-sm">
              <thead className="bg-card sticky top-0 z-10">
                <tr className="text-left">
                  <th className="bg-card px-4 py-3 font-semibold text-xs text-muted-foreground">Hospital</th>
                  <th className="bg-card px-4 py-3 font-semibold text-xs text-muted-foreground">Region</th>
                  <th className="bg-card px-4 py-3 font-semibold text-xs text-muted-foreground">Phone</th>
                  <th className="bg-card px-4 py-3 font-semibold text-xs text-muted-foreground">Rating</th>
                  <th className="bg-card px-4 py-3 font-semibold text-xs text-muted-foreground">Featured</th>
                  <th className="bg-card px-4 py-3 font-semibold text-xs text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {hospitals.map((hospital) => (
                  <tr key={hospital._id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center gap-3 min-w-[260px]">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center">
                          {hospital.photo_url ? (
                            <img src={hospital.photo_url} alt={hospital.name} className="w-full h-full object-cover" />
                          ) : (
                            <Building2 className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs sm:text-sm truncate">{hospital.name}</div>
                          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] sm:text-xs">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{hospital.address || hospital.district || hospital.region || '—'}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 align-middle text-xs text-muted-foreground">{hospital.region || '—'}</td>
                    <td className="px-4 py-3 align-middle text-xs text-muted-foreground">{hospital.phone || '—'}</td>
                    <td className="px-4 py-3 align-middle text-xs text-muted-foreground">{hospital.rating?.toFixed(1) ?? '—'}</td>
                    <td className="px-4 py-3 align-middle">
                      <input
                        type="checkbox"
                        checked={hospital.featured}
                        onChange={() => toggleFeatured(hospital)}
                        className="rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                      />
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => handleOpenEdit(hospital)} className="h-8 w-8 p-0">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeleteId(hospital._id)} className="h-8 w-8 p-0 text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              {editMode ? "Edit Hospital" : "Add Hospital"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3 flex-1 overflow-y-auto pr-2">
            <div>
              <Label htmlFor="name">Hospital Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="King Faisal Hospital"
                required
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="region">Region</Label>
                <Input
                  id="region"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  placeholder="Kigali"
                />
              </div>
              <div>
                <Label htmlFor="district">District</Label>
                <Input
                  id="district"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  placeholder="Gasabo"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="KG 544 St, Kigali"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+250 788 123 456"
                />
              </div>
              <div>
                <Label htmlFor="hours">Hours</Label>
                <Input
                  id="hours"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  placeholder="24/7 or Mon-Fri: 8AM-5PM"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="rating">Rating (0-5)</Label>
                <Input
                  id="rating"
                  type="number"
                  min="0"
                  max="5"
                  step="0.1"
                  value={formData.rating}
                  onChange={(e) => setFormData({ ...formData, rating: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center pt-6">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="rounded border-gray-300 mr-2"
                />
                <Label htmlFor="featured">Featured Partner</Label>
              </div>
            </div>
            <div>
              <Label htmlFor="services">Services (comma separated)</Label>
              <Textarea
                id="services"
                value={formData.services}
                onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                placeholder="Cataract Surgery, Glaucoma Treatment, Retina Care"
                rows={2}
              />
            </div>
            <div>
              <Label>Hospital Photo</Label>
              <div className="mt-2">
                {previewUrl ? (
                  <div className="relative inline-block">
                    <img 
                      src={previewUrl} 
                      alt="Hospital preview" 
                      className="w-full h-32 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={removeSelectedFile}
                      className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    <ImageIcon className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload hospital photo</p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, HEIC up to 10MB</p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.heic,.heif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>
            <DialogFooter className="mt-4 pt-4 border-t flex-shrink-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={uploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  editMode ? "Save Changes" : "Add Hospital"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete hospital</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the hospital from the platform.
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
