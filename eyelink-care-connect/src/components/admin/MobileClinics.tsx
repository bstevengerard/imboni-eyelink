import { useEffect, useState, useRef } from "react";
import { Search, Plus, MapPin, Calendar, Users, Truck, Upload, X, Loader2, Edit, Trash2, Activity, Clock, Navigation, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type ClinicRow = {
  _id: string;
  name: string;
  location: string;
  status: string;
  patients_served: number;
  equipment: string | null;
  photo_url?: string;
  createdAt: string;
};

type ScheduleRow = {
  _id: string;
  clinic_id: string;
  clinic_name: string;
  location_detail: string | null;
  schedule_date: string;
  time_slot: string | null;
  expected_patients: number;
};

const statusConfig = {
  active: { color: "bg-green-500", bgLight: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400", label: "Active" },
  maintenance: { color: "bg-amber-500", bgLight: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400", label: "Maintenance" },
  scheduled: { color: "bg-blue-500", bgLight: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400", label: "Scheduled" },
};

export default function MobileClinics() {
  const { toast } = useToast();
  const [clinics, setClinics] = useState<ClinicRow[]>([]);
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddClinic, setShowAddClinic] = useState(false);
  const [showEditClinic, setShowEditClinic] = useState(false);
  const [showScheduleVisit, setShowScheduleVisit] = useState(false);
  const [selectedClinic, setSelectedClinic] = useState<ClinicRow | null>(null);
  const [clinicsList, setClinicsList] = useState<ClinicRow[]>([]);
  const [deleteClinicId, setDeleteClinicId] = useState<string | null>(null);
  const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);

  // Add Clinic Form State
  const [clinicForm, setClinicForm] = useState({
    name: "",
    location: "",
    equipment: "",
    status: "active",
  });
  const [clinicFile, setClinicFile] = useState<File | null>(null);
  const [clinicPreview, setClinicPreview] = useState<string | null>(null);
  const [clinicUploading, setClinicUploading] = useState(false);
  const clinicFileRef = useRef<HTMLInputElement>(null);

  // Schedule Visit Form State
  const [scheduleForm, setScheduleForm] = useState({
    clinic_id: "",
    location_detail: "",
    schedule_date: "",
    time_slot: "",
    expected_patients: 0,
  });
  const [scheduleSubmitting, setScheduleSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [cRes, sRes] = await Promise.all([
          api.get<ClinicRow[]>("/api/admin/clinics"),
          api.get<ScheduleRow[]>("/api/admin/clinics/schedules"),
        ]);
        if (!cancelled && cRes.success && Array.isArray(cRes.data)) {
          setClinics(cRes.data);
          setClinicsList(cRes.data);
        }
        if (!cancelled && sRes.success && Array.isArray(sRes.data)) setSchedules(sRes.data);
      } catch {
        if (!cancelled) {
          setClinics([]);
          setSchedules([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredClinics = clinics.filter((clinic) =>
    clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    clinic.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleClinicFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Error", description: "Image size must be less than 10MB", variant: "destructive" });
        return;
      }
      setClinicFile(file);
      try {
        const base64 = await fileToBase64(file);
        setClinicPreview(base64);
      } catch {
        setClinicPreview(URL.createObjectURL(file));
      }
    }
  };

  const removeClinicPhoto = () => {
    setClinicFile(null);
    setClinicPreview(null);
    if (clinicFileRef.current) clinicFileRef.current.value = "";
  };

  const uploadClinicFile = async (file: File): Promise<string | null> => {
    try {
      const base64 = await fileToBase64(file);
      return base64;
    } catch {
      return null;
    }
  };

  const handleOpenAddClinic = () => {
    setSelectedClinic(null);
    setClinicForm({ name: "", location: "", equipment: "", status: "active" });
    setClinicFile(null);
    setClinicPreview(null);
    setShowAddClinic(true);
  };

  const handleOpenEditClinic = (clinic: ClinicRow) => {
    setSelectedClinic(clinic);
    setClinicForm({
      name: clinic.name,
      location: clinic.location,
      equipment: clinic.equipment || "",
      status: clinic.status,
    });
    setClinicFile(null);
    setClinicPreview(clinic.photo_url || null);
    setShowEditClinic(true);
  };

  const handleAddClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    setClinicUploading(true);
    try {
      let photoUrl = "";
      if (clinicFile) {
        const uploaded = await uploadClinicFile(clinicFile);
        if (uploaded) photoUrl = uploaded;
      }

      const submitData = { ...clinicForm };
      if (photoUrl) submitData.photo_url = photoUrl;

      const res = await api.post('/api/admin/clinics', submitData);

      if (res.success) {
        toast({ title: "Success", description: "Mobile clinic added successfully!" });
        setShowAddClinic(false);
        setClinicForm({ name: "", location: "", equipment: "", status: "active" });
        setClinicFile(null);
        setClinicPreview(null);
        // Refresh clinics list
        const cRes = await api.get<ClinicRow[]>("/api/admin/clinics");
        if (cRes.success && Array.isArray(cRes.data)) {
          setClinics(cRes.data);
          setClinicsList(cRes.data);
        }
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to add clinic", variant: "destructive" });
    } finally {
      setClinicUploading(false);
    }
  };

  const handleEditClinic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClinic) return;
    setClinicUploading(true);
    try {
      let photoUrl = clinicPreview || "";
      if (clinicFile) {
        const uploaded = await uploadClinicFile(clinicFile);
        if (uploaded) photoUrl = uploaded;
      }

      const submitData = { ...clinicForm };
      if (photoUrl) {
        submitData.photo_url = photoUrl;
      } else if (clinicPreview === null) {
        submitData.photo_url = null;
      }

      const res = await api.patch(`/api/admin/clinics/${selectedClinic._id}`, submitData);

      if (res.success) {
        toast({ title: "Success", description: "Mobile clinic updated successfully!" });
        setShowEditClinic(false);
        setClinicFile(null);
        setClinicPreview(null);
        // Refresh clinics list
        const cRes = await api.get<ClinicRow[]>("/api/admin/clinics");
        if (cRes.success && Array.isArray(cRes.data)) {
          setClinics(cRes.data);
          setClinicsList(cRes.data);
        }
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update clinic", variant: "destructive" });
    } finally {
      setClinicUploading(false);
    }
  };

  const handleDeleteClinic = async (id: string) => {
    try {
      const res = await api.delete(`/api/admin/clinics/${id}`);
      if (res.success) {
        toast({ title: "Success", description: "Clinic deleted successfully!" });
        setDeleteClinicId(null);
        const cRes = await api.get<ClinicRow[]>("/api/admin/clinics");
        if (cRes.success && Array.isArray(cRes.data)) {
          setClinics(cRes.data);
          setClinicsList(cRes.data);
        }
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete clinic", variant: "destructive" });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    try {
      const res = await api.delete(`/api/admin/clinics/schedules/${id}`);
      if (res.success) {
        toast({ title: "Success", description: "Schedule deleted successfully!" });
        setDeleteScheduleId(null);
        const sRes = await api.get<ScheduleRow[]>("/api/admin/clinics/schedules");
        if (sRes.success && Array.isArray(sRes.data)) setSchedules(sRes.data);
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete schedule", variant: "destructive" });
    }
  };
  const handleScheduleVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScheduleSubmitting(true);
    try {
      const res = await api.post('/api/admin/clinics/schedules', scheduleForm);
      if (res.success) {
        toast({ title: "Success", description: "Visit scheduled successfully!" });
        setShowScheduleVisit(false);
        setScheduleForm({ clinic_id: "", location_detail: "", schedule_date: "", time_slot: "", expected_patients: 0 });
        // Refresh schedules
        const sRes = await api.get<ScheduleRow[]>("/api/admin/clinics/schedules");
        if (sRes.success && Array.isArray(sRes.data)) setSchedules(sRes.data);
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to schedule visit", variant: "destructive" });
    } finally {
      setScheduleSubmitting(false);
    }
  };

  if (loading && clinics.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-4 w-64 bg-muted rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl p-5 bg-card border border-border animate-pulse">
              <div className="h-12 w-12 bg-muted rounded-xl mb-3" />
              <div className="h-6 w-16 bg-muted rounded mb-1" />
              <div className="h-4 w-24 bg-muted rounded" />
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
              <Truck className="w-5 h-5" />
              <span className="text-sm font-medium">Mobile Clinics</span>
            </div>
            <h2 className="text-2xl font-semibold">Mobile Clinic Units</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage mobile clinic units and schedules</p>
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setShowScheduleVisit(true)}>
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Visit
            </Button>
            <Button type="button" onClick={handleOpenAddClinic}>
              <Plus className="w-4 h-4 mr-2" />
              Add Clinic
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{clinics.length}</p>
              <p className="text-sm text-muted-foreground">Total Units</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{clinics.filter(c => c.status === 'active').length}</p>
              <p className="text-sm text-muted-foreground">Active Now</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{clinics.reduce((acc, c) => acc + (c.patients_served || 0), 0).toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Patients Served</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{schedules.length}</p>
              <p className="text-sm text-muted-foreground">Upcoming Visits</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search clinics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 bg-card border-border"
        />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClinics.map((clinic) => {
          const statusConf = statusConfig[clinic.status as keyof typeof statusConfig];
          return (
            <div
              key={clinic._id}
              className="rounded-xl overflow-hidden bg-card border border-border"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
                      {clinic.photo_url ? (
                        <img src={clinic.photo_url} alt={clinic.name} className="w-full h-full object-cover" />
                      ) : (
                        <Truck className="w-7 h-7 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg truncate">{clinic.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="truncate">{clinic.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button size="sm" variant="outline" onClick={() => handleOpenEditClinic(clinic)} className="h-8 w-8 p-0">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteClinicId(clinic._id)} className="h-8 w-8 p-0 text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConf?.bgLight || "bg-muted text-muted-foreground"}`}>
                      <span className={`w-2 h-2 rounded-full ${statusConf?.color || "bg-muted-foreground"}`} />
                      {statusConf?.label || clinic.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Patients Served</span>
                    <span className="font-semibold text-lg text-primary">{(clinic.patients_served || 0).toLocaleString()}</span>
                  </div>

                  {clinic.equipment && (
                    <div className="flex items-start gap-2 pt-2 border-t border-border">
                      <Wrench className="w-4 h-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm text-muted-foreground line-clamp-2">{clinic.equipment}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setScheduleForm({ ...scheduleForm, clinic_id: clinic._id });
                      setShowScheduleVisit(true);
                    }}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Visit
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Upcoming Visits</h3>
              <p className="text-sm text-muted-foreground">Scheduled mobile clinic visits</p>
            </div>
          </div>
        </div>
        <div className="divide-y divide-border">
          {schedules.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No upcoming visits scheduled.</p>
            </div>
          ) : (
            schedules.map((schedule) => (
              <div key={schedule._id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{schedule.clinic_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{schedule.location_detail || "Location not specified"}</p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="font-medium">{schedule.schedule_date ? new Date(schedule.schedule_date).toLocaleDateString() : "—"}</p>
                  <p className="text-sm text-muted-foreground">{schedule.time_slot || "Time not set"}</p>
                </div>
                <div className="text-right hidden md:block">
                  <p className="text-sm text-muted-foreground">Expected</p>
                  <p className="font-medium text-primary">{schedule.expected_patients} patients</p>
                </div>
                <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => setDeleteScheduleId(schedule._id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Add Clinic Dialog */}
      <Dialog open={showAddClinic} onOpenChange={setShowAddClinic}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              Add Mobile Clinic
            </DialogTitle>
            <DialogDescription>Register a new mobile clinic unit</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddClinic} className="space-y-4 flex-1 overflow-y-auto pr-2 py-4">
            <div>
              <Label htmlFor="add_clinic_name">Clinic Name *</Label>
              <Input
                id="add_clinic_name"
                value={clinicForm.name}
                onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
                placeholder="e.g., Mobile Eye Clinic 1"
                required
              />
            </div>
            <div>
              <Label htmlFor="add_clinic_location">Location *</Label>
              <Input
                id="add_clinic_location"
                value={clinicForm.location}
                onChange={(e) => setClinicForm({ ...clinicForm, location: e.target.value })}
                placeholder="e.g., Kigali, Rwanda"
                required
              />
            </div>
            <div>
              <Label htmlFor="add_clinic_equipment">Equipment</Label>
              <Textarea
                id="add_clinic_equipment"
                value={clinicForm.equipment}
                onChange={(e) => setClinicForm({ ...clinicForm, equipment: e.target.value })}
                placeholder="List equipment available..."
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="add_clinic_status">Status</Label>
              <Select value={clinicForm.status} onValueChange={(value) => setClinicForm({ ...clinicForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="add_clinic_photo">Photo</Label>
              <div className="mt-1">
                {clinicPreview ? (
                  <div className="relative inline-block">
                    <img src={clinicPreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border" />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={removeClinicPhoto}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    onClick={() => clinicFileRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Click to upload</span>
                  </div>
                )}
                <Input
                  ref={clinicFileRef}
                  id="add_clinic_photo"
                  type="file"
                  accept="image/*,.heic,.heif"
                  className="hidden"
                  onChange={handleClinicFileChange}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Upload a photo (max 5MB, JPG/PNG/WebP/HEIC)</p>
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowAddClinic(false)} disabled={clinicUploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={clinicUploading}>
                {clinicUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Clinic"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Clinic Dialog */}
      <Dialog open={showEditClinic} onOpenChange={setShowEditClinic}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Edit className="w-5 h-5 text-primary" />
              </div>
              Edit Mobile Clinic
            </DialogTitle>
            <DialogDescription>Update clinic details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditClinic} className="space-y-4 flex-1 overflow-y-auto pr-2 py-4">
            <div>
              <Label htmlFor="edit_clinic_name">Clinic Name *</Label>
              <Input
                id="edit_clinic_name"
                value={clinicForm.name}
                onChange={(e) => setClinicForm({ ...clinicForm, name: e.target.value })}
                placeholder="e.g., Mobile Eye Clinic 1"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_clinic_location">Location *</Label>
              <Input
                id="edit_clinic_location"
                value={clinicForm.location}
                onChange={(e) => setClinicForm({ ...clinicForm, location: e.target.value })}
                placeholder="e.g., Kigali, Rwanda"
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_clinic_equipment">Equipment</Label>
              <Textarea
                id="edit_clinic_equipment"
                value={clinicForm.equipment}
                onChange={(e) => setClinicForm({ ...clinicForm, equipment: e.target.value })}
                placeholder="List equipment available..."
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="edit_clinic_status">Status</Label>
              <Select value={clinicForm.status} onValueChange={(value) => setClinicForm({ ...clinicForm, status: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_clinic_photo">Photo</Label>
              <div className="mt-1">
                {clinicPreview ? (
                  <div className="relative inline-block">
                    <img src={clinicPreview} alt="Preview" className="w-32 h-32 object-cover rounded-lg border" />
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
                      onClick={removeClinicPhoto}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div
                    className="w-32 h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                    onClick={() => clinicFileRef.current?.click()}
                  >
                    <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                    <span className="text-xs text-muted-foreground">Click to upload</span>
                  </div>
                )}
                <Input
                  ref={clinicFileRef}
                  id="edit_clinic_photo"
                  type="file"
                  accept="image/*,.heic,.heif"
                  className="hidden"
                  onChange={handleClinicFileChange}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Upload a photo (max 5MB, JPG/PNG/WebP/HEIC)</p>
            </div>
            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowEditClinic(false)} disabled={clinicUploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={clinicUploading}>
                {clinicUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Schedule Visit Dialog */}
      <Dialog open={showScheduleVisit} onOpenChange={setShowScheduleVisit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              Schedule Visit
            </DialogTitle>
            <DialogDescription>Schedule a mobile clinic visit to a location</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleVisit} className="space-y-4 py-4">
            <div>
              <Label htmlFor="schedule_clinic">Clinic *</Label>
              <Select value={scheduleForm.clinic_id} onValueChange={(value) => setScheduleForm({ ...scheduleForm, clinic_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select clinic" />
                </SelectTrigger>
                <SelectContent>
                  {clinicsList.map((clinic) => (
                    <SelectItem key={clinic._id} value={clinic._id}>
                      {clinic.name} - {clinic.location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="schedule_location">Location Detail</Label>
              <Input
                id="schedule_location"
                value={scheduleForm.location_detail}
                onChange={(e) => setScheduleForm({ ...scheduleForm, location_detail: e.target.value })}
                placeholder="e.g., Nyamirambo Sector Office"
              />
            </div>
            <div>
              <Label htmlFor="schedule_date">Date *</Label>
              <Input
                id="schedule_date"
                type="date"
                value={scheduleForm.schedule_date}
                onChange={(e) => setScheduleForm({ ...scheduleForm, schedule_date: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="schedule_time">Time Slot</Label>
              <Input
                id="schedule_time"
                type="time"
                value={scheduleForm.time_slot}
                onChange={(e) => setScheduleForm({ ...scheduleForm, time_slot: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="schedule_patients">Expected Patients</Label>
              <Input
                id="schedule_patients"
                type="number"
                min="0"
                value={scheduleForm.expected_patients}
                onChange={(e) => setScheduleForm({ ...scheduleForm, expected_patients: parseInt(e.target.value) || 0 })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowScheduleVisit(false)} disabled={scheduleSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={scheduleSubmitting}>
                {scheduleSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Scheduling...
                  </>
                ) : (
                  "Schedule Visit"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteClinicId} onOpenChange={(open) => !open && setDeleteClinicId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete mobile clinic</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the clinic and its related records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={!deleteClinicId} onClick={() => deleteClinicId && handleDeleteClinic(deleteClinicId)}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteScheduleId} onOpenChange={(open) => !open && setDeleteScheduleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete schedule</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently remove the scheduled visit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={!deleteScheduleId} onClick={() => deleteScheduleId && handleDeleteSchedule(deleteScheduleId)}>
              Delete
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
