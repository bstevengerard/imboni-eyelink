import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Loader2, Stethoscope, Clock, DollarSign, Eye, Heart, Activity, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";

type ServiceType = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  price: number | null;
  createdAt: string;
};

// Service icons based on keywords
const getServiceIcon = (name: string) => {
  const lowerName = name.toLowerCase();
  if (lowerName.includes('eye') || lowerName.includes('vision')) return Eye;
  if (lowerName.includes('surgery') || lowerName.includes('surgical')) return Activity;
  if (lowerName.includes('heart') || lowerName.includes('cardiac')) return Heart;
  return Stethoscope;
};

export default function ServiceTypes() {
  const [services, setServices] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    duration_minutes: "",
    price: "",
  });

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.get<ServiceType[]>('/api/admin/services');
      if (res.success && Array.isArray(res.data)) {
        setServices(res.data);
      }
    } catch {
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post('/api/admin/services', {
        name: formData.name,
        description: formData.description || undefined,
        duration_minutes: formData.duration_minutes ? Number(formData.duration_minutes) : undefined,
        price: formData.price ? Number(formData.price) : undefined,
      });
      if (res.success) {
        toast.success("Service type created successfully!");
        setShowAddDialog(false);
        setFormData({ name: "", description: "", duration_minutes: "", price: "" });
        fetchServices();
      } else {
        toast.error(res.message || "Failed to create service");
      }
    } catch {
      toast.error("Failed to create service");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;
    setIsSubmitting(true);
    try {
      const res = await api.patch(`/api/admin/services/${selectedService.id}`, {
        name: formData.name,
        description: formData.description || undefined,
        duration_minutes: formData.duration_minutes ? Number(formData.duration_minutes) : undefined,
        price: formData.price ? Number(formData.price) : undefined,
      });
      if (res.success) {
        toast.success("Service type updated successfully!");
        setShowEditDialog(false);
        setSelectedService(null);
        fetchServices();
      } else {
        toast.error(res.message || "Failed to update service");
      }
    } catch {
      toast.error("Failed to update service");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedService) return;
    setIsSubmitting(true);
    try {
      const res = await api.delete(`/api/admin/services/${selectedService.id}`);
      if (res.success) {
        toast.success("Service type deleted successfully!");
        setShowDeleteDialog(false);
        setSelectedService(null);
        fetchServices();
      } else {
        toast.error(res.message || "Failed to delete service");
      }
    } catch {
      toast.error("Failed to delete service");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (service: ServiceType) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || "",
      duration_minutes: service.duration_minutes?.toString() || "",
      price: service.price?.toString() || "",
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (service: ServiceType) => {
    setSelectedService(service);
    setShowDeleteDialog(true);
  };

  // Calculate stats
  const totalServices = services.length;
  const avgDuration = services.length > 0 
    ? Math.round(services.filter(s => s.duration_minutes).reduce((acc, s) => acc + (s.duration_minutes || 0), 0) / services.filter(s => s.duration_minutes).length || 1)
    : 0;
  const avgPrice = services.length > 0
    ? Math.round(services.filter(s => s.price).reduce((acc, s) => acc + (s.price || 0), 0) / services.filter(s => s.price).length || 1)
    : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Stethoscope className="w-5 h-5" />
              <span className="text-sm font-medium">Service Management</span>
            </div>
            <h2 className="text-2xl font-semibold">Service Types</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage eye care service types and pricing</p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{totalServices}</p>
              <p className="text-sm text-muted-foreground">Total Services</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{avgDuration}</p>
              <p className="text-sm text-muted-foreground">Avg Duration (min)</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{avgPrice.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Avg Price (RWF)</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{services.filter(s => s.description).length}</p>
              <p className="text-sm text-muted-foreground">With Description</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 h-11 bg-card border-border"
        />
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Service Types Found</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Add eye care service types to manage pricing and duration</p>
          <Button onClick={() => setShowAddDialog(true)} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Add First Service
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredServices.map((service) => {
            const actionBar = (
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => openEditDialog(service)}
                  className="h-8 w-8 p-0"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-destructive"
                  onClick={() => openDeleteDialog(service)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
            const Icon = getServiceIcon(service.name);

            return (
              <div
                key={service.id}
                className="group relative flex flex-col min-h-[16rem] sm:min-h-[18rem] rounded-xl overflow-hidden bg-card border border-border"
              >
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-semibold text-base sm:text-lg truncate">{service.name}</h4>
                        {service.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">{service.description}</p>
                        )}
                      </div>
                    </div>
                    {actionBar}
                  </div>

                  <div className="flex flex-col flex-1">
                    {service.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4 line-clamp-2">{service.description}</p>
                    )}

                    <div className="mt-auto" />

                    <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
                      {service.duration_minutes && (
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="font-semibold">{service.duration_minutes} min</p>
                          </div>
                        </div>
                      )}
                      {service.price && (
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                            <DollarSign className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Price</p>
                            <p className="font-semibold">RWF {service.price.toLocaleString()}</p>
                          </div>
                        </div>
                      )}
                      {!service.duration_minutes && !service.price && (
                        <p className="text-sm text-muted-foreground italic">No pricing info</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
              Add Service Type
            </DialogTitle>
            <DialogDescription>Create a new eye care service type</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                placeholder="e.g., General Eye Exam"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description of the service"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="e.g., 30"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (RWF)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="e.g., 5000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Create Service
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Edit className="w-5 h-5 text-primary" />
                </div>
              Edit Service Type
            </DialogTitle>
            <DialogDescription>Update service type details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Service Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-duration">Duration (minutes)</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price (RWF)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              Delete Service Type
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedService?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end pt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
