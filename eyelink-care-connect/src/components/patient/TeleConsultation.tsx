import { useState, useEffect } from 'react';
import {
  Video, Calendar, Clock, CheckCircle, AlertCircle, Plus,
  User, MessageSquare, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

type AppointmentRow = {
  _id: string;
  patient_id?: string;
  doctor_id?: string | { _id: string; name?: string };
  type: string;
  status: string;
  scheduled_at: string;
  location?: string | null;
  is_virtual?: boolean;
  service_type_id?: string;
};

type Doctor = { id: string; name: string; specialty?: string };
type WaitingRoom = { waitingRoomId: string; doctorId: string; doctorName: string; createdAt: string };

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function PatientTeleConsultation() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsultation, setSelectedConsultation] = useState<AppointmentRow | null>(null);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [selectedPast, setSelectedPast] = useState<AppointmentRow | null>(null);
  const [scheduleData, setScheduleData] = useState({ serviceTypeId: '', doctorId: '', date: '', time: '', notes: '' });
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [waitingRooms, setWaitingRooms] = useState<WaitingRoom[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [aptsRes, doctorsRes, wrRes] = await Promise.all([
          api.get<AppointmentRow[]>('/api/patient/appointments'),
          api.get<Doctor[]>('/api/doctors'),
          api.get<WaitingRoom[]>('/api/meetings/waiting-rooms'),
        ]);
        if (!cancelled) {
          if (aptsRes.success && Array.isArray(aptsRes.data)) setAppointments(aptsRes.data);
          if (doctorsRes.success && Array.isArray(doctorsRes.data)) setDoctors(doctorsRes.data);
          if (wrRes.success && Array.isArray(wrRes.data)) setWaitingRooms(wrRes.data);
        }
      } catch {
        if (!cancelled) {
          setAppointments([]);
          setDoctors([]);
          setWaitingRooms([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleJoinCall = async (c: AppointmentRow) => {
    if (!c.is_virtual) return;
    setSelectedConsultation(c);
    setIsJoinOpen(true);
  };

  const handleJoinWaitingRoom = async (waitingRoomId: string) => {
    try {
      const res = await api.post<{ data: { meetingUri: string } }>(`/api/meetings/waiting-room/${waitingRoomId}/join`);
      if (res.success && res.data?.meetingUri) {
        window.open(res.data.meetingUri, '_blank', 'noopener,noreferrer');
        setWaitingRooms(prev => prev.filter(wr => wr.waitingRoomId !== waitingRoomId));
      } else {
        toast.error(res.message || 'Failed to join waiting room');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to join waiting room');
    }
  };

  const handleConfirmJoin = async () => {
    if (!selectedConsultation) return;
    setJoiningId(selectedConsultation._id);
    try {
      const res = await api.post<{ data: { meetingUri: string } }>('/api/meetings/spaces', {
        appointmentId: selectedConsultation._id,
      });
      if (!res.success || !res.data?.meetingUri) {
        toast.error(res.message || 'Failed to start call');
        return;
      }
      window.open(res.data.meetingUri, '_blank', 'noopener,noreferrer');
      setIsJoinOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start call');
    } finally {
      setJoiningId(null);
    }
  };

  const handleScheduleConsultation = async () => {
    if (!scheduleData.doctorId || !scheduleData.date || !scheduleData.time) { toast.error('Please fill required fields'); return; }
    try {
      const res = await api.post('/api/patient/appointments', {
        doctorId: scheduleData.doctorId,
        date: scheduleData.date,
        time: scheduleData.time,
        notes: scheduleData.notes || undefined,
        isVirtual: true,
      });
      if (res.success) {
        toast.success('Consultation scheduled successfully!');
        const aptRes = await api.get<AppointmentRow[]>('/api/patient/appointments');
        if (aptRes.success && Array.isArray(aptRes.data)) setAppointments(aptRes.data);
        setIsScheduleOpen(false);
        setScheduleData({ serviceTypeId: '', doctorId: '', date: '', time: '', notes: '' });
      } else {
        toast.error(res.message || 'Failed to schedule consultation');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to schedule consultation');
    }
  };

  const handleViewSummary = (c: AppointmentRow) => {
    const mapped = {
      ...c,
      summary: c.status === 'completed' ? 'Consultation completed. Your doctor will share notes shortly.' : undefined,
    };
    setSelectedPast(mapped);
    setIsSummaryOpen(true);
  };

  const getDoctorName = (apt: AppointmentRow) => {
    if (typeof apt.doctor_id === 'object' && apt.doctor_id) return apt.doctor_id.name || 'Doctor';
    return 'Doctor';
  };

  const now = new Date();
  const upcomingConsultations = appointments.filter(
    (a) => (a.is_virtual === true || a.type === 'teleconsultation') &&
      ['confirmed', 'pending'].includes(a.status) && new Date(a.scheduled_at) >= now
  );
  const pastConsultations = appointments.filter(
    (a) => (a.is_virtual === true || a.type === 'teleconsultation') &&
      a.status === 'completed'
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Tele-Consultations</h2>
          <p className="text-muted-foreground">Connect with your doctors through video consultations</p>
        </div>
        <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" />Schedule Consultation</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Schedule Tele-Consultation</DialogTitle><DialogDescription>Book a virtual consultation with a doctor</DialogDescription></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><label className="text-sm font-medium">Doctor</label><Select value={scheduleData.doctorId} onValueChange={(v) => setScheduleData({ ...scheduleData, doctorId: v })}><SelectTrigger><SelectValue placeholder="Select doctor" /></SelectTrigger><SelectContent>{doctors.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name} {d.specialty ? `- ${d.specialty}` : ''}</SelectItem>))}</SelectContent></Select></div>
              <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-sm font-medium">Date</label><Input type="date" value={scheduleData.date} onChange={(e) => setScheduleData({ ...scheduleData, date: e.target.value })} /></div><div className="space-y-2"><label className="text-sm font-medium">Time</label><Input type="time" value={scheduleData.time} onChange={(e) => setScheduleData({ ...scheduleData, time: e.target.value })} /></div></div>
              <div className="space-y-2"><label className="text-sm font-medium">Notes (optional)</label><Input placeholder="Brief description of your concern" value={scheduleData.notes} onChange={(e) => setScheduleData({ ...scheduleData, notes: e.target.value })} /></div>
              <Button onClick={handleScheduleConsultation} className="w-full">Schedule Consultation</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-info/10 border border-info/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-medium text-foreground mb-1">Before Your Consultation</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Ensure you have a stable internet connection</li>
              <li>• Test your camera and microphone before joining</li>
              <li>• Find a quiet, well-lit space for the call</li>
              <li>• Have your current medications list ready</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Available Waiting Rooms */}
      {waitingRooms.length > 0 && (
        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-6">
            <Video className="h-5 w-5 text-success" />
            <h3 className="text-lg font-bold text-foreground">Doctors Available Now</h3>
          </div>
          <div className="space-y-4">
            {waitingRooms.map((wr) => (
              <div key={wr.waitingRoomId} className="p-4 bg-success/5 rounded-xl border border-success/20">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                      <Video className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">Dr. {wr.doctorName}</h4>
                      <p className="text-sm text-muted-foreground">Available for immediate consultation</p>
                    </div>
                  </div>
                  <Button size="sm" className="gap-2" onClick={() => handleJoinWaitingRoom(wr.waitingRoomId)}>
                    <Video className="h-4 w-4" />
                    Join Call
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
      ) : (
      <>
        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-6"><Video className="h-5 w-5 text-primary" /><h3 className="text-lg font-bold text-foreground">Upcoming Consultations</h3></div>
          {upcomingConsultations.length > 0 ? (
            <div className="space-y-4">
              {upcomingConsultations.map((c) => (
                <div key={c._id} className="p-4 bg-muted/50 rounded-xl border border-border">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center shrink-0"><Video className="h-6 w-6 text-info" /></div>
                      <div>
                        <h4 className="font-semibold text-foreground">{c.type || 'Consultation'}</h4>
                        <p className="text-sm text-muted-foreground">{getDoctorName(c)}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(c.scheduled_at)}</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatTime(c.scheduled_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-16 lg:ml-0">
                      <span className="badge-success"><CheckCircle className="h-3 w-3 mr-1" />Scheduled</span>
                      {c.is_virtual && c.status === 'confirmed' && (
                        <Button size="sm" className="gap-2" onClick={() => handleJoinCall(c)} disabled={joiningId === c._id}>
                          <Video className="h-4 w-4" />{joiningId === c._id ? 'Opening...' : 'Join Call'}
                        </Button>
                      )}
                      {c.is_virtual && c.status === 'pending' && <Button size="sm" variant="outline">Awaiting Confirmation</Button>}
                      {!c.is_virtual && c.status === 'confirmed' && <Button size="sm" variant="outline">View Details</Button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>No upcoming consultations</p>
              <Button className="mt-4" onClick={() => setIsScheduleOpen(true)}>Schedule a Consultation</Button>
            </div>
          )}
        </div>

        <div className="card-elevated">
          <div className="flex items-center gap-2 mb-6"><Clock className="h-5 w-5 text-muted-foreground" /><h3 className="text-lg font-bold text-foreground">Past Consultations</h3></div>
          {pastConsultations.length > 0 ? (
            <div className="space-y-4">
              {pastConsultations.map((c) => (
                <div key={c._id} className="p-4 bg-muted/30 rounded-xl border border-border">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0"><Video className="h-6 w-6 text-muted-foreground" /></div>
                      <div>
                        <h4 className="font-semibold text-foreground">{c.type || 'Consultation'}</h4>
                        <p className="text-sm text-muted-foreground">{getDoctorName(c)}</p>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(c.scheduled_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-16 lg:ml-0">
                      <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">Completed</span>
                      <Button size="sm" variant="outline" onClick={() => handleViewSummary(c)}>View Summary</Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground"><p>No past consultations</p></div>
          )}
        </div>
      </>
      )}

      <Dialog open={isJoinOpen} onOpenChange={setIsJoinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Video Consultation</DialogTitle>
            <DialogDescription>Connect with your doctor for your scheduled consultation</DialogDescription>
          </DialogHeader>
          {selectedConsultation && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center"><Video className="h-6 w-6 text-info" /></div>
                <div>
                  <h3 className="font-semibold text-foreground">{selectedConsultation.type || 'Consultation'}</h3>
                  <p className="text-sm text-muted-foreground">with {getDoctorName(selectedConsultation)}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3"><Calendar className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-medium text-foreground">Date & Time</p><p className="text-sm text-muted-foreground">{formatDate(selectedConsultation.scheduled_at)} at {formatTime(selectedConsultation.scheduled_at)}</p></div></div>
                <div className="flex items-center gap-3"><Clock className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-medium text-foreground">Duration</p><p className="text-sm text-muted-foreground">30 minutes</p></div></div>
              </div>
              <div className="p-4 bg-warning/10 border border-warning/30 rounded-lg">
                <div className="flex items-start gap-2"><AlertCircle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" /><p className="text-sm text-foreground">Make sure your camera and microphone are ready before joining.</p></div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsJoinOpen(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleConfirmJoin} className="flex-1 gap-2" disabled={joiningId === selectedConsultation._id}><Video className="h-4 w-4" />{joiningId === selectedConsultation._id ? 'Starting...' : 'Join Now'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isSummaryOpen} onOpenChange={setIsSummaryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Consultation Summary</DialogTitle>
            <DialogDescription>Summary from your past consultation</DialogDescription>
          </DialogHeader>
          {selectedPast && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center"><Video className="h-6 w-6 text-muted-foreground" /></div>
                <div>
                  <h3 className="font-semibold text-foreground">{selectedPast.type || 'Consultation'}</h3>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedPast.scheduled_at)}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3"><User className="h-5 w-5 text-muted-foreground" /><div><p className="text-sm font-medium text-foreground">Doctor</p><p className="text-sm text-muted-foreground">{getDoctorName(selectedPast)}</p></div></div>
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Consultation Notes</p>
                <div className="p-3 bg-muted/50 rounded-lg"><p className="text-sm text-foreground">{selectedPast.summary || 'No summary available.'}</p></div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsSummaryOpen(false)} className="flex-1">Close</Button>
                <Button variant="outline" className="flex-1 gap-2"><MessageSquare className="h-4 w-4" />Message Doctor</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}