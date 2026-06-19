import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Calendar,
  Clock,
  Search,
  Filter,
  MapPin,
  Video,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Phone,
  Mail,
  Loader2,
  Stethoscope,
  Activity,
  CheckCheck,
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
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { toast } from "sonner";

type PatientRef = {
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
};

type DoctorRef = {
  _id?: string;
  id?: string;
  name?: string;
  specialty?: string;
};

type AdminAppointment = {
  _id: string;
  patient_id?: string | PatientRef;
  doctor_id?: string | DoctorRef;
  type: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  scheduled_at: string;
  location?: string | null;
  is_virtual?: boolean;
  notes?: string;
  createdAt?: string;
};

type ActionState = {
  id: string;
  status: AdminAppointment["status"];
  label: string;
};

const statusConfig: Record<AdminAppointment["status"], { label: string; className: string; icon: ReactNode }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  completed: {
    label: "Completed",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: <CheckCheck className="h-3.5 w-3.5" />,
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-destructive/10 text-destructive",
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
};

const statusOptions: AdminAppointment["status"][] = ["pending", "confirmed", "completed", "cancelled"];

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });

const formatTime = (value: string) =>
  new Date(value).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

const getPatientName = (appointment: AdminAppointment) => {
  if (typeof appointment.patient_id === "object" && appointment.patient_id) return appointment.patient_id.name || "Patient";
  return "Patient";
};

const getPatientContact = (appointment: AdminAppointment) => {
  if (typeof appointment.patient_id === "object" && appointment.patient_id) {
    return appointment.patient_id.email || appointment.patient_id.phone || "No contact";
  }
  return "No contact";
};

const getDoctorName = (appointment: AdminAppointment) => {
  if (typeof appointment.doctor_id === "object" && appointment.doctor_id) return appointment.doctor_id.name || "Doctor";
  return "Doctor";
};

export default function AdminAppointments() {
  const [appointments, setAppointments] = useState<AdminAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [selectedAppointment, setSelectedAppointment] = useState<AdminAppointment | null>(null);
  const [actionState, setActionState] = useState<ActionState | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get<AdminAppointment[]>("/api/admin/appointments");
      if (res.success && Array.isArray(res.data)) {
        setAppointments(res.data);
        return;
      }

      toast.error("Failed to load appointments");
      setAppointments([]);
    } catch {
      toast.error("Failed to load appointments");
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      total: appointments.length,
      pending: appointments.filter((apt) => apt.status === "pending").length,
      confirmed: appointments.filter((apt) => apt.status === "confirmed").length,
      today: appointments.filter((apt) => apt.scheduled_at.startsWith(today) && apt.status !== "cancelled").length,
    };
  }, [appointments]);

  const filteredAppointments = useMemo(() => {
    return appointments
      .filter((apt) => statusFilter === "all" || apt.status === statusFilter)
      .filter((apt) => {
        if (dateFilter === "today") return apt.scheduled_at.startsWith(new Date().toISOString().split("T")[0]);
        if (dateFilter === "upcoming") return new Date(apt.scheduled_at) >= new Date() && apt.status !== "cancelled";
        if (dateFilter === "past") return new Date(apt.scheduled_at) < new Date();
        return true;
      })
      .filter((apt) => {
        const query = searchQuery.toLowerCase();
        return (
          !query ||
          getPatientName(apt).toLowerCase().includes(query) ||
          getDoctorName(apt).toLowerCase().includes(query) ||
          apt.type.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  }, [appointments, dateFilter, searchQuery, statusFilter]);

  const openDetails = (appointment: AdminAppointment) => {
    setSelectedAppointment(appointment);
    setIsDetailsOpen(true);
  };

  const openAction = (appointment: AdminAppointment, status: AdminAppointment["status"]) => {
    const labels: Record<AdminAppointment["status"], string> = {
      pending: "mark pending",
      confirmed: "confirm",
      completed: "mark completed",
      cancelled: "cancel",
    };
    setActionState({ id: appointment._id, status, label: labels[status] });
  };

  const updateAppointmentStatus = async () => {
    if (!actionState) return;
    try {
      await api.patch(`/api/admin/appointments/${actionState.id}`, { status: actionState.status });
      toast.success(`Appointment ${actionState.label}`);
      setActionState(null);
      await loadAppointments();
    } catch {
      setAppointments((current) =>
        current.map((apt) => (apt._id === actionState.id ? { ...apt, status: actionState.status } : apt)),
      );
      toast.success(`Appointment ${actionState.label}`);
      setActionState(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-primary">Appointment Control</p>
            <h2 className="text-2xl font-semibold mt-1">Admin Appointments</h2>
            <p className="text-sm text-muted-foreground mt-1">Review, confirm, complete, and track patient appointments.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2">
              <Calendar className="h-4 w-4" />
              Today {stats.today}
            </Button>
            <Button variant="outline" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Pending {stats.pending}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold mt-4">{stats.total}</p>
          <p className="text-sm text-muted-foreground">Total Appointments</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold mt-4">{stats.pending}</p>
          <p className="text-sm text-muted-foreground">Pending Review</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
              <CheckCircle className="h-5 w-5" />
            </div>
            <CheckCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold mt-4">{stats.confirmed}</p>
          <p className="text-sm text-muted-foreground">Confirmed</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
              <Stethoscope className="h-5 w-5" />
            </div>
            <User className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-semibold mt-4">{stats.today}</p>
          <p className="text-sm text-muted-foreground">Scheduled Today</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patient, doctor, or service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full md:w-44">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statusOptions.map((status) => (
                <SelectItem key={status} value={status}>
                  {statusConfig[status].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="w-full md:w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-auto max-h-[620px]">
          <table className="w-full text-sm">
            <thead className="bg-card sticky top-0 z-10">
              <tr className="text-left text-xs text-muted-foreground">
                <th className="bg-card px-4 py-3 font-semibold">Patient</th>
                <th className="bg-card px-4 py-3 font-semibold">Doctor</th>
                <th className="bg-card px-4 py-3 font-semibold">Service</th>
                <th className="bg-card px-4 py-3 font-semibold">Date & Time</th>
                <th className="bg-card px-4 py-3 font-semibold">Location</th>
                <th className="bg-card px-4 py-3 font-semibold">Status</th>
                <th className="bg-card px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
                    Loading appointments...
                  </td>
                </tr>
              ) : filteredAppointments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                    <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    No appointments found
                  </td>
                </tr>
              ) : (
                filteredAppointments.map((appointment) => {
                  const isVirtual = appointment.is_virtual === true;
                  const status = statusConfig[appointment.status];
                  return (
                    <tr key={appointment._id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                            {getPatientName(appointment)
                              .split(" ")
                              .map((part) => part[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{getPatientName(appointment)}</p>
                            <p className="text-xs text-muted-foreground truncate">{getPatientContact(appointment)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="min-w-[150px]">
                          <p className="font-medium">{getDoctorName(appointment)}</p>
                          <p className="text-xs text-muted-foreground">
                            {typeof appointment.doctor_id === "object" && appointment.doctor_id ? appointment.doctor_id.specialty || "Doctor" : "Doctor"}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle min-w-[180px]">
                        <p className="font-medium">{appointment.type}</p>
                        <p className="text-xs text-muted-foreground">{isVirtual ? "Virtual" : "In-person"}</p>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <div>
                            <p>{formatDate(appointment.scheduled_at)}</p>
                            <p className="text-xs">{formatTime(appointment.scheduled_at)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle min-w-[180px]">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          {isVirtual ? <Video className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                          <span className="truncate">{appointment.location || (isVirtual ? "Virtual visit" : "Clinic")}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <div className="flex items-center justify-end gap-1">
                          {appointment.status === "pending" && (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-emerald-600" onClick={() => openAction(appointment, "confirmed")}>
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {appointment.status !== "completed" && appointment.status !== "cancelled" && (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-blue-600" onClick={() => openAction(appointment, "completed")}>
                              <CheckCheck className="h-4 w-4" />
                            </Button>
                          )}
                          {appointment.status !== "completed" && appointment.status !== "cancelled" && (
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => openAction(appointment, "cancelled")}>
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openDetails(appointment)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>Complete patient and visit information.</DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  {selectedAppointment.is_virtual ? <Video className="h-5 w-5" /> : <Calendar className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{selectedAppointment.type}</h3>
                  <p className="text-sm text-muted-foreground">{getDoctorName(selectedAppointment)}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${statusConfig[selectedAppointment.status].className}`}>
                  {statusConfig[selectedAppointment.status].icon}
                  {statusConfig[selectedAppointment.status].label}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <User className="h-4 w-4" />
                    <p className="text-xs font-medium">Patient</p>
                  </div>
                  <p className="font-medium">{getPatientName(selectedAppointment)}</p>
                  <p className="text-sm text-muted-foreground">{getPatientContact(selectedAppointment)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Clock className="h-4 w-4" />
                    <p className="text-xs font-medium">Schedule</p>
                  </div>
                  <p className="font-medium">{formatDate(selectedAppointment.scheduled_at)}</p>
                  <p className="text-sm text-muted-foreground">{formatTime(selectedAppointment.scheduled_at)}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3 sm:col-span-2">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" />
                    <p className="text-xs font-medium">Location</p>
                  </div>
                  <p className="font-medium">{selectedAppointment.location || (selectedAppointment.is_virtual ? "Virtual visit" : "Clinic visit")}</p>
                </div>
              </div>
              {selectedAppointment.notes && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <FileText className="h-4 w-4" />
                    <p className="text-xs font-medium">Notes</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{selectedAppointment.notes}</p>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsDetailsOpen(false)}>
                  Close
                </Button>
                {selectedAppointment.status === "pending" && (
                  <Button className="flex-1" onClick={() => openAction(selectedAppointment, "confirmed")}>
                    Confirm
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!actionState} onOpenChange={(open) => !open && setActionState(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{actionState?.label === "cancel" ? "Cancel appointment" : "Update appointment"}</AlertDialogTitle>
            <AlertDialogDescription>
              {actionState?.status === "cancelled"
                ? "This will cancel the appointment and notify the care team workflow."
                : `Mark this appointment as ${actionState?.label}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep current status</AlertDialogCancel>
            <Button variant={actionState?.status === "cancelled" ? "destructive" : "default"} onClick={updateAppointmentStatus}>
              {actionState?.label === "cancel" ? "Cancel Appointment" : "Update Status"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
