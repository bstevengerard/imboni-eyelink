import { useState, useEffect } from "react";
import { Users, Calendar, Star, Clock, CheckCircle, Loader2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

type FeedbackItem = { id: string; patient: string; rating: number; comment: string | null; date: string };
type Achievement = { title: string; description: string; earned: boolean };

type PerformanceData = {
  patientsSeen: number;
  appointments: number;
  avgRating: string;
  ratingCount: number;
  recentFeedback: FeedbackItem[];
  appointmentTrend: { month: string; count: number }[];
  ratingDistribution: { rating: number; count: number }[];
  achievements?: Achievement[];
};

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];

export default function DoctorPerformance() {
  const { user } = useAuth();
  const [stats, setStats] = useState<PerformanceData>({ patientsSeen: 0, appointments: 0, avgRating: '0', ratingCount: 0, recentFeedback: [], appointmentTrend: [], ratingDistribution: [], achievements: [] });
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('month');

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<{ success: boolean; data: PerformanceData }>('/api/doctor/performance/stats');
        if (!cancelled && res.success && res.data) {
          setStats(res.data);
        }
      } catch {
        if (!cancelled) { setStats({ patientsSeen: 0, appointments: 0, avgRating: '0', ratingCount: 0, recentFeedback: [], appointmentTrend: [], ratingDistribution: [], achievements: [] }); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const handleExportReport = () => {
    const html = `<!DOCTYPE html>
<html>
<head>
  <title>IMBONI EyeLink - Performance Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
    .logo { height: 60px; margin-bottom: 10px; }
    h1 { color: #3b82f6; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: left; }
    th { background: #f9fafb; }
  </style>
</head>
<body>
  <div class="header">
    <img src="/IMBONI.png" alt="IMBONI EyeLink" class="logo" />
    <h1>IMBONI EyeLink</h1>
    <p>Performance Report - ${timeFilter.charAt(0).toUpperCase() + timeFilter.slice(1)}</p>
  </div>
  <h2>Overview</h2>
  <p><strong>Patients Seen:</strong> ${stats.patientsSeen}</p>
  <p><strong>Appointments:</strong> ${stats.appointments}</p>
  <p><strong>Average Rating:</strong> ${stats.avgRating}/5</p>
  <p><strong>Total Ratings:</strong> ${stats.ratingCount}</p>
  <h2>Recent Feedback</h2>
  <table>
    <tr><th>Patient</th><th>Rating</th><th>Comment</th><th>Date</th></tr>
    ${stats.recentFeedback.map(f => `<tr><td>${f.patient}</td><td>${f.rating}/5</td><td>${f.comment || 'N/A'}</td><td>${f.date}</td></tr>`).join('')}
  </table>
</body>
</html>`;
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
      newWindow.print();
    }
  };

  const statCards = [
    { label: "Patients Seen", value: String(stats.patientsSeen), icon: Users },
    { label: "Appointments", value: String(stats.appointments), icon: Calendar },
    { label: "Patient Rating", value: stats.avgRating, icon: Star },
    { label: "Ratings Count", value: String(stats.ratingCount), icon: Clock },
  ];

  const chartRatingData = stats.ratingDistribution.length > 0 
    ? stats.ratingDistribution 
    : [1, 2, 3, 4, 5].map(r => ({ rating: r, count: 0 }));

  const achievements = stats.achievements || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Performance Dashboard
          </h2>
          <p className="text-muted-foreground">Track your metrics and patient feedback</p>
        </div>
        <div className="flex gap-3">
          <select 
            className="h-10 px-4 rounded-md border bg-background"
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
          >
            <option value="month">This Month</option>
            <option value="quarter">This Quarter</option>
            <option value="year">This Year</option>
          </select>
          <Button variant="outline" onClick={handleExportReport}>Export Report</Button>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <div key={stat.label} className="card-elevated p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Appointment Trend */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Appointment Trend (Last 6 Months)</h3>
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : stats.appointmentTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={stats.appointmentTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
                <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-muted-foreground text-sm py-24 text-center">No trend data available</p>
          )}
        </div>

        {/* Rating Distribution - Pie Chart */}
        <div className="card-elevated p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><BarChart3 className="w-5 h-5" /> Rating Distribution</h3>
          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={chartRatingData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="count"
                  label={({ rating, count }) => `${rating}★: ${count}`}
                  labelLine={false}
                >
                  {chartRatingData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} ratings`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Recent Feedback */}
      <div className="card-elevated p-6">
        <h3 className="text-lg font-semibold mb-4">Recent Patient Feedback</h3>
        {loading ? (
          <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : stats.recentFeedback.length === 0 ? (
          <p className="text-muted-foreground text-sm">No feedback yet.</p>
        ) : (
          <div className="space-y-4">
            {stats.recentFeedback.map((fb) => (
              <div key={fb.id} className="p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{fb.patient}</span>
                  <span className="text-sm text-muted-foreground">{fb.date}</span>
                </div>
                <div className="flex items-center gap-1 text-primary mb-1">
                  {Array.from({ length: 5 }).map((_, j) => (
                    <Star key={`${fb.id}-${j}`} className={`w-4 h-4 fill-current ${j < fb.rating ? 'opacity-100' : 'opacity-30'}`} />
                  ))}
                </div>
                {fb.comment && <p className="text-sm text-muted-foreground">{fb.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Achievements - Dynamic from API */}
      <div className="card-elevated p-6">
        <h3 className="text-lg font-semibold mb-4">Your Achievements</h3>
        {loading ? (
          <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : achievements.length === 0 ? (
          <p className="text-muted-foreground text-sm">No achievements yet.</p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <div key={achievement.title} className={`p-4 rounded-xl border ${achievement.earned ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' : 'bg-muted/50'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${achievement.earned ? 'bg-green-100 dark:bg-green-900/40' : 'bg-muted'}`}>
                    {achievement.earned ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <Star className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className={`font-medium ${!achievement.earned && 'text-muted-foreground'}`}>{achievement.title}</p>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}