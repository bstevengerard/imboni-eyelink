import { useEffect, useState } from "react";
import { Calendar, Clock, Stethoscope, Loader2, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { api } from "@/lib/api";

type Service = { _id: string; name: string };
type Doctor = { _id: string; name: string };
type Appointment = {
  _id: string;
  doctorId: string;
  serviceTypeId: string;
  date: string;
  time: string;
  notes?: string;
  status?: string;
};

type BookingForm = {
  serviceTypeId: string;
  doctorId: string;
  date: string;
  time: string;
  notes: string;
};

export default function PatientAppointments() {
  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<BookingForm>({
    serviceTypeId: "",
    doctorId: "",
    date: "",
    time: "",
    notes: "",
  });

  const fetchServices = async () => {
    try {
      const res = await api.get<{ data: Service[] }>("/api/services");
      if (res.success && Array.isArray(res.data)) {
        setServices(res.data);
      }
    } catch {
      toast.error("Failed to load services");
    }
  };

  const fetchDoctors = async () => {
    try {
      const [doctorsRes, optosRes] = await Promise.all([
        api.get<{ data: Doctor[] }>("/api/admin/users", { role: "doctor" }),
        api.get<{ data: Doctor[] }>("/api/admin/users", { role: "optometrist" }),
      ]);
      const docs = [
        ...(doctorsRes.success && Array.isArray(doctorsRes.data) ? doctorsRes.data : []),
        ...(optosRes.success && Array.isArray(optosRes.data) ? optosRes.data : []),
      ];
      setDoctors(docs);
    } catch {
      toast.error("Failed to load doctors");
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await api.get<{ data: Appointment[] }>("/api/patient/appointments");
      if (res.success && Array.isArray(res.data)) {
        setAppointments(res.data);
      }
    } catch {
      // silent for refresh
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await Promise.all([fetchServices(), fetchDoctors(), fetchAppointments()]);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.serviceTypeId || !formData.doctorId || !formData.date || !formData.time) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        doctorId: formData.doctorId,
        serviceTypeId: formData.serviceTypeId,
        date: formData.date,
        time: formData.time,
      };
      if (formData.notes.trim()) payload.notes = formData.notes.trim();

      const res = await api.post("/api/patient/appointments", payload);
      if (res.success) {
        toast.success("Booking request sent");
        setFormData({ serviceTypeId: "", doctorId: "", date: "", time: "", notes: "" });
        await fetchAppointments();
      } else {
        toast.error(res.message || "Failed to submit booking");
      }
    } catch {
      toast.error("Failed to submit booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />
        <div className="relative z-10 flex items-center gap-3">
          <Calendar className="w-6 h-6" />
          <div>
            <h2 className="text-2xl font-bold">Book an Appointment</h2>
            <p className="text-white/80 text-sm mt-1">Select a service, doctor, and preferred time</p>
          </div>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label htmlFor="service">Service</Label>
              <Select
                value={formData.serviceTypeId}
                onValueChange={(value) =>
                  setFormData({ ...formData, serviceTypeId: value })
                }
              >
                <SelectTrigger id="service">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service._id} value={service._id}>
                      {service.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="doctor">Doctor / Optometrist</Label>
              <Select
                value={formData.doctorId}
                onValueChange={(value) =>
                  setFormData({ ...formData, doctorId: value })
                }
              >
                <SelectTrigger id="doctor">
                  <SelectValue placeholder="Select doctor" />
                </SelectTrigger>
                <SelectContent>
                  {doctors.map((doctor) => (
                    <SelectItem key={doctor._id} value={doctor._id}>
                      {doctor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="date"
                  type="date"
                  className="pl-9"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData({ ...formData, date: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="time"
                  type="time"
                  className="pl-9"
                  value={formData.time}
                  onChange={(e) =>
                    setFormData({ ...formData, time: e.target.value })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional details..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full md:w-auto"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Stethoscope className="w-4 h-4 mr-2" />
                Submit Booking
              </>
            )}
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ClipboardList className="w-5 h-5" />
          My Appointments
        </h3>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : appointments.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <ClipboardList className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">No appointments yet</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <Card key={apt._id} className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">
                      {services.find((s) => s._id === apt.serviceTypeId)?.name || "Service"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {doctors.find((d) => d._id === apt.doctorId)?.name || "Doctor"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {apt.date}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {apt.time}
                    </span>
                    {apt.status && (
                      <span className="px-2 py-0.5 rounded bg-muted text-[11px] capitalize">
                        {apt.status}
                      </span>
                    )}
                  </div>
                </div>
                {apt.notes && (
                  <p className="text-xs text-muted-foreground mt-2 border-t pt-2">
                    {apt.notes}
                  </p>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
