import { useState, useEffect } from "react";
import { Calendar, Clock, Search, Video, MapPin, CheckCircle, X, MoreVertical, User, Phone, Mail, FileText, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { api } from "@/lib/api";

type AptRow = {
  _id: string;
  patient_id: { _id: string; name: string } | null;
  type: string;
  status: string;
  scheduled_at: string;
  location?: string | null;
  is_virtual: boolean;
  notes?: string;
  patient_name?: string;
  patient_email?: string;
  patient_phone?: string;
};

const statusColors: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700",
  pending: "bg-yellow-100 text-yellow-700",
  completed: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
};

type AptResponse = {
  data: AptRow[];
  total?: number;
  page?: number;
  limit?: number;
};

export default function DoctorAppointments() {
  const [appointments, setAppointments] = useState<AptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState<AptRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAppointments = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get<AptResponse>(`/api/doctor/appointments?page=${page}&limit=20`);
      if (res.success) {
        const rows = (res.data || []).map((r) => ({
          ...r,
          patient_name: r.patient_id && typeof r.patient_id === 'object' ? r.patient_id.name || 'Patient' : 'Patient',
          patient_email: r.patient_id && typeof r.patient_id === 'object' ? (r.patient_id as any).email || '' : '',
          patient_phone: r.patient_id && typeof r.patient_id === 'object' ? (r.patient_id as any).phone || '' : '',
        }));
        setAppointments(rows);
        setTotalPages(res.total ? Math.ceil(res.total / 20) : 1);
        setTotalCount(res.total || 0);
        setCurrentPage(page);
      }
    } catch {
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments(1);
  }, []);

  const updateStatus = async (id: string, status: 'confirmed' | 'cancelled' | 'completed') => {
    setUpdatingId(id);
    try {
      await api.patch(`/api/doctor/appointments/${id}`, { status });
      setAppointments((prev) => prev.map((apt) => (apt._id === id ? { ...apt, status } : apt)));
      toast.success(`Appointment ${status}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update appointment');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStartCall = async (appointmentId: string) => {
    try {
      const res = await api.post<{ data: { meetingUri: string } }>('/api/meetings/spaces', {
        appointmentId,
      });
      if (!res.success || !res.data?.meetingUri) {
        toast.error(res.message || 'Failed to start call');
        return;
      }
      window.open(res.data.meetingUri, '_blank', 'noopener,noreferrer');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start call');
    }
  };

  const handleViewDetails = (apt: AptRow) => { setSelectedAppointment(apt); setIsDetailsOpen(true); };

  const handlePrevPage = () => {
    if (currentPage > 1) fetchAppointments(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) fetchAppointments(currentPage + 1);
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesSearch = (apt.patient_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "all" || apt.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getAptTime = (scheduled_at: string) => new Date(scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = filteredAppointments.filter((apt) => new Date(apt.scheduled_at).toISOString().split('T')[0] === today);
  const upcomingAppointments = filteredAppointments.filter((apt) => new Date(apt.scheduled_at).toISOString().split('T')[0] !== today);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div><h2 className="text-2xl font-bold">Appointments</h2><p className="text-muted-foreground">Manage your patient appointments</p></div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : (
      <>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input placeholder="Search patients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
          </div>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="h-10 px-4 rounded-md border bg-background">
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />Today's Appointments ({todayAppointments.length})</h3>
          <div className="space-y-3">
            {todayAppointments.map((apt) => (
              <div key={apt._id} className="card-elevated p-5 flex flex-col md:flex-row md:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    {apt.is_virtual ? <Video className="w-6 h-6 text-primary" /> : <span className="font-medium text-primary">{apt.patient_name?.split(' ').map(n => n[0]).join('')}</span>}
                  </div>
                  <div><p className="font-semibold">{apt.patient_name || 'Patient'}</p><p className="text-sm text-muted-foreground">{apt.type}</p></div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground"><Clock className="w-4 h-4" /><span>{getAptTime(apt.scheduled_at)}</span></div>
                  {apt.location && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4" /><span>{apt.location}</span></div>}
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[apt.status] || ''}`}>{apt.status}</span>
                </div>
                <div className="flex gap-2">
                  {apt.status === 'pending' && (
                    <>
                      <Button size="sm" variant="outline" className="text-green-600" onClick={() => updateStatus(apt._id, 'confirmed')} disabled={updatingId === apt._id}><CheckCircle className="w-4 h-4 mr-1" />Confirm</Button>
                      <Button size="sm" variant="outline" className="text-red-600" onClick={() => updateStatus(apt._id, 'cancelled')} disabled={updatingId === apt._id}><X className="w-4 h-4 mr-1" />Decline</Button>
                    </>
                  )}
                  {apt.is_virtual && apt.status === 'confirmed' && <Button size="sm" onClick={() => handleStartCall(apt._id)}><Video className="w-4 h-4 mr-1" />Start Call</Button>}
                  {apt.status === 'confirmed' && !apt.is_virtual && <Button size="sm" onClick={() => handleStartCall(apt._id)}><Video className="w-4 h-4 mr-1" />Start Session</Button>}
                  {apt.status === 'confirmed' && <Button size="sm" variant="outline" className="text-blue-600" onClick={() => updateStatus(apt._id, 'completed')} disabled={updatingId === apt._id}><CheckCircle className="w-4 h-4 mr-1" />Complete</Button>}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button size="sm" variant="ghost"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => handleViewDetails(apt)}>View Details</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {todayAppointments.length === 0 && <p className="text-muted-foreground text-sm py-4">No appointments today.</p>}
          </div>
        </div>

        {upcomingAppointments.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-muted-foreground" />Upcoming ({upcomingAppointments.length})</h3>
            <div className="space-y-3">
              {upcomingAppointments.map((apt) => (
                <div key={apt._id} className="card-elevated p-5 flex flex-col md:flex-row md:items-center gap-4 opacity-80">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                      <span className="font-medium text-muted-foreground">{apt.patient_name?.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div><p className="font-semibold">{apt.patient_name || 'Patient'}</p><p className="text-sm text-muted-foreground">{apt.type}</p></div>
                  </div>
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-muted-foreground">
                      <p>{new Date(apt.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                      <p>{getAptTime(apt.scheduled_at)}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[apt.status] || ''}`}>{apt.status}</span>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => handleViewDetails(apt)}>View Details</Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!searchQuery && selectedStatus === "all" && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" /> Previous</Button>
            <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>Next <ChevronRight className="w-4 h-4" /></Button>
          </div>
        )}
      </>
      )}

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Appointment Details</DialogTitle><DialogDescription>Review appointment and patient information</DialogDescription></DialogHeader>
          {selectedAppointment && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${selectedAppointment.is_virtual ? 'bg-blue-100' : 'bg-primary/10'}`}>
                  {selectedAppointment.is_virtual ? <Video className="h-6 w-6 text-blue-600" /> : <Calendar className="h-6 w-6 text-primary" />}
                </div>
                <div><h3 className="font-semibold text-lg">{selectedAppointment.type}</h3><p className="text-sm text-muted-foreground">{selectedAppointment.is_virtual ? 'Virtual' : 'In-Person'}</p></div>
                <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium ${statusColors[selectedAppointment.status] || ''}`}>{selectedAppointment.status}</span>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2"><User className="h-4 w-4" />Patient Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><span className="font-medium text-primary text-sm">{selectedAppointment.patient_name?.split(' ').map(n => n[0]).join('')}</span></div>
                    <div><p className="font-medium">{selectedAppointment.patient_name || 'Patient'}</p><p className="text-sm text-muted-foreground">Patient</p></div>
                  </div>
                  {selectedAppointment.patient_phone && <div className="flex items-center gap-3 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{selectedAppointment.patient_phone}</span></div>}
                  {selectedAppointment.patient_email && <div className="flex items-center gap-3 text-sm"><Mail className="h-4 w-4 text-muted-foreground" /><span>{selectedAppointment.patient_email}</span></div>}
                </div>
              </div>
              {selectedAppointment.notes && (
                <div className="p-3 bg-muted rounded-lg"><div className="flex items-center gap-2 mb-1"><FileText className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-medium">Notes</span></div><p className="text-sm text-muted-foreground">{selectedAppointment.notes}</p></div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}