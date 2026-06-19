import { useState, useEffect } from 'react';
import {
  Calendar, Clock, MapPin, Video, Plus, Search, Filter,
  Star, CheckCircle, XCircle, AlertCircle, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type AppointmentRow = {
  _id: string;
  patient_id?: string;
  doctor_id?: string | { name?: string; specialty?: string };
  service_type_id?: string | { name?: string };
  type: string;
  status: string;
  scheduled_at: string;
  location?: string | null;
  is_virtual?: boolean;
  notes?: string;
};

type Doctor = { id: string; name: string; specialty?: string };
type ServiceType = { id: string; name: string; description?: string; duration_minutes?: number; price?: number };

const timeSlots = [
  { value: '09:00', label: '9:00 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '14:00', label: '2:00 PM' },
  { value: '15:00', label: '3:00 PM' },
  { value: '16:00', label: '4:00 PM' },
];

export default function PatientAppointments() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingData, setBookingData] = useState({ serviceTypeId: '', doctorId: '', date: '', time: '', notes: '', isVirtual: false, location: '' });
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
      const [aptsRes, doctorsRes, servicesRes] = await Promise.all([
        api.get<AppointmentRow[]>('/api/patient/appointments'),
        api.get<{ success: boolean; data: { id: string; name: string; specialty?: string }[] }>('/api/doctors'),
        api.get<{ success: boolean; data: { id: string; name: string }[] }>('/api/services'),
      ]);
      if (!cancelled) {
        if (aptsRes.success && Array.isArray(aptsRes.data)) setAppointments(aptsRes.data);
        if (doctorsRes.success && Array.isArray(doctorsRes.data)) {
          setDoctors(doctorsRes.data.map(d => ({ id: d.id, name: d.name, specialty: d.specialty || '' })));
        }
        if (servicesRes.success && Array.isArray(servicesRes.data)) {
          setServiceTypes(servicesRes.data.map(s => ({ id: s.id, name: s.name })));
        }
      }
    } catch {
      if (!cancelled) {
        setAppointments([]);
        setDoctors([]);
        setServiceTypes([]);
      }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const filteredAppointments = appointments.filter((apt) => {
    const doctorName = typeof apt.doctor_id === 'object' && apt.doctor_id !== null 
      ? (apt.doctor_id as any).name || '' 
      : '';
    const matchesSearch = apt.type.toLowerCase().includes(searchTerm.toLowerCase()) || doctorName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleBooking = async () => {
    if (!bookingData.doctorId || !bookingData.date || !bookingData.time) { toast.error('Please fill required fields'); return; }
    try {
      const res = await api.post('/api/patient/appointments', {
        doctorId: bookingData.doctorId,
        serviceTypeId: bookingData.serviceTypeId || undefined,
        date: bookingData.date,
        time: bookingData.time,
        notes: bookingData.notes || undefined,
        isVirtual: bookingData.isVirtual || false,
        location: bookingData.isVirtual ? undefined : 'IMBONI Eye Center - Kigali',
      });
      if (res.success) {
        toast.success('Appointment booked successfully!');
        const aptRes = await api.get<AppointmentRow[]>('/api/patient/appointments');
        if (aptRes.success && Array.isArray(aptRes.data)) setAppointments(aptRes.data);
        setIsBookingOpen(false);
        setBookingData({ serviceTypeId: '', doctorId: '', date: '', time: '', notes: '', isVirtual: false, location: '' });
      } else {
        toast.error(res.message || 'Failed to book appointment');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to book appointment');
    }
  };

  const handleViewDetails = (apt: AppointmentRow) => { setSelectedAppointment(apt); setIsDetailsOpen(true); };
  const handleCancelRequest = (apt: AppointmentRow) => { setSelectedAppointment(apt); setIsCancelOpen(true); };
  const handleJoinCall = async (apt: AppointmentRow) => {
    if (!apt.is_virtual || apt.status !== 'confirmed') return;
    try {
      const res = await api.post('/api/meetings/spaces', {
        appointmentId: apt._id,
      });
      if (res.success && res.data?.meetingUri) {
        window.open(res.data.meetingUri, '_blank', 'noopener,noreferrer');
      } else {
        toast.error(res.message || 'Failed to start call');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start call');
    }
  };

  const confirmCancel = async () => {
    if (!selectedAppointment) return;
    try {
      await api.patch(`/api/patient/appointments/${selectedAppointment._id}/cancel`);
      toast.success('Appointment cancelled');
      const aptRes = await api.get<AppointmentRow[]>('/api/patient/appointments');
      if (aptRes.success && Array.isArray(aptRes.data)) setAppointments(aptRes.data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to cancel');
    } finally {
      setIsCancelOpen(false);
    }
  };

  const submitFeedback = async () => {
    if (!selectedAppointment) return;
    setSubmittingFeedback(true);
    try {
      const res = await api.post(`/api/patient/appointments/${selectedAppointment._id}/feedback`, {
        rating: feedbackRating,
        comment: feedbackComment.trim(),
      });
      if (res.success) {
        toast.success('Feedback submitted! Thank you.');
        setIsFeedbackOpen(false);
        setFeedbackComment('');
        setFeedbackRating(5);
      } else {
        toast.error(res.message || 'Failed to submit feedback');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'pending': return <AlertCircle className="h-4 w-4 text-warning" />;
      case 'completed': return <CheckCircle className="h-4 w-4 text-muted-foreground" />;
      case 'cancelled': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'badge-success';
      case 'pending': return 'badge-warning';
      case 'completed': return 'bg-muted text-muted-foreground';
      case 'cancelled': return 'bg-destructive/10 text-destructive';
      default: return '';
    }
  };

  const formatApt = (apt: AppointmentRow) => {
    const d = new Date(apt.scheduled_at);
    return { dateFormatted: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) };
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h2 className="text-2xl font-bold text-foreground">My Appointments</h2><p className="text-muted-foreground">Manage and book your eye care appointments</p></div>
        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Book Appointment</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Book New Appointment</DialogTitle><DialogDescription>Schedule your next eye care visit</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Service Type</Label>
                <Select value={bookingData.serviceTypeId} onValueChange={(v) => setBookingData({ ...bookingData, serviceTypeId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select service" /></SelectTrigger>
                  <SelectContent>
                   {serviceTypes.map((t) => (
                     <SelectItem key={`svc-${t.id}`} value={t.id}>{t.name}</SelectItem>
                  ))}
                 </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Preferred Doctor</Label>
                <Select value={bookingData.doctorId} onValueChange={(v) => setBookingData({ ...bookingData, doctorId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger>
                   <SelectContent>{doctors.map((doc) => (
                     <SelectItem key={`doc-${doc.id}`} value={doc.id}>{doc.name} {doc.specialty ? `- ${doc.specialty}` : ''}</SelectItem>
                   ))}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Date</Label><Input type="date" value={bookingData.date} onChange={(e) => setBookingData({ ...bookingData, date: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Select value={bookingData.time} onValueChange={(v) => setBookingData({ ...bookingData, time: v })}>
                    <SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger>
                    <SelectContent>{timeSlots.map((slot) => (<SelectItem key={slot.value} value={slot.value}>{slot.label}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2"><Label>Notes (optional)</Label><Input placeholder="Notes" value={bookingData.notes} onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })} /></div>
              <Button onClick={handleBooking} className="w-full">Submit Request</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Search appointments..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48"><Filter className="h-4 w-4 mr-2" /><SelectValue placeholder="Filter by status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No appointments found</h3>
            <Button onClick={() => setIsBookingOpen(true)}>Book Your First Appointment</Button>
          </div>
        ) : (
           filteredAppointments.map((apt) => {
             const { dateFormatted, time } = formatApt(apt);
             const isVirtual = apt.is_virtual === true;
             const doctor = typeof apt.doctor_id === 'object' && apt.doctor_id !== null ? apt.doctor_id as { name?: string; specialty?: string } : null;
             const service = typeof apt.service_type_id === 'object' && apt.service_type_id !== null ? apt.service_type_id as { name?: string } : null;
             const doctorName = doctor?.name || 'Doctor';
             const serviceName = service?.name || apt.type;
             return (
               <div key={apt._id} className="card-elevated flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                 <div className="flex items-start gap-4">
                   <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${isVirtual ? 'bg-info/10' : 'bg-primary/10'}`}>
                     {isVirtual ? <Video className="h-7 w-7 text-info" /> : <Calendar className="h-7 w-7 text-primary" />}
                   </div>
                   <div className="flex-1">
                     <div className="flex items-center gap-2 mb-1">
                       <h3 className="font-semibold text-foreground">{serviceName}</h3>
                       <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(apt.status)}`}>
                         {getStatusIcon(apt.status)}{apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                       </span>
                     </div>
                     <p className="text-sm text-muted-foreground mb-1">{doctorName} {doctor?.specialty ? `• ${doctor.specialty}` : ''}</p>
                     <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                       <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{dateFormatted}</span>
                       <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{time}</span>
                       <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{apt.location || 'Virtual'}</span>
                     </div>
                     {apt.notes && <p className="text-xs text-muted-foreground mt-1 italic">Note: {apt.notes}</p>}
                   </div>
                 </div>
                 <div className="flex items-center gap-2 lg:flex-col lg:items-end">
                   {apt.status === 'confirmed' && isVirtual && <Button size="sm" className="gap-2" onClick={() => handleJoinCall(apt)}><Video className="h-4 w-4" />Join Call</Button>}
                   {apt.status === 'confirmed' && !isVirtual && <Button size="sm" variant="outline" onClick={() => handleViewDetails(apt)}>View Details</Button>}
                   {apt.status === 'pending' && <Button size="sm" variant="outline" onClick={() => handleCancelRequest(apt)}>Cancel Request</Button>}
                   {apt.status === 'completed' && <Button size="sm" variant="ghost" onClick={() => handleViewDetails(apt)}>View Summary</Button>}
                 </div>
               </div>
             );
           })
        )}
      </div>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Appointment Details</DialogTitle><DialogDescription>Complete information</DialogDescription></DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Calendar className="h-6 w-6 text-primary" /></div>
                <div>
                  <h3 className="font-semibold text-foreground">{typeof selectedAppointment.service_type_id === 'object' && selectedAppointment.service_type_id ? (selectedAppointment.service_type_id as any).name || selectedAppointment.type : selectedAppointment.type}</h3>
                  <p className="text-sm text-muted-foreground">{typeof selectedAppointment.doctor_id === 'object' && selectedAppointment.doctor_id ? (selectedAppointment.doctor_id as any).name : 'Doctor'}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3"><Calendar className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-medium">Date & Time</p><p className="text-sm text-muted-foreground">{formatApt(selectedAppointment).dateFormatted} at {formatApt(selectedAppointment).time}</p></div></div>
                <div className="flex items-center gap-3"><MapPin className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-medium">Location</p><p className="text-sm text-muted-foreground">{selectedAppointment.location || 'Virtual'}</p></div></div>
                {selectedAppointment.notes && <div className="flex items-start gap-3"><AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5" /><div><p className="text-sm font-medium">Notes</p><p className="text-sm text-muted-foreground">{selectedAppointment.notes}</p></div></div>}
              </div>
              <div className="flex gap-2 pt-2">
                {selectedAppointment.status === 'completed' && !selectedAppointment.feedbackSubmitted && (
                  <Button className="flex-1 gap-2" onClick={() => { setIsDetailsOpen(false); setIsFeedbackOpen(true); }}>
                    <Star className="h-4 w-4" /> Rate Experience
                  </Button>
                )}
                {selectedAppointment.status === 'completed' && selectedAppointment.feedbackSubmitted && (
                  <div className="flex-1 text-center text-sm text-muted-foreground py-2">✓ Feedback submitted</div>
                )}
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="flex-1">Close</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Cancel Appointment</DialogTitle><DialogDescription>Are you sure you want to cancel?</DialogDescription></DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsCancelOpen(false)} className="flex-1">Keep</Button>
            <Button variant="destructive" onClick={confirmCancel} className="flex-1">Cancel Appointment</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rate Your Experience</DialogTitle>
            <DialogDescription>How was your appointment with {selectedAppointment && typeof selectedAppointment.doctor_id === 'object' && selectedAppointment.doctor_id ? (selectedAppointment.doctor_id as any).name || 'your doctor' : 'your doctor'}?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFeedbackRating(star)}
                  className="p-1 rounded hover:scale-110 transition-transform"
                >
                  <Star
                    className={`h-8 w-8 ${star <= feedbackRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                </button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-comment">Comment (optional)</Label>
              <textarea
                id="feedback-comment"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Share your experience..."
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsFeedbackOpen(false)} className="flex-1" disabled={submittingFeedback}>Skip</Button>
              <Button onClick={submitFeedback} className="flex-1" disabled={submittingFeedback}>
                {submittingFeedback ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}