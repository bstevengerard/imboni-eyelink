import { useEffect, useRef, useState } from "react";
import {
  Edit,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Quote,
  Star,
  Trash2,
  Upload,
  Users,
  X,
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Testimonial = {
  _id: string;
  id?: string;
  name: string;
  role: string;
  location?: string | null;
  rating: number;
  content: string;
  image_url?: string | null;
  is_published: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
};

type TestimonialForm = {
  name: string;
  role: string;
  location: string;
  rating: string;
  content: string;
  image_url: string;
  is_published: boolean;
  order: string;
};

const emptyForm: TestimonialForm = {
  name: "",
  role: "Patient",
  location: "",
  rating: "5",
  content: "",
  image_url: "",
  is_published: true,
  order: "",
};

function toForm(testimonial: Testimonial): TestimonialForm {
  return {
    name: testimonial.name,
    role: testimonial.role,
    location: testimonial.location || "",
    rating: String(testimonial.rating),
    content: testimonial.content,
    image_url: testimonial.image_url || "",
    is_published: testimonial.is_published,
    order: String(testimonial.order),
  };
}

export default function SuccessStories() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTestimonial, setSelectedTestimonial] = useState<Testimonial | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [form, setForm] = useState<TestimonialForm>(emptyForm);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchTestimonials = async () => {
    setLoading(true);
    try {
      const res = await api.get<Testimonial[]>("/api/admin/testimonials");
      if (res.success && Array.isArray(res.data)) {
        setTestimonials(res.data);
      }
    } catch {
      toast.error("Failed to load success stories");
      setTestimonials([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTestimonials();
  }, []);

  const resetImageState = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openAddDialog = () => {
    setSelectedTestimonial(null);
    setForm(emptyForm);
    resetImageState();
    setDialogOpen(true);
  };

  const openEditDialog = (testimonial: Testimonial) => {
    setSelectedTestimonial(testimonial);
    setForm(toForm(testimonial));
    resetImageState();
    setDialogOpen(true);
  };

  const openDeleteDialog = (testimonial: Testimonial) => {
    setSelectedTestimonial(testimonial);
    setDeleteDialogOpen(true);
  };

  const updateForm = (field: keyof TestimonialForm, value: string | boolean) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/", ".heic", ".heif"];
    const fileName = file.name.toLowerCase();
    const isValidType = validTypes.some((type) => file.type.startsWith(type) || fileName.endsWith(type));
    if (!isValidType) {
      toast.error("Please select an image file");
      resetImageState();
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      resetImageState();
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const removePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    updateForm("image_url", "");
    resetImageState();
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    setUploading(true);

    try {
      const res = await api.upload("/api/upload", formData);
      if (res.success && res.data?.url) {
        return res.data.url;
      }
      return null;
    } catch {
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      let imageUrl = form.image_url;
      if (selectedFile) {
        const uploadedUrl = await uploadFile(selectedFile);
        if (!uploadedUrl) {
          toast.error("Failed to upload image");
          return;
        }
        imageUrl = uploadedUrl;
      }

      const payload = {
        name: form.name,
        role: form.role || "Patient",
        location: form.location,
        rating: Number(form.rating),
        content: form.content,
        image_url: imageUrl,
        is_published: form.is_published,
        order: form.order ? Number(form.order) : undefined,
      };

      const res = selectedTestimonial
        ? await api.patch(`/api/admin/testimonials/${selectedTestimonial._id}`, payload)
        : await api.post("/api/admin/testimonials", payload);

      if (res.success) {
        toast.success(selectedTestimonial ? "Success story updated" : "Success story posted");
        setDialogOpen(false);
        setSelectedTestimonial(null);
        resetImageState();
        setForm(emptyForm);
        await fetchTestimonials();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save success story");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTestimonial) return;
    setSubmitting(true);

    try {
      const res = await api.delete(`/api/admin/testimonials/${selectedTestimonial._id}`);
      if (res.success) {
        toast.success("Success story deleted");
        setDeleteDialogOpen(false);
        setSelectedTestimonial(null);
        await fetchTestimonials();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete success story");
    } finally {
      setSubmitting(false);
    }
  };

  const togglePublish = async (testimonial: Testimonial) => {
    try {
      const res = await api.patch(`/api/admin/testimonials/${testimonial._id}`, {
        is_published: !testimonial.is_published,
      });
      if (res.success) {
        toast.success(testimonial.is_published ? "Success story hidden" : "Success story published");
        await fetchTestimonials();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update success story");
    }
  };

  const publishedCount = testimonials.filter((testimonial) => testimonial.is_published).length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary mb-2">
              <Quote className="h-5 w-5" />
              <span className="text-sm font-medium">Content Management</span>
            </div>
            <h2 className="text-2xl font-semibold">Success Stories</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Post, edit, hide, or remove patient stories shown on the landing page.
            </p>
          </div>
          <Button onClick={openAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Post Story
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">{testimonials.length}</p>
              <p className="text-sm text-muted-foreground">Total Stories</p>
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
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Star className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {testimonials.length ? Math.round(testimonials.reduce((sum, item) => sum + item.rating, 0) / testimonials.length) : 0}
              </p>
              <p className="text-sm text-muted-foreground">Avg Rating</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : testimonials.length === 0 ? (
          <div className="col-span-full rounded-xl border border-border bg-card p-10 text-center">
            <Quote className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <h3 className="text-lg font-semibold">No success stories yet</h3>
            <p className="text-sm text-muted-foreground">Post the first patient story from here.</p>
          </div>
        ) : (
          testimonials.map((testimonial) => (
            <div key={testimonial._id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  {testimonial.image_url ? (
                    <img src={testimonial.image_url} alt={testimonial.name} className="h-12 w-12 rounded-full object-cover border border-border" />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                      {testimonial.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold">{testimonial.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {testimonial.role} • {testimonial.location || "Location not provided"}
                    </p>
                    <div className="flex gap-1 mt-2">
                      {Array.from({ length: Math.min(5, Math.max(0, Math.round(testimonial.rating))) }).map((_, index) => (
                        <Star key={index} className="h-4 w-4 text-secondary fill-secondary" />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => togglePublish(testimonial)}
                    title={testimonial.is_published ? "Hide story" : "Publish story"}
                  >
                    {testimonial.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openEditDialog(testimonial)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(testimonial)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-4 line-clamp-4">{testimonial.content}</p>
              <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                <span>{testimonial.is_published ? "Published" : "Hidden"}</span>
                <span>Order: {testimonial.order}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedTestimonial ? "Edit Success Story" : "Post Success Story"}</DialogTitle>
            <DialogDescription>
              Fill in the patient story details that should appear on the landing page.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Patient name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(event) => updateForm("name", event.target.value)}
                  placeholder="Diane Mukamana"
                  required
                />
              </div>
              <div>
                <Label htmlFor="role">Category</Label>
                <Input
                  id="role"
                  value={form.role}
                  onChange={(event) => updateForm("role", event.target.value)}
                  placeholder="Diabetic Patient"
                  required
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={form.location}
                  onChange={(event) => updateForm("location", event.target.value)}
                  placeholder="Kigali"
                />
              </div>
              <div>
                <Label htmlFor="rating">Rating</Label>
                <Input
                  id="rating"
                  type="number"
                  min="1"
                  max="5"
                  value={form.rating}
                  onChange={(event) => updateForm("rating", event.target.value)}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label>Story image</Label>
                <div className="flex items-start gap-4">
                  {(previewUrl || form.image_url) ? (
                    <div className="relative h-28 w-28 shrink-0 rounded-2xl overflow-hidden border bg-muted">
                      <img src={previewUrl || form.image_url} alt="Story preview" className="h-full w-full object-cover" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -right-2 -top-2 h-7 w-7 rounded-full"
                        onClick={removePhoto}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="h-28 w-28 shrink-0 rounded-2xl border border-dashed border-border bg-muted/50 flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary"
                    >
                      <Upload className="h-7 w-7 mb-2" />
                      <span className="text-xs font-medium">Upload</span>
                    </button>
                  )}
                  <div className="flex-1">
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      Choose image
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,.heic,.heif"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    <p className="text-xs text-muted-foreground mt-2">JPG, PNG, WEBP, HEIC/HEIF up to 5MB.</p>
                    {selectedFile && <p className="text-xs text-muted-foreground mt-1 truncate">{selectedFile.name}</p>}
                  </div>
                </div>
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
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <Switch
                  checked={form.is_published}
                  onCheckedChange={(checked) => updateForm("is_published", checked)}
                />
                <div>
                  <p className="text-sm font-medium">Publish immediately</p>
                  <p className="text-xs text-muted-foreground">Hidden stories are not shown on the landing page.</p>
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="content">Story</Label>
              <Textarea
                id="content"
                value={form.content}
                onChange={(event) => updateForm("content", event.target.value)}
                placeholder="The diabetic eye screening service is a blessing..."
                className="min-h-32"
                required
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || uploading}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {selectedTestimonial ? "Save Changes" : "Post Story"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete success story</DialogTitle>
            <DialogDescription>
              This will permanently remove the story from the admin list and the landing page.
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
