import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  BookOpen,
  Calendar,
  ExternalLink,
  Download,
  Eye,
  X,
  FileText,
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

type ResearchArticle = {
  _id: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  category: string;
  abstract: string;
  download_url: string | null;
  external_url: string | null;
  citations: number;
  is_published: boolean;
  createdAt: string;
};

export default function ResearchLibrary() {
  const [articles, setArticles] = useState<ResearchArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<ResearchArticle | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    authors: "",
    journal: "",
    year: "",
    category: "",
    abstract: "",
    download_url: "",
    external_url: "",
    citations: "",
    is_published: true,
  });

  const fetchArticles = async () => {
    setLoading(true);
    try {
      const res = await api.get<ResearchArticle[]>("/api/admin/research");
      if (res.success && Array.isArray(res.data)) {
        setArticles(res.data);
      }
    } catch {
      toast.error("Failed to load research articles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const filteredArticles = articles.filter((a) =>
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.authors.some((author) => author.toLowerCase().includes(searchQuery.toLowerCase())) ||
    a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const resetForm = () => {
    setFormData({
      title: "",
      authors: "",
      journal: "",
      year: "",
      category: "",
      abstract: "",
      download_url: "",
      external_url: "",
      citations: "",
      is_published: true,
    });
  };

  const openAddDialog = () => {
    resetForm();
    setSelectedArticle(null);
    setShowAddDialog(true);
  };

  const openEditDialog = (article: ResearchArticle) => {
    setSelectedArticle(article);
    setFormData({
      title: article.title,
      authors: article.authors.join(", "),
      journal: article.journal || "",
      year: String(article.year),
      category: article.category,
      abstract: article.abstract || "",
      download_url: article.download_url || "",
      external_url: article.external_url || "",
      citations: String(article.citations),
      is_published: article.is_published,
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (article: ResearchArticle) => {
    setSelectedArticle(article);
    setShowDeleteDialog(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await api.post("/api/admin/research", {
        title: formData.title,
        authors: formData.authors.split(",").map((a) => a.trim()).filter(Boolean),
        journal: formData.journal || undefined,
        year: Number(formData.year),
        category: formData.category,
        abstract: formData.abstract || undefined,
        download_url: formData.download_url || undefined,
        external_url: formData.external_url || undefined,
        citations: Number(formData.citations) || 0,
        is_published: formData.is_published,
      });
      if (res.success) {
        toast.success("Article added successfully!");
        setShowAddDialog(false);
        resetForm();
        fetchArticles();
      }
    } catch {
      toast.error("Failed to add article");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedArticle) return;
    setIsSubmitting(true);
    try {
      const res = await api.patch(`/api/admin/research/${selectedArticle._id}`, {
        title: formData.title,
        authors: formData.authors.split(",").map((a) => a.trim()).filter(Boolean),
        journal: formData.journal || undefined,
        year: Number(formData.year),
        category: formData.category,
        abstract: formData.abstract || undefined,
        download_url: formData.download_url || undefined,
        external_url: formData.external_url || undefined,
        citations: Number(formData.citations) || 0,
        is_published: formData.is_published,
      });
      if (res.success) {
        toast.success("Article updated successfully!");
        setShowEditDialog(false);
        resetForm();
        fetchArticles();
      }
    } catch {
      toast.error("Failed to update article");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedArticle) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/api/admin/research/${selectedArticle._id}`);
      toast.success("Article deleted");
      setShowDeleteDialog(false);
      setSelectedArticle(null);
      fetchArticles();
    } catch {
      toast.error("Failed to delete article");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Research Library</h2>
          <p className="text-muted-foreground text-sm">
            Manage publications, studies, and research articles
          </p>
        </div>
        <Button onClick={openAddDialog} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Article
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, author, or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredArticles.length === 0 ? (
        <div className="text-center py-16">
          <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No articles found.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Title</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Authors</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Year</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredArticles.map((article) => (
                  <tr key={article._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground line-clamp-1">{article.title}</p>
                      <p className="text-xs text-muted-foreground">{article.journal}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {article.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {article.authors.slice(0, 2).join(", ")}
                      {article.authors.length > 2 && " +"}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {article.year}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        article.is_published
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"
                      }`}>
                        {article.is_published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(article)}
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeleteDialog(article)}
                          title="Delete"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
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

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog || showEditDialog} onOpenChange={(open) => {
        if (!open) {
          setShowAddDialog(false);
          setShowEditDialog(false);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{showEditDialog ? "Edit Article" : "Add New Article"}</DialogTitle>
            <DialogDescription>
              {showEditDialog ? "Update article details below" : "Fill in the article details below"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={showEditDialog ? handleEdit : handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Glaucoma, Pediatrics"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="authors">Authors (comma-separated)</Label>
              <Input
                id="authors"
                value={formData.authors}
                onChange={(e) => setFormData({ ...formData, authors: e.target.value })}
                placeholder="Dr. Jane Doe, Dr. John Smith"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="journal">Journal / Publication</Label>
              <Input
                id="journal"
                value={formData.journal}
                onChange={(e) => setFormData({ ...formData, journal: e.target.value })}
                placeholder="East African Journal of Ophthalmology"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="abstract">Abstract</Label>
              <Textarea
                id="abstract"
                value={formData.abstract}
                onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                rows={3}
                placeholder="Brief summary of the research..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="download_url">Download PDF URL</Label>
                <Input
                  id="download_url"
                  value={formData.download_url}
                  onChange={(e) => setFormData({ ...formData, download_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="external_url">View Online URL</Label>
                <Input
                  id="external_url"
                  value={formData.external_url}
                  onChange={(e) => setFormData({ ...formData, external_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="is_published"
                type="checkbox"
                checked={formData.is_published}
                onChange={(e) => setFormData({ ...formData, is_published: e.target.checked })}
                className="rounded border-border"
              />
              <Label htmlFor="is_published" className="cursor-pointer">Published (visible on public Research Library page)</Label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => {
                setShowAddDialog(false);
                setShowEditDialog(false);
                resetForm();
              }} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {showEditDialog ? "Update" : "Create"} Article
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={showDeleteDialog} onOpenChange={(open) => !open && setShowDeleteDialog(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedArticle?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
