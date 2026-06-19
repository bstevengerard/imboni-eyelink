import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  FileText,
  Video,
  Clock,
  Eye,
  AlertCircle,
  ArrowRight,
  CheckCircle,
  MapPin,
  User,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { useLiveEvents } from '@/hooks/useLiveEvents';
import LiveActivityFeed from '@/components/dashboard/LiveActivityFeed';

type AppointmentRow = {
  _id: string;
  type: string;
  status: string;
  scheduled_at: string;
  location?: string | null;
  is_virtual?: boolean;
  doctor_id?: string | { name?: string };
};

type RecordRow = {
  _id: string;
  title: string;
  record_date: string;
  doctor_id?: string | { name?: string };
};

const healthTips = [
  {
    title: 'Protect Your Eyes from Screens',
    description:
      'Follow the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds.',
  },
  {
    title: 'Schedule Regular Check-ups',
    description:
      'Adults should have a comprehensive eye exam every 1-2 years, more frequently if you have risk factors.',
  },
];

const statConfig = [
  {
    label: 'Upcoming Appointments',
    key: 'upcomingAppointments' as const,
    icon: Calendar,
    color: 'primary',
  },
  {
    label: 'Medical Records',
    key: 'medicalRecordsCount' as const,
    icon: FileText,
    color: 'accent',
  },
  {
    label: 'Prescriptions',
    key: 'prescriptionsCount' as const,
    icon: Eye,
    color: 'secondary',
  },
  {
    label: 'Consultations',
    key: 'consultationsCount' as const,
    icon: Video,
    color: 'success',
  },
];

export default function PatientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    upcomingAppointments: 0,
    medicalRecordsCount: 0,
    prescriptionsCount: 0,
    consultationsCount: 0,
  });
  const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentRow[]>([]);
  const [recentRecords, setRecentRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isJoinCallOpen, setIsJoinCallOpen] = useState(false);

  const liveEvents = useLiveEvents('patient');

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [statsRes, aptsRes, recordsRes] = await Promise.all([
          api.get('/api/patient/dashboard/stats'),
          api.get<AppointmentRow[]>('/api/patient/appointments'),
          api.get<RecordRow[]>('/api/patient/records?limit=5'),
        ]);

        if (cancelled) return;

        if (statsRes.success && statsRes.data) setStats(statsRes.data as any);

        if (aptsRes.success && Array.isArray(aptsRes.data)) {
          setUpcomingAppointments(
            aptsRes.data.filter(
              (a) =>
                ['confirmed', 'pending'].includes(a.status) && new Date(a.scheduled_at) >= new Date(),
            ),
          );
        }

        if (recordsRes.success && Array.isArray(recordsRes.data)) setRecentRecords(recordsRes.data);
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleViewDetails = (a: AppointmentRow) => {
    setSelectedAppointment(a);
    setIsDetailsOpen(true);
  };

  const handleJoinCall = (a: AppointmentRow) => {
    setSelectedAppointment(a);
    setIsJoinCallOpen(true);
  };

  const confirmJoinCall = async () => {
    if (!selectedAppointment) return;
    try {
      const res = await api.post('/api/meetings/spaces', {
        appointmentId: selectedAppointment._id,
      });
      if (res.success && res.data?.meetingUri) {
        window.open(res.data.meetingUri, '_blank', 'noopener,noreferrer');
      } else {
        toast.error(res.message || 'Failed to start call');
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to start call');
    } finally {
      setIsJoinCallOpen(false);
    }
  };

  const formatAptDate = (d: string) => {
    const dt = new Date(d);
    return {
      date: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    };
  };

  if (!user) return null;

  const displayName = user.name;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div className="card-elevated p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-medium text-foreground">Welcome back, {displayName}</h2>
              <p className="text-sm text-muted-foreground">
                You have {stats.upcomingAppointments} upcoming appointment(s).
              </p>
            </div>
          </div>

          <Button size="sm" className="gap-2" onClick={() => navigate('/patient/appointments')}>
            <Calendar className="h-4 w-4" />
            Book
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statConfig.map((s) => (
          <div key={s.label} className="card-elevated p-3">
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  s.color === 'primary'
                    ? 'bg-primary/10 text-primary'
                    : s.color === 'accent'
                      ? 'bg-accent/10 text-accent'
                      : s.color === 'secondary'
                        ? 'bg-secondary/10 text-secondary'
                        : 'bg-success/10 text-success'
                }`}
              >
                <s.icon className="h-5 w-5" />
              </div>
            </div>

            <div className="text-xl font-semibold text-foreground mb-0.5">{String((stats as any)[s.key])}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Upcoming + Recent */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card-elevated">
            <div className="flex items-center justify-between mb-4 px-4 pt-4">
              <h3 className="text-sm font-medium text-foreground">Upcoming Appointments</h3>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 h-8"
                onClick={() => navigate('/patient/appointments')}
              >
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 px-4 pb-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : upcomingAppointments.length === 0 ? (
                <p className="text-muted-foreground text-sm px-2 py-3">No upcoming appointments.</p>
              ) : (
                upcomingAppointments.map((apt) => {
                  const { date, time } = formatAptDate(apt.scheduled_at);
                  const isTele = apt.is_virtual === true;
                  const doctorName =
                    typeof apt.doctor_id === 'object' && apt.doctor_id !== null
                      ? (apt.doctor_id as any).name
                      : '';

                  return (
                    <div
                      key={apt._id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-muted/50 rounded-xl gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          {isTele ? (
                            <Video className="h-6 w-6 text-primary" />
                          ) : (
                            <Calendar className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground text-sm">{apt.type}</h4>
                          <p className="text-sm text-muted-foreground">{doctorName}</p>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>
                              {date} at {time}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:flex-col sm:items-end">
                        <span className={`badge-${apt.status === 'confirmed' ? 'success' : 'warning'}`}>
                          {apt.status === 'confirmed' ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" /> Confirmed
                            </>
                          ) : (
                            <>
                              <Clock className="h-3 w-3 mr-1" /> Pending
                            </>
                          )}
                        </span>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => (isTele ? handleJoinCall(apt) : handleViewDetails(apt))}
                        >
                          {isTele ? 'Join Call' : 'View Details'}
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="card-elevated p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground">Recent Records</h3>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 h-8"
                onClick={() => navigate('/patient/records')}
              >
                View All <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : recentRecords.length === 0 ? (
                <p className="text-muted-foreground text-sm px-2">No medical records yet.</p>
              ) : (
                recentRecords.map((record) => {
                  const doctorName =
                    typeof record.doctor_id === 'object' && record.doctor_id !== null
                      ? (record.doctor_id as any).name
                      : '';

                  return (
                    <div
                      key={record._id}
                      className="p-3 bg-muted/50 rounded-xl hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate('/patient/records')}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground text-sm truncate">{record.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            {doctorName} &bull; {new Date(record.record_date).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <LiveActivityFeed events={liveEvents} className="mt-6" />

          <div className="card-elevated p-4 mt-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-secondary" />
              <h3 className="font-medium text-foreground">Eye Health Tips</h3>
            </div>
            <div className="space-y-3">
              {healthTips.map((tip, index) => (
                <div
                  key={index}
                  className="p-3 bg-secondary/5 rounded-xl border border-secondary/20"
                >
                  <h4 className="font-medium text-foreground text-sm mb-1">{tip.title}</h4>
                  <p className="text-xs text-muted-foreground">{tip.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Appointment details */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
            <DialogDescription>Complete information about your upcoming appointment</DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{selectedAppointment.type}</h3>
                  <p className="text-sm text-muted-foreground">Appointment #{selectedAppointment._id}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Doctor</p>
                    <p className="text-sm text-muted-foreground">
                      {typeof selectedAppointment.doctor_id === 'object' && selectedAppointment.doctor_id
                        ? (selectedAppointment.doctor_id as any).name
                        : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Date & Time</p>
                    <p className="text-sm text-muted-foreground">
                      {formatAptDate(selectedAppointment.scheduled_at).date} at{' '}
                      {formatAptDate(selectedAppointment.scheduled_at).time}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Location</p>
                    <p className="text-sm text-muted-foreground">{selectedAppointment.location || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Join call */}
      <Dialog open={isJoinCallOpen} onOpenChange={setIsJoinCallOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Join Tele-Consultation</DialogTitle>
            <DialogDescription>Connect with your doctor for your scheduled tele-consultation</DialogDescription>
          </DialogHeader>

          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
                  <Video className="h-6 w-6 text-info" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{selectedAppointment.type}</h3>
                  <p className="text-sm text-muted-foreground">
                    with{' '}
                    {typeof selectedAppointment.doctor_id === 'object' && selectedAppointment.doctor_id
                      ? (selectedAppointment.doctor_id as any).name
                      : ''}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button className="flex-1 gap-2" onClick={confirmJoinCall}>
                  <Video className="h-4 w-4" />
                  Join Now
                </Button>
                <Button variant="outline" onClick={() => setIsJoinCallOpen(false)} className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

