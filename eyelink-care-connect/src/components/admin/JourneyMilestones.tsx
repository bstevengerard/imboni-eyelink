import { useEffect, useState } from "react";
import {
  Calendar,
  Edit,
  Eye,
  EyeOff,
  Flag,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { toast } from "sonner";

type JourneyMilestone = {
  _id: string;
  year: string;
  event: string;
  is_published: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
};

type JourneyForm = {
  year: string;
  event: string;
  is_published: boolean;
  order: string;
};

const emptyForm: JourneyForm = {
  year: "",
  event: "",
  is_published: true,
  order: "",
};

function toForm(milestone: JourneyMilestone): JourneyForm {
  return {
    year: milestone.year,
    event: milestone.event,
    is_published: milestone.is_published,
    order: String(milestone.order),
  };
}

export default function JourneyMilestones() {
  const [milestones, setMilestones] = useState<JourneyMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<JourneyMilestone | null>(null);
  const [form, setForm] = useState<JourneyForm>(emptyForm);

  const fetchMilestones = async () => {
    setLoading(true);
    try {
      const res = await api.get<JourneyMilestone[]>("/api/admin/journey");
      if (res.success && Array.isArray(res.data)) {
        setMilestones(res.data);
      }
    } catch {
      toast.error("Failed to load journey milestones");
      setMilestones([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMilestones();
  }, []);

  const openAddDialog = () => {
    setSelectedMilestone(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (milestone: JourneyMilestone) => {
    setSelectedMilestone(milestone);
    setForm(toForm(milestone));
    setDialogOpen(true);
  };

  const openDeleteDialog = (milestone: JourneyMilestone) => {
    setSelectedMilestone(milestone);
    setDeleteDialogOpen(true);
  };

  const updateForm = (field: keyof JourneyForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const payload = {
        year: form.year,
        event: form.event,
        is_published: form.is_published,
        order: form.order ? Number(form.order) : undefined,
      };

      const res = selectedMilestone
        ? await api.patch(`/api/admin/journey/${selectedMilestone._id}`, payload)
        : await api.post("/api/admin/journey", payload);

      if (res.success) {
        toast.success(selectedMilestone ? "Journey milestone updated" : "Journey milestone added");
        setDialogOpen(false);
        setSelectedMilestone(null);
        setForm(emptyForm);
        await fetchMilestones();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save journey milestone");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedMilestone) return;
    setSubmitting(true);

    try {
      const res = await api.delete(`/api/admin/journey/${selectedMilestone._id}`);
      if (res.success) {
        toast.success("Journey milestone deleted");
        setDeleteDialogOpen(false);
        setSelectedMilestone(null);
        await fetchMilestones();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete journey milestone");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePublish = async (milestone: JourneyMilestone) => {
    try {
      const res = await api.patch(`/api/admin/journey/${milestone._id}`, {
        is_published: !milestone.is_published,
      });
      if (res.success) {
        toast.success(milestone.is_published ? "Journey milestone hidden" : "Journey milestone published");
        await fetchMilestones();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update journey milestone");
    }
  };

  const publishedCount = milestones.filter((milestone) => milestone.is_published).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Flag className="h-5 w-5" />
              <span className="text-sm font-medium">Content Management</span>
            </div>
            <h2 className="text-2xl font-semibold">Our Journey</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage the milestones shown on the About page journey timeline.
            </p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Milestone
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Flag className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{milestones.length}</p>
              <p className="text-sm text-muted-foreground">Total Milestones</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{publishedCount}</p>
              <p className="text-sm text-muted-foreground">Published</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{milestones.at(-1)?.year || "—"}</p>
              <p className="text-sm text-muted-foreground">Latest Year</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="divide-y divide-border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : milestones.length === 0 ? (
            <div className="p-10 text-center">
              <Flag className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <h3 className="text-lg font-semibold">No journey milestones yet</h3>
              <p className="text-sm text-muted-foreground">Add the first milestone from here.</p>
            </div>
          ) : (
            milestones.map((milestone) => (
              <div key={milestone._id} className="flex items-center justify-between gap-4 p-5">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {milestone.year.slice(-2)}
                  </div>
                  <div>
                    <h3 className="font-semibold">{milestone.year}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{milestone.event}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{milestone.is_published ? "Published" : "Hidden"}</span>
                      <span>•</span>
                      <span>Order: {milestone.order}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => togglePublish(milestone)}>
                    {milestone.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(milestone)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(milestone)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedMilestone ? "Edit Journey Milestone" : "Add Journey Milestone"}</DialogTitle>
            <DialogDescription>
              Add a milestone that will appear in the public About page timeline.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  value={form.year}
                  onChange={(event) => updateForm("year", event.target.value)}
                  placeholder="2024"
                  required
                />
              </div>
              <div>
                <Label htmlFor="order">Display order</Label>
                <Input
                  id="order"
                  type="number"
                  min="0"
                  value={form.order}
                  onChange={(event) => updateForm("order", event.target.value)}
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="event">Milestone event</Label>
                <Input
                  id="event"
                  value={form.event}
                  onChange={(event) => updateForm("event", event.target.value)}
                  placeholder="Served over 50,000 patients through our integrated platform"
                  required
                />
              </div>
              <div className="md:col-span-2 flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(checked) => updateForm("is_published", checked)}
                />
                <div>
                  <p className="text-sm font-medium">Publish immediately</p>
                  <p className="text-xs text-muted-foreground">Hidden milestones are not shown on the About page.</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selectedMilestone ? "Save Changes" : "Add Milestone"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete journey milestone</DialogTitle>
            <DialogDescription>
              This will permanently remove the milestone from the admin list and About page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
