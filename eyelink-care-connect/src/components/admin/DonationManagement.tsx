import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card } from "@/components/ui/card";
import { api } from "@/lib/api";
import { Heart, Plus, Edit, Trash2, Save, ImageIcon, Upload, Loader2, Settings as SettingsIcon, FileText, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type DonationSettings = {
  mtn_number: string;
  airtel_number: string;
  headline: string;
  description: string;
  amount_labels: Record<string, string>;
};

type DonationPost = {
  _id: string;
  title: string;
  content: string;
  image_urls: string[];
  is_published: boolean;
  order: number;
  createdAt: string;
};

export default function DonationManagement() {
  const { toast } = useToast();
  const [settings, setSettings] = useState<DonationSettings | null>(null);
  const [posts, setPosts] = useState<DonationPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  const [postDialogOpen, setPostDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [selectedPost, setSelectedPost] = useState<DonationPost | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    image_urls: [] as string[],
    is_published: true,
    order: 0,
  });

  const fetchSettings = async () => {
    try {
      const res = await api.get<DonationSettings>("/api/admin/donations/settings");
      if (res.success && res.data) setSettings(res.data);
    } catch {
      toast({ title: "Error", description: "Failed to load donation settings", variant: "destructive" });
    }
  };

  const fetchPosts = async () => {
    try {
      const res = await api.get<{ success: boolean; data: DonationPost[] }>("/api/admin/donations/posts");
      if (res.success && Array.isArray(res.data)) setPosts(res.data);
    } catch {
      toast({ title: "Error", description: "Failed to load donation posts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchPosts();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await api.put("/api/admin/donations/settings", settings);
      if (res.success) {
        toast({ title: "Success", description: "Donation settings saved" });
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleOpenAddPost = () => {
    setEditMode(false);
    setSelectedPost(null);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData({ title: "", content: "", image_urls: [], is_published: true, order: posts.length });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPostDialogOpen(true);
  };

  const handleOpenEditPost = (post: DonationPost) => {
    setEditMode(true);
    setSelectedPost(post);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFormData({
      title: post.title,
      content: post.content,
      image_urls: post.image_urls || [],
      is_published: post.is_published,
      order: post.order,
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
    setPostDialogOpen(true);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
if (file.size > 10 * 1024 * 1024) {
         toast({ title: "Error", description: "Image size must be less than 10MB", variant: "destructive" });
        return;
      }
      setSelectedFile(file);
      try {
        const base64 = await fileToBase64(file);
        setPreviewUrl(base64);
      } catch {
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const base64 = await fileToBase64(file);
      return base64;
    } catch {
      return null;
    }
  };

  const handleSubmitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      let imageUrls = formData.image_urls;
      if (selectedFile) {
        const url = await uploadFile(selectedFile);
        if (url) imageUrls = [...imageUrls, url];
        else {
          toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
          setUploading(false);
          return;
        }
      }

      const payload = {
        title: formData.title,
        content: formData.content,
        image_urls: imageUrls,
        is_published: formData.is_published,
        order: formData.order,
      };

      let res;
      if (editMode && selectedPost) {
        res = await api.patch(`/api/admin/donations/posts/${selectedPost._id}`, payload);
      } else {
        res = await api.post("/api/admin/donations/posts", payload);
      }

      if (res.success) {
        toast({ title: "Success", description: editMode ? "Post updated" : "Post created" });
        setPostDialogOpen(false);
        fetchPosts();
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save post", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      const res = await api.delete(`/api/admin/donations/posts/${id}`);
      if (res.success) {
        toast({ title: "Success", description: "Post deleted" });
        setDeleteId(null);
        fetchPosts();
      } else {
        toast({ title: "Error", description: res.message, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete post", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
          <div className="h-64 bg-muted rounded-xl animate-pulse" />
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
              <Heart className="w-5 h-5" />
              <span className="text-sm font-medium">Donation Management</span>
            </div>
            <h2 className="text-2xl font-semibold">Donation Settings & Posts</h2>
            <p className="text-sm text-muted-foreground mt-1">Manage MTN/Airtel USSD codes and announcement posts</p>
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <Card className="p-6 border-2">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Payment Settings</h3>
            <p className="text-sm text-muted-foreground">Configure USSD codes for MTN and Airtel</p>
          </div>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Phone className="h-4 w-4 text-yellow-600" />
                MTN Mobile Money USSD Code
              </Label>
              <Input
                value={settings?.mtn_number || ""}
                onChange={(e) => setSettings(settings ? { ...settings, mtn_number: e.target.value } : null)}
                placeholder="e.g. *182*8*1*"
                className="h-11"
              />
            </div>
            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Phone className="h-4 w-4 text-red-600" />
                Airtel Money USSD Code
              </Label>
              <Input
                value={settings?.airtel_number || ""}
                onChange={(e) => setSettings(settings ? { ...settings, airtel_number: e.target.value } : null)}
                placeholder="e.g. *185*5#"
                className="h-11"
              />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Headline</Label>
            <Input
              value={settings?.headline || ""}
              onChange={(e) => setSettings(settings ? { ...settings, headline: e.target.value } : null)}
              placeholder="Support Our Mission"
              className="h-11"
            />
          </div>

          <div>
            <Label className="mb-2 block">Description</Label>
            <Textarea
              value={settings?.description || ""}
              onChange={(e) => setSettings(settings ? { ...settings, description: e.target.value } : null)}
              placeholder="Brief description shown on the donation page"
              className="min-h-[80px]"
            />
          </div>

          <Button type="submit" disabled={savingSettings || !settings}>
            <Save className="w-4 h-4 mr-2" />
            {savingSettings ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </Card>

      {/* Posts Section */}
      <Card className="p-6 border-2">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Announcement Posts</h3>
              <p className="text-sm text-muted-foreground">Posts with images shown on the donation page</p>
            </div>
          </div>
          <Button onClick={handleOpenAddPost}>
            <Plus className="w-4 h-4 mr-2" />
            Add Post
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {posts.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <ImageIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No posts yet. Click "Add Post" to create one.</p>
            </div>
          ) : (
            posts.map((post) => (
              <Card key={post._id} className="overflow-hidden border">
                {post.image_urls && post.image_urls.length > 0 ? (
                  <div className="h-40 w-full bg-muted">
                    <img
                      src={post.image_urls[0]}
                      alt={post.title}
                      className="w-full h-full object-cover object-center"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-32 w-full bg-muted flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold truncate">{post.title}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${post.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {post.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.content || "No content"}</p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditPost(post)}>
                      <Edit className="h-3 w-3 mr-1" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => setDeleteId(post._id)}>
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      {/* Post Dialog */}
      <Dialog open={postDialogOpen} onOpenChange={setPostDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Post" : "Add Post"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitPost} className="space-y-4 mt-2">
            <div>
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="h-10"
              />
            </div>
            <div>
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
            <div>
              <Label>Image</Label>
              <Input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="h-10" />
              {previewUrl && (
                <div className="mt-2 w-full h-32 bg-muted rounded overflow-hidden">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-cover object-center" />
                </div>
              )}
              {!previewUrl && formData.image_urls.length > 0 && (
                <div className="mt-2 w-full h-32 bg-muted rounded overflow-hidden">
                  <img src={formData.image_urls[0]} alt="Existing" className="w-full h-full object-cover object-center" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
              />
              <Label>Published</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPostDialogOpen(false)} disabled={uploading}>
                Cancel
              </Button>
              <Button type="submit" disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {editMode ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this post? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => deleteId && handleDeletePost(deleteId)}>Delete</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
