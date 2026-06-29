import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  BookOpen,
  Eye,
  X,
  BookText,
  AlertTriangle,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";

type EducationItem = {
  _id: string;
  content_type: "topic" | "myth" | "symptom";
  title?: string;
  description?: string;
  icon?: string;
  articles?: string[];
  myth_text?: string;
  fact_text?: string;
  symptom_text?: string;
  order: number;
  is_published: boolean;
  createdAt: string;
};

export default function EducationManagement() {
  const [items, setItems] = useState<EducationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<EducationItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    content_type: "topic",
    title: "",
    description: "",
    icon: "BookOpen",
    articles: "",
    myth_text: "",
    fact_text: "",
    symptom_text: "",
    order: 0,
    is_published: true,
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get<EducationItem[]>("/api/admin/education");
      if (res.success && Array.isArray(res.data)) {
        setItems(res.data);
      }
    } catch {
      toast.error("Failed to load education content");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const resetForm = () => {
    setFormData({
      content_type: "topic",
      title: "",
      description: "",
      icon: "BookOpen",
      articles: "",
      myth_text: "",
      fact_text: "",
      symptom_text: "",
      order: items.length,
      is_published: true,
    });
  };

  const handleOpenAdd = () => {
    resetForm();
    setSelectedItem(null);
    setShowAddDialog(true);
  };

  const handleOpenEdit = (item: EducationItem) => {
    setSelectedItem(item);
    setFormData({
      content_type: item.content_type,
      title: item.title || "",
      description: item.description || "",
      icon: item.icon || "BookOpen",
      articles: Array.isArray(item.articles) ? item.articles.join("\n") : "",
      myth_text: item.myth_text || "",
      fact_text: item.fact_text || "",
      symptom_text: item.symptom_text || "",
      order: item.order,
      is_published: item.is_published,
    });
    setShowEditDialog(true);
  };

  const handleDeleteClick = (item: EducationItem) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload: any = { ...formData };
      if (payload.content_type === "topic") {
        payload.articles = typeof payload.articles === "string"
          ? payload.articles.split("\n").map((a: string) => a.trim()).filter(Boolean)
          : [];
      }
      if (payload.content_type !== "myth") {
        payload.myth_text = undefined;
        payload.fact_text = undefined;
      }
      if (payload.content_type !== "symptom") {
        payload.symptom_text = undefined;
      }
      if (payload.content_type !== "topic") {
        payload.title = payload.title || undefined;
        payload.description = payload.description || undefined;
        payload.icon = payload.icon || undefined;
        payload.articles = undefined;
      }

      let res;
      if (showEditDialog && selectedItem) {
        res = await api.patch(`/api/admin/education/${selectedItem._id}`, payload);
      } else {
        res = await api.post("/api/admin/education", payload);
      }

      if (res.success) {
        toast.success(showEditDialog ? "Content updated" : "Content added");
        setShowAddDialog(false);
        setShowEditDialog(false);
        fetchItems();
      } else {
        toast.error(res.message || "Failed to save content");
      }
    } catch {
      toast.error("Failed to save content");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      const res = await api.delete(`/api/admin/education/${selectedItem._id}`);
      if (res.success) {
        toast.success("Content deleted");
        setShowDeleteDialog(false);
        fetchItems();
      } else {
        toast.error(res.message || "Failed to delete content");
      }
    } catch {
      toast.error("Failed to delete content");
    }
  };

  const getIconComponent = (iconName?: string) => {
    const iconMap: Record<string, React.ElementType> = {
      Eye: BookOpen,
      Book: BookOpen,
      BookText,
      AlertTriangle,
      Stethoscope,
      Heart: Stethoscope,
      Baby: BookOpen,
      Sun: BookOpen,
      Monitor: BookOpen,
      Glasses: BookOpen,
    };
    const Icon = iconMap[iconName || "BookOpen"] || BookOpen;
    return <Icon className="w-5 h-5" />;
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = (item.title || item.description || item.myth_text || item.fact_text || item.symptom_text || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || item.content_type === filterType;
    return matchesSearch && matchesType;
  });

  const stats = {
    total: items.length,
    topics: items.filter(i => i.content_type === "topic").length,
    myths: items.filter(i => i.content_type === "myth").length,
    symptoms: items.filter(i => i.content_type === "symptom").length,
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <BookOpen className="w-5 h-5" />
              <span className="text-sm font-medium">Education Management</span>
            </div>
            <h2 className="text-2xl font-semibold">Education Content</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage topics, myths, and symptoms on the Education page</p>
          </div>
          <Button onClick={handleOpenAdd}>
            <Plus className="w-4 h-4 mr-2" />
            Add Content
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.total}</p>
              <p className="text-sm text-muted-foreground">Total Items</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <BookText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.topics}</p>
              <p className="text-sm text-muted-foreground">Topics</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.myths}</p>
              <p className="text-sm text-muted-foreground">Myths</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-destructive/10 text-destructive">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{stats.symptoms}</p>
              <p className="text-sm text-muted-foreground">Symptoms</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "topic", "myth", "symptom"].map((type) => (
            <Button
              key={type}
              variant={filterType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterType(type)}
            >
              {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-card border border-border animate-pulse">
              <div className="aspect-[4/3] bg-muted" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-muted rounded w-2/3" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-border bg-card">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <BookOpen className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No education content yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Add topics, myths, and symptoms to display on the Education page
          </p>
          <Button onClick={handleOpenAdd} size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Add First Content
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div key={item._id} className="rounded-xl overflow-hidden bg-card border border-border group hover:shadow-lg transition-shadow">
              <div className="aspect-[4/3] relative bg-muted/50 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  {getIconComponent(item.icon)}
                </div>
                <div className="absolute top-3 left-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    item.content_type === "topic"
                      ? "bg-blue-100 text-blue-700"
                      : item.content_type === "myth"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-destructive/10 text-destructive"
                  }`}>
                    {item.content_type}
                  </span>
                </div>
                {!item.is_published && (
                  <div className="absolute top-3 right-3">
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                      Draft
                    </span>
                  </div>
                )}
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold truncate text-lg">{item.title || "Untitled"}</h3>
                  {item.description && (
                    <p className="text-muted-foreground text-sm line-clamp-2 mt-1">{item.description}</p>
                  )}
                </div>

{item.content_type === "topic" && item.articles && item.articles.length > 0 && (
                   <div>
                     <p className="text-xs font-medium text-muted-foreground mb-2">Article URLs ({item.articles.length})</p>
                     <ul className="space-y-1">
                       {item.articles.slice(0, 3).map((article) => (
                         <li key={article} className="text-xs text-muted-foreground truncate">
                           • {article}
                         </li>
                       ))}
                       {item.articles.length > 3 && (
                         <li className="text-xs text-muted-foreground">+{item.articles.length - 3} more</li>
                       )}
                     </ul>
                   </div>
                 )}
                 <div className="flex gap-2 pt-2 border-t border-border">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleOpenEdit(item)}>
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" className="flex-1 text-destructive" onClick={() => handleDeleteClick(item)}>
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
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <BookOpen className="w-5 h-5 text-primary" />
              </div>
              Add Education Content
            </DialogTitle>
            <DialogDescription>
              Create a new topic, myth, or symptom for the Education page
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 pb-4">
            <div>
              <Label htmlFor="content_type">Type *</Label>
              <select
                id="content_type"
                value={formData.content_type}
                onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="topic">Topic</option>
                <option value="myth">Myth</option>
                <option value="symptom">Symptom</option>
              </select>
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
            {(formData.content_type === "topic") && (
              <>
                <div className="md:col-span-2">
                  <Label htmlFor="title">Topic Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Common Eye Conditions"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="icon">Icon (Lucide icon name)</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                    placeholder="Eye"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of this topic..."
                    rows={2}
                  />
                </div>
<div className="md:col-span-2">
                   <Label htmlFor="articles">Article URLs (one per line)</Label>
                   <Textarea
                     id="articles"
                     value={formData.articles}
                     onChange={(e) => setFormData({ ...formData, articles: e.target.value })}
                     placeholder="https://example.com/catatcts&#10;https://example.com/glaucoma&#10;https://example.com/retinopathy"
                     rows={4}
                   />
                 </div>
              </>
            )}
            {formData.content_type === "myth" && (
              <>
                <div className="md:col-span-2">
                  <Label htmlFor="myth_text">Myth Statement *</Label>
                  <Textarea
                    id="myth_text"
                    value={formData.myth_text}
                    onChange={(e) => setFormData({ ...formData, myth_text: e.target.value })}
                    placeholder="Reading in dim light damages your eyes"
                    rows={2}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="fact_text">Fact Statement *</Label>
                  <Textarea
                    id="fact_text"
                    value={formData.fact_text}
                    onChange={(e) => setFormData({ ...formData, fact_text: e.target.value })}
                    placeholder="While it may cause temporary eye strain, reading in low light does not cause permanent damage."
                    rows={2}
                    required
                  />
                </div>
              </>
            )}
            {formData.content_type === "symptom" && (
              <>
                <div className="md:col-span-2">
                  <Label htmlFor="symptom_text">Symptom *</Label>
                  <Input
                    id="symptom_text"
                    value={formData.symptom_text}
                    onChange={(e) => setFormData({ ...formData, symptom_text: e.target.value })}
                    placeholder="Persistent blurry vision"
                    required
                  />
                </div>
              </>
            )}
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="is_published"
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="is_published" className="text-sm font-normal">Published (visible on public page)</Label>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowAddDialog(false); setShowEditDialog(false); }} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Content"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Edit className="w-5 h-5 text-primary" />
              </div>
              Edit Education Content
            </DialogTitle>
            <DialogDescription>
              Update topic, myth, or symptom content
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-y-auto pr-2 pb-4">
            <div>
              <Label htmlFor="content_type">Type *</Label>
              <select
                id="content_type"
                value={formData.content_type}
                onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
              >
                <option value="topic">Topic</option>
                <option value="myth">Myth</option>
                <option value="symptom">Symptom</option>
              </select>
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
            {(formData.content_type === "topic") && (
              <>
                <div className="md:col-span-2">
                  <Label htmlFor="title">Topic Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="icon">Icon (Lucide icon name)</Label>
                  <Input
                    id="icon"
                    value={formData.icon}
                    onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
<div className="md:col-span-2">
                   <Label htmlFor="articles">Article URLs (one per line)</Label>
                   <Textarea
                     id="articles"
                     value={formData.articles}
                     onChange={(e) => setFormData({ ...formData, articles: e.target.value })}
                     rows={4}
                   />
                 </div>
                </div>
              </>
            )}
            {formData.content_type === "myth" && (
              <>
                <div className="md:col-span-2">
                  <Label htmlFor="myth_text">Myth Statement *</Label>
                  <Textarea
                    id="myth_text"
                    value={formData.myth_text}
                    onChange={(e) => setFormData({ ...formData, myth_text: e.target.value })}
                    rows={2}
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="fact_text">Fact Statement *</Label>
                  <Textarea
                    id="fact_text"
                    value={formData.fact_text}
                    onChange={(e) => setFormData({ ...formData, fact_text: e.target.value })}
                    rows={2}
                    required
                  />
                </div>
              </>
            )}
            {formData.content_type === "symptom" && (
              <div className="md:col-span-2">
                <Label htmlFor="symptom_text">Symptom *</Label>
                <Input
                  id="symptom_text"
                  value={formData.symptom_text}
                  onChange={(e) => setFormData({ ...formData, symptom_text: e.target.value })}
                  required
                />
              </div>
            )}
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="is_published_edit"
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="h-4 w-4 rounded border-input"
              />
              <Label htmlFor="is_published_edit" className="text-sm font-normal">Published (visible on public page)</Label>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Update Content"
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete education content</DialogTitle>
            <DialogDescription>
              This will permanently remove "{selectedItem?.title || selectedItem?.myth_text || selectedItem?.symptom_text}" from the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
