import { useState, useEffect } from "react";
import { Calendar, Users, Clock, CheckCircle, Video, AlertTriangle, Stethoscope, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { useLiveEvents } from "@/hooks/useLiveEvents";
import LiveActivityFeed from "@/components/dashboard/LiveActivityFeed";

type AptRow = {
  _id: string;
  patient_id?: string | { name?: string };
  type: string;
  status: string;
  scheduled_at: string;
  is_virtual?: boolean;
};
type PatientRow = { _id: string; name: string; last_visit: string | null };

const statConfig = [
  { key: 'todayAppointments' as const, label: "Today's Appointments", icon: Calendar, color: "text-primary", bgColor: "bg-primary/10" },
  { key: 'totalPatients' as const, label: "Total Patients", icon: Users, color: "text-accent", bgColor: "bg-accent/10" },
  { key: 'pendingReviews' as const, label: "Pending Reviews", icon: Clock, color: "text-secondary", bgColor: "bg-secondary/10" },
  { key: 'completedToday' as const, label: "Completed Today", icon: CheckCircle, color: "text-green-600", bgColor: "bg-green-100" },
];

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ todayAppointments: 0, totalPatients: 0, pendingReviews: 0, completedToday: 0 });
  const [todayAppointments, setTodayAppointments] = useState<AptRow[]>([]);
  const [recentPatients, setRecentPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const liveEvents = useLiveEvents('doctor');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const [statsRes, aptsRes, patientsRes] = await Promise.all([
          api.get('/api/doctor/dashboard/stats'),
          api.get<AptRow[]>('/api/doctor/appointments?date=today'),
          api.get<PatientRow[]>('/api/doctor/patients'),
        ]);
        if (!cancelled) {
          if (statsRes.success && statsRes.data) setStats(statsRes.data as any);
          if (aptsRes.success && Array.isArray(aptsRes.data)) {
            setTodayAppointments(aptsRes.data.filter(a => new Date(a.scheduled_at).toISOString().split('T')[0] === today));
          }
          if (patientsRes.success && Array.isArray(patientsRes.data)) setRecentPatients(patientsRes.data.slice(0, 5));
        }
      } catch {}
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!user) return null;
  
   const displayName = user.name;
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Good Morning';
    if (hour >= 12 && hour < 17) return 'Good Afternoon';
    if (hour >= 17 && hour < 21) return 'Good Evening';
    return 'Good Night';
  })();


  const formatTime = (d: string) => new Date(d).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const formatLastVisit = (d: string | null) => d ? new Date(d).toLocaleDateString() : '—';


  return (
    <div className="space-y-8">
      <div className="card-elevated p-6 flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
          <Stethoscope className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-medium mb-1 text-foreground">{greeting}, {displayName}</h2>
          <p className="text-sm text-muted-foreground">You have {stats.todayAppointments} appointment(s) scheduled for today.</p>

        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statConfig.map((s) => (
          <div key={s.label} className="card-elevated p-4">
            <div className={`w-10 h-10 rounded-xl ${s.bgColor} flex items-center justify-center mb-2`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <p className="text-base font-medium">{stats[s.key]}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
<div className="lg:col-span-2 card-elevated p-4">
<div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium">Today's Schedule</h3>
            <Button asChild variant="outline" size="sm" className="h-8"><Link to="/doctor/appointments">View All</Link></Button>

          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : todayAppointments.length === 0 ? (
              <p className="text-muted-foreground text-sm">No appointments today.</p>
            ) : (
              todayAppointments.map((apt) => {
                const patientName = typeof apt.patient_id === 'object' && apt.patient_id !== null ? (apt.patient_id as any).name || 'Patient' : 'Patient';
                return (
                  <div key={apt._id} className="flex items-center justify-between p-4 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {apt.is_virtual ? <Video className="w-5 h-5 text-primary" /> : <span className="text-sm font-medium text-primary">{patientName.split(' ').map(n => n[0]).join('')}</span>}
                      </div>
                      <div><p className="font-medium">{patientName}</p><p className="text-sm text-muted-foreground">{apt.type}</p></div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatTime(apt.scheduled_at)}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${apt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{apt.status}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-elevated p-4">
            <div className="flex items-center gap-2 mb-4"><AlertTriangle className="w-5 h-5 text-destructive" /><h3 className="text-lg font-semibold">Urgent Cases</h3></div>
            <p className="text-muted-foreground text-center py-6 text-sm">No urgent cases</p>
          </div>
          <LiveActivityFeed events={liveEvents} />
        </div>
      </div>

<div className="card-elevated p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium">Recent Patients</h3>
          <Button asChild variant="outline" size="sm" className="h-8"><Link to="/doctor/patients">View All Patients</Link></Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-muted-foreground border-b">
                <th className="pb-3 font-medium">Patient</th>
                <th className="pb-3 font-medium">Last Visit</th>
                <th className="pb-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></td></tr>
              ) : recentPatients.length === 0 ? (
                <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">No patients yet</td></tr>
              ) : (
                recentPatients.map((patient) => (
                  <tr key={patient._id} className="border-b last:border-0">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                          <span className="text-xs font-medium">{patient.name.split(' ').map(n => n[0]).join('')}</span>
                        </div>
                        <span className="font-medium">{patient.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-muted-foreground">{formatLastVisit(patient.last_visit)}</td>
                    <td className="py-4"><Button asChild variant="ghost" size="sm"><Link to="/doctor/patients">View Records</Link></Button></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}