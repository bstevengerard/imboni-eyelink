import { useEffect, useState } from "react";
import {
  Search,
  Plus,
  Shield,
  User,
  Stethoscope,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  Loader2,
  Users as UsersIcon,
  TrendingUp,
  Filter,
  Mail,
  Calendar,
  Phone,
  MapPin,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

type UserRow = {
  _id: string;
  pt_id: string | null;
  dr_id: string | null;
  name: string;
  email: string;
  role: string;
  status: string;
  last_login: string | null;
  hospital_name: string | null;
  phone: string | null;
  district: string | null;
  specialty: string | null;
  createdAt: string;
};

type AddUserForm = {
  name: string;
  email: string;
  password: string;
  role: string;
  phone: string;
  district: string;
  specialty?: string;
};

const districts = [
  "Nyarugenge",
  "Gasabo",
  "Kicukiro",
  "Nyanza",
  "Gisagara",
  "Nyaruguru",
  "Huye",
  "Nyamagabe",
  "Ruhango",
  "Muhanga",
  "Kamonyi",
  "Karongi",
  "Rusizi",
  "Rutsiro",
  "Nyamasheke",
  "Ngororero",
  "Rubavu",
  "Nyabihu",
  "Musanze",
  "Burera",
  "Gicumbi",
  "Rulindo",
  "Gakenke",
  "Bugesera",
  "Rwamagana",
  "Kayonza",
  "Ngoma",
  "Kirehe",
  "Nyagatare",
  "Gatsibo",
];

const roleConfig: Record<
  string,
  {
    icon: React.ComponentType<any>;
    gradient: string;
    bgLight: string;
    text: string;
    label: string;
  }
> = {
  admin: {
    icon: Shield,
    gradient: "from-purple-500 to-violet-600",
    bgLight: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-700 dark:text-purple-400",
    label: "Admin",
  },
  doctor: {
    icon: Stethoscope,
    gradient: "from-blue-500 to-cyan-600",
    bgLight: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-700 dark:text-blue-400",
    label: "Doctor",
  },
  optometrist: {
    icon: Stethoscope,
    gradient: "from-indigo-500 to-purple-600",
    bgLight: "bg-indigo-100 dark:bg-indigo-900/30",
    text: "text-indigo-700 dark:text-indigo-400",
    label: "Optometrist",
  },
  patient: {
    icon: User,
    gradient: "from-emerald-500 to-teal-600",
    bgLight: "bg-emerald-100 dark:bg-emerald-900/30",
    text: "text-emerald-700 dark:text-emerald-400",
    label: "Patient",
  },
};

const statusConfig: Record<
  string,
  { bgLight: string; label: string }
> = {
  active: {
    bgLight: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    label: "Active",
  },
  inactive: {
    bgLight: "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400",
    label: "Inactive",
  },
  pending: {
    bgLight: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    label: "Pending",
  },
};

export default function UserManagement() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditUser, setShowEditUser] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editFormData, setEditFormData] = useState<AddUserForm>({
    name: "",
    email: "",
    password: "",
    role: "patient",
    phone: "",
    district: "",
    specialty: "",
  });
  const [formData, setFormData] = useState<AddUserForm>({
    name: "",
    email: "",
    password: "",
    role: "patient",
    phone: "",
    district: "",
    specialty: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<{ data: UserRow[] }>("/api/admin/users");
        if (!cancelled && res.success && Array.isArray(res.data)) {
          setUsers(res.data);
        }
      } catch {
        if (!cancelled) setUsers([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredUsers = users.filter((user) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower) ||
      (user.pt_id && user.pt_id.toLowerCase().includes(searchLower)) ||
      (user.dr_id && user.dr_id.toLowerCase().includes(searchLower));
    const matchesRole = selectedRole === "all" || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleApprove = async (userId: string) => {
    try {
      await api.patch(`/api/admin/users/${userId}/approve`);
      toast.success("User approved successfully");
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, status: "active" } : u)));
    } catch {
      toast.error("Failed to approve user");
    }
  };

  const handleDeactivate = async (userId: string) => {
    try {
      await api.patch(`/api/admin/users/${userId}/deactivate`);
      toast.success("User deactivated");
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, status: "inactive" } : u)));
    } catch {
      toast.error("Failed to deactivate user");
    }
  };

  const handleDeleteUser = (user: UserRow) => {
    setDeleteTarget(user);
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/api/admin/users/${deleteTarget._id}`);
      toast.success("User deleted successfully");
      setUsers((prev) => prev.filter((u) => u._id !== deleteTarget._id));
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (!formData.email || !formData.email.trim()) {
      toast.error("Email is required");
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!formData.role) {
      toast.error("Role is required");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        role: formData.role,
      };

      if (formData.role === "patient") {
        if (formData.phone.trim()) payload.phone = formData.phone.trim();
        if (formData.district) payload.district = formData.district;
      }

      if (formData.specialty?.trim()) {
        payload.specialty = formData.specialty.trim();
      }

      const res = await api.post("/api/admin/users", payload);
      if (res.success) {
        const idInfo = (res.data as Record<string, string> | undefined)?.pt_id
          ? `Patient ID: ${(res.data as Record<string, string>).pt_id}`
          : (res.data as Record<string, string> | undefined)?.dr_id
            ? `Doctor ID: ${(res.data as Record<string, string>).dr_id}`
            : "";

        toast.success(`User created successfully!${idInfo ? ` ${idInfo}` : ""}`);
        setShowAddUser(false);
        setFormData({
          name: "",
          email: "",
          password: "",
          role: "patient",
          phone: "",
          district: "",
          specialty: "",
        });

        const usersRes = await api.get<{ data: UserRow[] }>("/api/admin/users");
        if (usersRes.success && Array.isArray(usersRes.data)) {
          setUsers(usersRes.data);
        }
      } else {
        toast.error(res.message || "Failed to create user");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create user");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = (user: UserRow) => {
    setEditingUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      password: "",
      role: user.role,
      phone: user.phone || "",
      district: user.district || "",
      specialty: (user.role === 'doctor' || user.role === 'optometrist') ? (user as Record<string, string>).specialty || "" : "",
    });
    setShowEditUser(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    if (!editFormData.name || !editFormData.name.trim()) {
      toast.error("Full name is required");
      return;
    }
    if (editFormData.password && editFormData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: editFormData.name.trim(),
        email: editFormData.email.trim().toLowerCase(),
        role: editFormData.role,
      };

      if (editFormData.password) payload.password = editFormData.password;

      if (editFormData.role === "patient") {
        if (editFormData.phone.trim()) payload.phone = editFormData.phone.trim();
        if (editFormData.district) payload.district = editFormData.district;
      }

      if (
        (editFormData.role === "doctor" || editFormData.role === "optometrist") &&
        editFormData.specialty?.trim()
      ) {
        payload.specialty = editFormData.specialty.trim();
      }

      const res = await api.put(`/api/admin/users/${editingUser._id}`, payload);
      const body = res as Record<string, unknown>;
      if (res.success) {
        toast.success("User updated successfully!");
        setShowEditUser(false);
        setEditingUser(null);
        const usersRes = await api.get<{ data: UserRow[] }>("/api/admin/users");
        if (usersRes.success && Array.isArray(usersRes.data)) {
          setUsers(usersRes.data);
        }
      } else {
        toast.error((body.message as string) || "Failed to update user");
      }
     } catch (error) {
       toast.error(error instanceof Error ? error.message : "Failed to update user");
     } finally {
       setIsSubmitting(false);
     }
   };

  // ✅ Requirement: show correct generated ID based on role
  const getUserIdDisplay = (user: UserRow) => {
    if (user.role === "patient" && user.pt_id) {
      return (
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{user.pt_id}</span>
      );
    }

    if ((user.role === "doctor" || user.role === "optometrist") && user.dr_id) {
      return (
        <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{user.dr_id}</span>
      );
    }

    return null;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const [pageIndex, setPageIndex] = useState(0);
  const pageSize = 10;

  useEffect(() => {
    setPageIndex(0);
  }, [searchQuery, selectedRole]);

  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const currentPageItems = filteredUsers.slice(
    pageIndex * pageSize,
    pageIndex * pageSize + pageSize
  );

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <UsersIcon className="w-5 h-5" />
              <span className="text-sm font-medium text-white/80">User Management</span>
            </div>
            <h2 className="text-2xl font-bold">Platform Users</h2>
            <p className="text-white/80 text-sm mt-1">Manage all users and their permissions</p>
          </div>
          <Button
            onClick={() => setShowAddUser(true)}
            className="bg-white/20 hover:bg-white/30 text-white border-white/30 backdrop-blur-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="group relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <UsersIcon className="w-5 h-5 text-white/60" />
              <TrendingUp className="w-4 h-4 text-white/40" />
            </div>
            <p className="text-3xl font-bold">{users.length}</p>
            <p className="text-sm text-white/70">Total Users</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-blue-500 to-cyan-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <Stethoscope className="w-5 h-5 text-white/60" />
              <TrendingUp className="w-4 h-4 text-white/40" />
            </div>
            <p className="text-3xl font-bold">{users.filter((u) => u.role === "doctor").length}</p>
            <p className="text-sm text-white/70">Doctors</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <Stethoscope className="w-5 h-5 text-white/60" />
              <TrendingUp className="w-4 h-4 text-white/40" />
            </div>
            <p className="text-3xl font-bold">{users.filter((u) => u.role === "optometrist").length}</p>
            <p className="text-sm text-white/70">Optometrists</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <User className="w-5 h-5 text-white/60" />
              <TrendingUp className="w-4 h-4 text-white/40" />
            </div>
            <p className="text-3xl font-bold">{users.filter((u) => u.role === "patient").length}</p>
            <p className="text-sm text-white/70">Patients</p>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-xl p-5 bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <Shield className="w-5 h-5 text-white/60" />
              <TrendingUp className="w-4 h-4 text-white/40" />
            </div>
            <p className="text-3xl font-bold">{users.filter((u) => u.status === "pending").length}</p>
            <p className="text-sm text-white/70">Pending</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-card border-border"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="h-11 px-4 rounded-lg border bg-card text-sm min-w-[140px]"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admins</option>
            <option value="doctor">Doctors</option>
            <option value="optometrist">Optometrists</option>
            <option value="patient">Patients</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-card rounded-xl border border-border">
          <UsersIcon className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">No users found</p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-sm">
              <thead className="bg-card sticky top-0 z-10">
                <tr className="text-left">
                  <th className="bg-card px-4 py-3 font-semibold text-xs text-muted-foreground">User</th>
                  <th className="bg-card px-4 py-3 font-semibold text-xs text-muted-foreground">Role</th>
                  <th className="bg-card px-4 py-3 font-semibold text-xs text-muted-foreground">Status</th>
                  <th className="bg-card px-4 py-3 font-semibold text-xs text-muted-foreground">Created</th>
                  <th className="bg-card px-4 py-3 font-semibold text-xs text-muted-foreground text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentPageItems.map((user) => {
                  const roleConf = roleConfig[user.role];
                  const statusConf = statusConfig[user.status];
                  const RoleIcon = roleConf.icon;

                  return (
                    <tr key={user._id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-3 min-w-[220px]">
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${roleConf.gradient} flex items-center justify-center text-white font-bold text-xs`}
                          >
                            {getInitials(user.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs sm:text-sm truncate">{user.name}</div>
                            <div className="flex items-center gap-1.5 text-muted-foreground text-[11px] sm:text-xs">
                              <Mail className="w-3 h-3" />
                              <span className="truncate">{user.email}</span>
                            </div>
                            <div className="mt-1">{getUserIdDisplay(user)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium ${roleConf.bgLight} ${roleConf.text}`}
                        >
                          <RoleIcon className="w-3 h-3" />
                          {roleConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={`px-2 py-1 rounded-full text-[11px] font-medium ${statusConf.bgLight}`}
                        >
                          {statusConf.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle text-muted-foreground text-[11px] sm:text-xs">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-1 justify-end">
                          {(user.status === "pending" || user.status === "inactive") && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Approve"
                              onClick={() => handleApprove(user._id)}
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            title="Edit user"
                            onClick={() => handleEditUser(user)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            title="View details"
                            onClick={() => setSelectedUser(user)}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          {user.status !== "inactive" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Deactivate"
                              className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDeactivate(user._id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            title="Delete permanently"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteUser(user)}
                          >
                            <Trash2 className="w-4 h-4" />
                           </Button>
                         </div>
                       </td>
                     </tr>
                   );
                  })}
                </tbody>
              </table>
          </div>
        </div>
      )}

      {!loading && filteredUsers.length > 0 && (
        <div className="flex items-center justify-between">
          {pageCount > 1 && (
            <Pagination className="mt-2">
              <PaginationContent>
                <PaginationPrevious
                  onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
                  className={pageIndex === 0 ? "pointer-events-none opacity-50" : ""}
                />

                {Array.from({ length: pageCount })
                  .slice(0, 5)
                  .map((_, i) => {
                    const page = i;
                    return (
                      <PaginationItem key={page}>
                        <PaginationLink
                          isActive={pageIndex === page}
                          onClick={() => setPageIndex(page)}
                        >
                          {page + 1}
                        </PaginationLink>
                      </PaginationItem>
                    );
                  })}

                <PaginationNext
                  onClick={() => setPageIndex((p) => Math.min(pageCount - 1, p + 1))}
                  className={pageIndex >= pageCount - 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="w-5 h-5 text-primary" />
              </div>
              Add New User
            </DialogTitle>
            <DialogDescription>Create a new user account on the platform</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddUser} className="space-y-4 flex-1 overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="doctor">Doctor/Ophthalmologist</SelectItem>
                  <SelectItem value="optometrist">Optometrist</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.role === "patient" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+250 7XX XXX XXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Select
                      value={formData.district}
                      onValueChange={(value) => setFormData({ ...formData, district: value })}
                    >
                      <SelectTrigger className="pl-12">
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {(formData.role === "doctor" || formData.role === "optometrist") && (
              <div className="space-y-2">
                <Label htmlFor="specialty">Specialty</Label>
                <Input
                  id="specialty"
                  placeholder={
                    formData.role === "optometrist"
                      ? "e.g., Optometry, Vision Science"
                      : "e.g., Ophthalmology, Retina Specialist"
                  }
                  value={formData.specialty || ""}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                />
              </div>
            )}
          </form>

          <div className="flex gap-3 justify-end pt-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => setShowAddUser(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} onClick={handleAddUser}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Details Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleConfig[selectedUser?.role as keyof typeof roleConfig]?.gradient || "from-gray-500 to-gray-700"} flex items-center justify-center text-white font-bold shadow-lg`}>
                {selectedUser ? getInitials(selectedUser.name) : ""}
              </div>
              <div>
                <div>{selectedUser?.name}</div>
                <div className="text-sm font-normal text-muted-foreground">{selectedUser?.email}</div>
              </div>
            </DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground text-xs mb-1">Role</p>
                  <p className="font-medium capitalize flex items-center gap-1.5">
                    {(() => {
                      const RoleIcon = roleConfig[selectedUser.role as keyof typeof roleConfig]?.icon;
                      return RoleIcon ? <RoleIcon className="w-3.5 h-3.5" /> : null;
                    })()}
                    {roleConfig[selectedUser.role as keyof typeof roleConfig]?.label || selectedUser.role}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground text-xs mb-1">Status</p>
                  <p className="font-medium capitalize flex items-center gap-1.5">
                    {selectedUser.status === "active" ? (
                      <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    ) : selectedUser.status === "pending" ? (
                      <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                    {selectedUser.status}
                  </p>
                </div>

                {selectedUser.role === "patient" && selectedUser.pt_id && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground text-xs mb-1">Patient ID</p>
                    <p className="font-mono text-sm font-semibold">{selectedUser.pt_id}</p>
                  </div>
                )}

                {((selectedUser.role === "doctor" || selectedUser.role === "optometrist") && selectedUser.dr_id) && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground text-xs mb-1">Doctor ID</p>
                    <p className="font-mono text-sm font-semibold">{selectedUser.dr_id}</p>
                  </div>
                )}

                {(selectedUser as UserRow).specialty && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground text-xs mb-1">Specialty</p>
                    <p className="font-medium text-sm">{(selectedUser as UserRow).specialty}</p>
                  </div>
                )}

                {selectedUser.hospital_name && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground text-xs mb-1">Hospital</p>
                    <p className="font-medium text-sm">{selectedUser.hospital_name}</p>
                  </div>
                )}

                {(selectedUser as UserRow).phone && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground text-xs mb-1">Phone</p>
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      {(selectedUser as UserRow).phone}
                    </p>
                  </div>
                )}

                {(selectedUser as UserRow).district && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground text-xs mb-1">District</p>
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      {(selectedUser as UserRow).district}
                    </p>
                  </div>
                )}

                <div className="p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground text-xs mb-1">Created</p>
                  <p className="font-medium text-sm flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {new Date(selectedUser.createdAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>

                {selectedUser.last_login && (
                  <div className="p-3 rounded-lg bg-muted/50">
                    <p className="text-muted-foreground text-xs mb-1">Last Login</p>
                    <p className="font-medium text-sm flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      {new Date(selectedUser.last_login).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t">
                {selectedUser.status === "pending" && (
                  <Button className="flex-1" onClick={() => { handleApprove(selectedUser._id); setSelectedUser(null); }}>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                )}
                <Button variant="outline" className="flex-1" onClick={() => setSelectedUser(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <User className="w-5 h-5 text-primary" />
              </div>
              Edit User
            </DialogTitle>
            <DialogDescription>Update user role and details</DialogDescription>
          </DialogHeader>

          <form className="space-y-4 flex-1 overflow-y-auto pr-2 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Full Name</Label>
              <Input
                id="edit-name"
                placeholder="Enter full name"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                placeholder="user@example.com"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editFormData.role} onValueChange={(value) => setEditFormData({ ...editFormData, role: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="doctor">Doctor/Ophthalmologist</SelectItem>
                  <SelectItem value="optometrist">Optometrist</SelectItem>
                  <SelectItem value="patient">Patient</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editFormData.role === "patient" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="edit-phone"
                      type="tel"
                      placeholder="+250 7XX XXX XXX"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="pl-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-district">District</Label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Select
                      value={editFormData.district}
                      onValueChange={(value) => setEditFormData({ ...editFormData, district: value })}
                    >
                      <SelectTrigger className="pl-12">
                        <SelectValue placeholder="Select district" />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {(editFormData.role === "doctor" || editFormData.role === "optometrist") && (
              <div className="space-y-2">
                <Label htmlFor="edit-specialty">Specialty</Label>
                <Input
                  id="edit-specialty"
                  placeholder={
                    editFormData.role === "optometrist"
                      ? "e.g., Optometry, Vision Science"
                      : "e.g., Ophthalmology, Retina Specialist"
                  }
                  value={editFormData.specialty || ""}
                  onChange={(e) => setEditFormData({ ...editFormData, specialty: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
              <Input
                id="edit-password"
                type="password"
                placeholder="Enter new password"
                value={editFormData.password}
                onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                minLength={6}
              />
            </div>
          </form>

          <div className="flex gap-3 justify-end pt-4 border-t flex-shrink-0">
            <Button type="button" variant="outline" onClick={() => setShowEditUser(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={isSubmitting} onClick={handleSaveEdit}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" />
              Delete User
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? This action cannot be undone.
            </p>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteUser}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

