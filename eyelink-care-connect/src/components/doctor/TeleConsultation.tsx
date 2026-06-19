import { useEffect, useState } from "react";
import { Video, Phone, Calendar, Clock, Users, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useSocket } from "@/contexts/SocketContext";

interface TeleAppointment {
  _id: string;
  patient_id: { _id: string; name: string };
  type: string;
  status: string;
  scheduled_at: string;
  is_virtual: boolean;
  notes: string;
}

interface WaitingRoom {
  waitingRoomId: string;
  meetingUri: string;
  patient_ids: Array<{ _id: string; name: string }>;
}

export default function DoctorConsultation() {
  const [appointments, setAppointments] = useState<TeleAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleCall, setRescheduleCall] = useState<TeleAppointment | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [savingReschedule, setSavingReschedule] = useState(false);
  const [activeWaitingRoom, setActiveWaitingRoom] = useState<WaitingRoom | null>(null);
  const [isWaitingRoomOpen, setIsWaitingRoomOpen] = useState(false);

  const { onWaitingRoomPatientJoined } = useSocket();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [aptsRes, wrRes] = await Promise.all([
          api.get<{ data: TeleAppointment[] }>('/api/doctor/appointments'),
          api.get<{ data: WaitingRoom | null }>('/api/meetings/waiting-room'),
        ]);
        if (!cancelled) {
          if (aptsRes.success && Array.isArray(aptsRes.data)) {
            const teleAppointments = aptsRes.data.filter(
              (apt: TeleAppointment) => apt.is_virtual || apt.type === 'teleconsultation'
            );
            setAppointments(teleAppointments);
          }
          if (wrRes.success && wrRes.data) {
            setActiveWaitingRoom(wrRes.data);
            setIsWaitingRoomOpen(true);
          }
        }
      } catch {
        if (!cancelled) toast.error('Failed to load consultations');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const unsubscribe = onWaitingRoomPatientJoined((data) => {
      if (activeWaitingRoom) {
        setActiveWaitingRoom(prev => prev ? {
          ...prev,
          patient_ids: [...prev.patient_ids, { _id: data.patientId, name: data.patientName }]
        } : null);
        toast.info(`${data.patientName} joined your waiting room`);
      }
    });
    return unsubscribe;
  }, [onWaitingRoomPatientJoined, activeWaitingRoom]);

const today = new Date().toISOString().split('T')[0];
   
  const upcomingCalls = appointments.filter(apt => {
    const aptDate = apt.scheduled_at ? apt.scheduled_at.split(' ')[0] : '';
    return aptDate >= today && apt.status !== 'cancelled';
  });

  const pastCalls = appointments.filter(apt => {
    const aptDate = apt.scheduled_at ? apt.scheduled_at.split(' ')[0] : '';
    return aptDate < today || apt.status === 'completed' || apt.status === 'cancelled';
  });

  const getTime = (scheduled_at: string) => {
    if (!scheduled_at) return '';
    return new Date(scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const getDate = (scheduled_at: string) => {
    if (!scheduled_at) return '';
    const date = scheduled_at.split(' ')[0];
    const todayDate = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowDate = tomorrow.toISOString().split('T')[0];
    
    if (date === todayDate) return 'Today';
    if (date === tomorrowDate) return 'Tomorrow';
    return new Date(scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleStartCall = async (call: TeleAppointment) => {
    try {
      const res = await api.post('/api/meetings/spaces', {
        appointmentId: call._id,
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

  const handleStartWaitingRoom = async () => {
    try {
      const res = await api.post('/api/meetings/waiting-room');
      if (res.success && res.data?.waitingRoomId && res.data?.meetingUri) {
        // Check if this is an existing room (already open)
        const isExisting = activeWaitingRoom?.waitingRoomId === res.data.waitingRoomId;
        setActiveWaitingRoom({
          waitingRoomId: res.data.waitingRoomId,
          meetingUri: res.data.meetingUri,
          patient_ids: [],
        });
        setIsWaitingRoomOpen(true);
        if (!isExisting) {
          window.open(res.data.meetingUri, '_blank', 'noopener,noreferrer');
          toast.success('Waiting room created. Patients can now join.');
        } else {
          toast.info('Waiting room already exists. Patients can join.');
        }
      } else {
        toast.error(res.message || 'Failed to create waiting room');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create waiting room');
    }
  };

  const handleJoinWaitingRoom = () => {
    if (activeWaitingRoom?.meetingUri) {
      window.open(activeWaitingRoom.meetingUri, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCloseWaitingRoom = async () => {
    if (!activeWaitingRoom) return;
    try {
      await api.patch(`/api/meetings/waiting-room/${activeWaitingRoom.waitingRoomId}`, { status: 'completed' });
      setActiveWaitingRoom(null);
      setIsWaitingRoomOpen(false);
      toast.success('Waiting room closed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to close waiting room');
    }
  };

  const handleReschedule = (call: TeleAppointment) => {
    const d = new Date(call.scheduled_at);
    setRescheduleCall(call);
    setRescheduleDate(d.toISOString().split('T')[0]);
    setRescheduleTime(d.toISOString().split('T')[1].slice(0, 5));
    setRescheduleNotes(call.notes || '');
  };

  const submitReschedule = async () => {
    if (!rescheduleCall || !rescheduleDate || !rescheduleTime) {
      toast.error('Please select date and time');
      return;
    }
    setSavingReschedule(true);
    try {
      const scheduledAt = new Date(`${rescheduleDate}T${rescheduleTime}`).toISOString();
      await api.patch(`/api/doctor/appointments/${rescheduleCall._id}`, {
        scheduled_at: scheduledAt,
        notes: rescheduleNotes,
        status: 'confirmed',
      });
      setAppointments((prev) =>
        prev.map((a) => (a._id === rescheduleCall._id ? { ...a, scheduled_at: scheduledAt, notes: rescheduleNotes } : a))
      );
      toast.success('Appointment rescheduled');
      setRescheduleCall(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to reschedule');
    } finally {
      setSavingReschedule(false);
    }
  };

  // Calculate stats
  const scheduledToday = upcomingCalls.filter((apt) => {
    const aptDate = apt.scheduled_at ? apt.scheduled_at.split(' ')[0] : '';
    return aptDate === today;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold">Tele-Consultation</h2>
          <p className="text-muted-foreground">Manage your video consultations</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => toast.info('Settings panel coming soon')}>
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
          <Button onClick={handleStartWaitingRoom}>
            <Video className="w-4 h-4 mr-2" />
            Start Waiting Room
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-elevated p-4 text-center">
          <Video className="w-8 h-8 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{scheduledToday}</p>
          <p className="text-sm text-muted-foreground">Scheduled Today</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <Users className="w-8 h-8 text-accent mx-auto mb-2" />
          <p className="text-2xl font-bold">{appointments.length}</p>
          <p className="text-sm text-muted-foreground">This Month</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <Clock className="w-8 h-8 text-secondary mx-auto mb-2" />
          <p className="text-2xl font-bold">{pastCalls.length}h</p>
          <p className="text-sm text-muted-foreground">Total Hours</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <Phone className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-2xl font-bold">{appointments.length > 0 ? Math.round((pastCalls.length / appointments.length) * 100) : 0}%</p>
          <p className="text-sm text-muted-foreground">Completion Rate</p>
        </div>
      </div>

{loading ? (
         <div className="text-center py-8">
           <p className="text-muted-foreground">Loading consultations...</p>
         </div>
       ) : (
         <div className="grid lg:grid-cols-2 gap-6">
           {/* Upcoming Calls */}
           <div className="card-elevated p-6">
             <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
               <Calendar className="w-5 h-5 text-primary" />
               Upcoming Consultations
             </h3>
             {upcomingCalls.length === 0 ? (
               <p className="text-muted-foreground text-center py-4">No upcoming consultations</p>
             ) : (
               <div className="space-y-4">
                 {upcomingCalls.slice(0, 5).map((call) => (
                   <div key={call._id} className="p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                     <div className="flex items-center justify-between mb-3">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                           <Video className="w-5 h-5 text-primary" />
                         </div>
                         <div>
                           <p className="font-medium">{call.patient_id?.name || 'Patient'}</p>
                           <p className="text-sm text-muted-foreground">{call.type || 'Tele-Consultation'}</p>
                         </div>
                       </div>
                       <div className="text-right">
                         <p className="font-medium">{getTime(call.scheduled_at)}</p>
                         <p className="text-sm text-muted-foreground">{getDate(call.scheduled_at)}</p>
                       </div>
                     </div>
                     <div className="flex gap-2">
                       {getDate(call.scheduled_at) === "Today" || getDate(call.scheduled_at) === "Tomorrow" ? (
                         <Button size="sm" className="flex-1" onClick={() => handleStartCall(call)}>
                           <Video className="w-4 h-4 mr-1" />
                           Join Call
                         </Button>
                       ) : (
                         <Button size="sm" variant="outline" className="flex-1">
                           View Details
                         </Button>
                       )}
                       <Button size="sm" variant="outline" onClick={() => handleReschedule(call)}>Reschedule</Button>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>

           {/* Past Calls */}
           <div className="card-elevated p-6">
             <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
               <Clock className="w-5 h-5 text-muted-foreground" />
               Recent Consultations
             </h3>
             {pastCalls.length === 0 ? (
               <p className="text-muted-foreground text-center py-4">No past consultations</p>
             ) : (
               <div className="space-y-4">
                 {pastCalls.slice(0, 5).map((call) => (
                   <div key={call._id} className="p-4 rounded-xl border">
                     <div className="flex items-center justify-between mb-2">
                       <p className="font-medium">{call.patient_id?.name || 'Patient'}</p>
                       <span className="text-sm text-muted-foreground">
                         {new Date(call.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                       </span>
                     </div>
                     <p className="text-sm text-muted-foreground mb-2">{call.notes || 'No notes'}</p>
                     <div className="flex items-center justify-between">
                       <span className={`text-xs px-2 py-1 rounded-full ${
                         call.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'
                       }`}>
                         {call.status === 'completed' ? 'Completed' : call.status}
                       </span>
                       <Button size="sm" variant="ghost">View Notes</Button>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </div>
         </div>
       )}

       {/* Video Call Interface */}
       <div className="card-elevated p-8 text-center">
         <Video className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
         <h3 className="text-xl font-semibold mb-2">Ready for Your Next Call?</h3>
         <p className="text-muted-foreground mb-6 max-w-md mx-auto">
           Start a waiting room for patients to join, or join an existing appointment call.
         </p>
         <div className="flex gap-4 justify-center">
           <Button variant="outline" onClick={() => toast.info('Equipment testing not yet available')}>Test Equipment</Button>
           <Button onClick={handleStartWaitingRoom}>
             <Video className="w-4 h-4 mr-2" />
             Start Waiting Room
           </Button>
         </div>
       </div>

       {/* Waiting Room Dialog */}
       <Dialog open={isWaitingRoomOpen} onOpenChange={setIsWaitingRoomOpen}>
         <DialogContent className="sm:max-w-md">
           <DialogHeader>
             <DialogTitle>Waiting Room Active</DialogTitle>
             <DialogDescription>Patients can join your tele-consultation</DialogDescription>
           </DialogHeader>
           <div className="space-y-4">
             <div className="flex items-center gap-3">
               <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                 <Video className="w-6 h-6 text-info" />
               </div>
               <div>
                 <p className="font-medium">Waiting Room Created</p>
                 <p className="text-sm text-muted-foreground">Meeting ID: {activeWaitingRoom?.waitingRoomId?.slice(-6)}</p>
               </div>
             </div>
             {activeWaitingRoom && activeWaitingRoom.patient_ids.length > 0 && (
               <div>
                 <p className="text-sm font-medium mb-2">Patients in waiting room:</p>
                 <ul className="text-sm text-muted-foreground space-y-1">
                   {activeWaitingRoom.patient_ids.map((p, i) => (
                     <li key={i}>• {p.name}</li>
                   ))}
                 </ul>
               </div>
             )}
             <div className="flex gap-2 pt-4">
               <Button variant="outline" onClick={handleCloseWaitingRoom} className="flex-1">Close Room</Button>
               <Button onClick={handleJoinWaitingRoom} className="flex-1 gap-2">
                 <Video className="w-4 h-4" />
                 Join Now
               </Button>
             </div>
           </div>
         </DialogContent>
       </Dialog>

      <Dialog open={!!rescheduleCall} onOpenChange={(open) => !open && setRescheduleCall(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Consultation</DialogTitle>
            <DialogDescription>
              {rescheduleCall?.patient_id?.name ? `Reschedule for ${rescheduleCall.patient_id.name}` : 'Set a new date and time'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Date</label>
                <Input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Time</label>
                <Input type="time" value={rescheduleTime} onChange={(e) => setRescheduleTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input value={rescheduleNotes} onChange={(e) => setRescheduleNotes(e.target.value)} placeholder="Reason for reschedule" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" onClick={() => setRescheduleCall(null)} className="flex-1">Cancel</Button>
              <Button onClick={submitReschedule} disabled={savingReschedule} className="flex-1">
                {savingReschedule ? 'Saving...' : 'Reschedule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
