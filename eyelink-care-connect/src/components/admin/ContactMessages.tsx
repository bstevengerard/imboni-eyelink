import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Mail,
  Search,
  Filter,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Loader2,
  MessageSquare,
  Trash2,
  Eye,
  Send,
  Calendar,
  User,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/api";

type ContactMessage = {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  department?: string;
  subject: string;
  message: string;
  status: "new" | "read" | "responded";
  responded_by?: string;
  response_notes?: string;
  createdAt: string;
};

type ActionState = {
  id: string;
  status: ContactMessage["status"];
  label: string;
};

const statusConfig: Record<ContactMessage["status"], { label: string; className: string; icon: ReactNode }> = {
  new: {
    label: "New",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: <Mail className="h-3.5 w-3.5" />,
  },
  read: {
    label: "Read",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: <Eye className="h-3.5 w-3.5" />,
  },
  responded: {
    label: "Responded",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
};

const departmentLabels: Record<string, string> = {
  general: "General Inquiry",
  appointments: "Appointments",
  billing: "Billing & Insurance",
  technical: "Technical Support",
  partnership: "Partnership Opportunities",
  careers: "Careers",
};

export default function ContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [responseNotes, setResponseNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ContactMessage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      const res = await api.get<ContactMessage[]>("/api/admin/contact-messages", params);
      if (res.success && Array.isArray(res.data)) {
        setMessages(res.data);
      }
    } catch {
      toast.error("Failed to load contact messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [statusFilter]);

  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.subject.toLowerCase().includes(q) ||
        (m.department && m.department.toLowerCase().includes(q))
    );
  }, [messages, searchQuery]);

  const openDetail = (msg: ContactMessage) => {
    setSelectedMessage(msg);
    setResponseNotes(msg.response_notes || "");
  };

  const updateStatus = async (id: string, status: ContactMessage["status"]) => {
    setUpdating(true);
    try {
      const res = await api.patch<ContactMessage>(`/api/admin/contact-messages/${id}`, {
        status,
        responded_by: "admin",
        response_notes: status === "responded" ? responseNotes : undefined,
      });
      if (res.success) {
        toast.success("Message updated");
        setMessages((prev) =>
          prev.map((m) => (m._id === id ? { ...m, ...res.data } : m))
        );
        if (selectedMessage && selectedMessage._id === id) {
          setSelectedMessage({ ...selectedMessage, ...res.data });
        }
      }
    } catch {
      toast.error("Failed to update message");
    } finally {
      setUpdating(false);
    }
  };

  const deleteMessage = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/api/admin/contact-messages/${deleteTarget._id}`);
      toast.success("Message deleted");
      setMessages((prev) => prev.filter((m) => m._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete message");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Contact Messages</h2>
          <p className="text-muted-foreground text-sm">
            Manage inquiries submitted through the contact form
          </p>
        </div>
        <Button onClick={fetchMessages} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, subject..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Messages</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="read">Read</SelectItem>
            <SelectItem value="responded">Responded</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Messages Table / Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No contact messages found.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Sender</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Department</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Subject</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Date</th>
                  <th className="text-right px-6 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredMessages.map((msg) => (
                  <tr key={msg._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-foreground">{msg.name}</p>
                        <p className="text-xs text-muted-foreground">{msg.email}</p>
                        {msg.phone && <p className="text-xs text-muted-foreground">{msg.phone}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {departmentLabels[msg.department || "general"] || msg.department || "General"}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground line-clamp-1">{msg.subject}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig[msg.status].className}`}>
                        {statusConfig[msg.status].icon}
                        {statusConfig[msg.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {formatDate(msg.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDetail(msg)}
                          title="View & Respond"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteTarget(msg)}
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

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-border">
            {filteredMessages.map((msg) => (
              <div key={msg._id} className="p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <p className="font-medium text-foreground">{msg.name}</p>
                    <p className="text-xs text-muted-foreground">{msg.email}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusConfig[msg.status].className}`}>
                    {statusConfig[msg.status].icon}
                    {statusConfig[msg.status].label}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground mb-1">{msg.subject}</p>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{msg.message}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{formatDate(msg.createdAt)}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openDetail(msg)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(msg)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={(open) => !open && setSelectedMessage(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Message Details</DialogTitle>
            <DialogDescription>
              Submitted on {selectedMessage ? formatDate(selectedMessage.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedMessage && (
            <div className="space-y-6">
              {/* Sender Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Full Name</p>
                      <p className="font-medium text-foreground">{selectedMessage.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium text-foreground">{selectedMessage.email}</p>
                    </div>
                  </div>
                  {selectedMessage.phone && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium text-foreground">{selectedMessage.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="font-medium text-foreground">
                        {departmentLabels[selectedMessage.department || "general"] || selectedMessage.department || "General Inquiry"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Subject</p>
                      <p className="font-medium text-foreground">{selectedMessage.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Submitted</p>
                      <p className="font-medium text-foreground">{formatDate(selectedMessage.createdAt)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Message Body */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Message</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{selectedMessage.message}</p>
              </div>

              {/* Status Update */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Update Status</label>
                <div className="flex flex-wrap gap-2">
                  {(["new", "read", "responded"] as const).map((s) => (
                    <Button
                      key={s}
                      variant={selectedMessage.status === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateStatus(selectedMessage._id, s)}
                      disabled={updating}
                    >
                      {statusConfig[s].icon}
                      {statusConfig[s].label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Response Notes */}
              {selectedMessage.status !== "new" && (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Response Notes</label>
                  <Textarea
                    placeholder="Add internal notes about this inquiry..."
                    value={responseNotes}
                    onChange={(e) => setResponseNotes(e.target.value)}
                    rows={3}
                  />
                  <Button
                    size="sm"
                    onClick={() => updateStatus(selectedMessage._id, selectedMessage.status)}
                    disabled={updating}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Save Notes
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Message</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this contact message from {deleteTarget?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteMessage} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
