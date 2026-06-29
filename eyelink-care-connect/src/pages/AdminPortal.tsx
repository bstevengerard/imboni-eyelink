import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, Calendar, Truck, Building2,
  BarChart3, Settings, LogOut, Menu, Shield, Users as UsersIcon,
  Stethoscope, TrendingUp, Activity, Eye, HeartPulse, ArrowRight,
  Clock, UserCheck, Sparkles, Star, Flag, Mail, BookOpen, Heart, BookText
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationCenter from "@/components/NotificationCenter";
import GoogleTranslate from "@/components/GoogleTranslate";
import { api } from "@/lib/api";
import logo from "@/assets/logo.png";
import UserManagement from "@/components/admin/UserManagement";
import MobileClinics from "@/components/admin/MobileClinics";
import Analytics from "@/components/admin/Analytics";
import AdminSettings from "@/components/admin/Settings";
import TeamManagement from "@/components/admin/TeamManagement";
import HospitalManagement from "@/components/admin/HospitalManagement";
import ServiceTypes from "@/components/admin/ServiceTypes";
import SuccessStories from "@/components/admin/SuccessStories";
import JourneyMilestones from "@/components/admin/JourneyMilestones";
import AdminAppointments from "@/components/admin/Appointments";
import ContactMessages from "@/components/admin/ContactMessages";
import ResearchLibrary from "@/components/admin/ResearchLibrary";
import DonationManagement from "@/components/admin/DonationManagement";
import EducationManagement from "@/components/admin/EducationManagement";
import { useLiveEvents } from "@/hooks/useLiveEvents";
import LiveActivityFeed from "@/components/dashboard/LiveActivityFeed";

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/admin', component: 'dashboard' },
  { name: 'User Management', icon: Users, href: '/admin/users', component: 'users' },
  { name: 'Team Members', icon: UsersIcon, href: '/admin/team', component: 'team' },
  { name: 'Service Types', icon: Stethoscope, href: '/admin/services', component: 'services' },
  { name: 'Success Stories', icon: Star, href: '/admin/success-stories', component: 'successStories' },
  { name: 'Our Journey', icon: Flag, href: '/admin/journey', component: 'journey' },
  { name: 'Research Library', icon: BookOpen, href: '/admin/research', component: 'research' },
  { name: 'Education Content', icon: BookText, href: '/admin/education', component: 'education' },
  { name: 'Appointments', icon: Calendar, href: '/admin/appointments', component: 'appointments' },
  { name: 'Contact Messages', icon: Mail, href: '/admin/contact-messages', component: 'contactMessages' },
  { name: 'Mobile Clinics', icon: Truck, href: '/admin/clinics', component: 'clinics' },
  { name: 'Hospitals', icon: Building2, href: '/admin/hospitals', component: 'hospitals' },
  { name: 'Donation Management', icon: Heart, href: '/admin/donations', component: 'donations' },
  { name: 'Analytics', icon: BarChart3, href: '/admin/analytics', component: 'analytics' },
  { name: 'Settings', icon: Settings, href: '/admin/settings', component: 'settings' },
];

type DashboardStats = { totalUsers: number; activeDoctors: number; appointmentsToday: number; mobileClinicVisits: number };
type RecentUser = { id: number; name: string; email: string; role: string; date: string };

export default function AdminPortal() {
  const { user, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);
  const liveEvents = useLiveEvents('admin');
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const activeNav = navigation.find(nav => nav.href === currentPath) || navigation[0];
  const avatar = (user?.name ?? 'A').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const userInfo = (
    <div className="hidden md:block text-right">
      <div className="font-medium text-foreground">{user?.name ?? 'Super Admin'}</div>
      {!!user?.dr_id && <div className="text-xs text-muted-foreground font-mono">Dr. ID: {user.dr_id || user.id}</div>}
      {!!user?.email && <div className="text-xs text-muted-foreground">{user.email}</div>}
      {!user?.dr_id && !user?.email && <div className="text-xs text-muted-foreground">Full Access</div>}
    </div>
  );
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);

  useEffect(() => {
    if (activeNav.component !== 'dashboard') return;
    let cancelled = false;
    (async () => {
      try {
        const [statsRes, usersRes] = await Promise.all([
          api.get<DashboardStats>('/api/admin/dashboard/stats'),
          api.get<RecentUser[]>('/api/admin/dashboard/recent-users'),
        ]);
        if (cancelled) return;
        if (statsRes.success && statsRes.data) setStats(statsRes.data as DashboardStats);
        if (usersRes.success && Array.isArray(usersRes.data)) setRecentUsers(usersRes.data);
      } catch {
        if (!cancelled) setStats(null);
      }
    })();
    return () => { cancelled = true; };
  }, [activeNav.component]);

  return (
    <div className="min-h-screen bg-muted/30">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-card border-r transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <Link to="/admin" className="flex items-center gap-3">
              <img src={logo} alt="IMBONI EyeLink" className="h-10 w-auto" />
              <div>
                <span className="font-bold text-lg text-primary">IMBONI</span>
                <span className="block text-xs text-muted-foreground">Super <span className="text-green-500">Portal</span></span>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  item.href === currentPath ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t">
            <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive" onClick={logout}>
              <LogOut className="w-5 h-5" />
              Sign Out
            </Button>
          </div>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-sm border-b">
          <div className="flex items-center justify-between px-4 py-3 lg:px-8">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="w-6 h-6" />
              </Button>
              <h1 className="text-xl font-semibold">{activeNav.name}</h1>
            </div>
            <div className="flex items-center gap-3">
              <GoogleTranslate />
              <NotificationCenter />
              <div className="hidden md:block">
                {userInfo}
              </div>
              <div className="hidden md:flex items-center gap-3 pl-3 border-l">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
                  {user?.name ? <span className="text-sm font-medium">{avatar}</span> : <Shield className="w-5 h-5 text-primary-foreground" />}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8">
          {activeNav.component === 'dashboard' && (
            <div className="space-y-8">
              {/* Welcome Banner — flat surface */}
              <div className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">Admin Dashboard</p>
                       <h2 className="text-lg font-semibold">Welcome back, {user?.name ?? 'Admin'}</h2>
                       <p className="text-muted-foreground max-w-lg text-sm">Manage the IMBONI EyeLink platform.</p>
                    </div>
                  </div>
                  <Button variant="outline" className="h-8 px-3" onClick={() => navigate('/admin/analytics')}>
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Analytics
                  </Button>
                </div>
              </div>

              {/* Stat cards — flat, colored accents only */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="rounded-xl p-4 bg-card border border-border hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600"><Users className="w-4 h-4" /></div>
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-semibold">{stats?.totalUsers ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>

                <div className="rounded-xl p-4 bg-card border border-border hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600"><Stethoscope className="w-4 h-4" /></div>
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-semibold">{stats?.activeDoctors ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">Active Doctors</p>
                </div>

                <div className="rounded-xl p-4 bg-card border border-border hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600"><Calendar className="w-4 h-4" /></div>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-semibold">{stats?.appointmentsToday ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">Appointments</p>
                </div>

                <div className="rounded-xl p-4 bg-card border border-border hover:shadow-sm transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600"><Truck className="w-4 h-4" /></div>
                    <HeartPulse className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xl font-semibold">{stats?.mobileClinicVisits ?? '—'}</p>
                  <p className="text-xs text-muted-foreground">Mobile Visits</p>
                </div>
              </div>


              <LiveActivityFeed events={liveEvents} title="Live platform activity" />

              {/* Quick Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <button onClick={() => navigate('/admin/users')} className="group flex items-center gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                  <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold">Manage Users</p>
                    <p className="text-sm text-muted-foreground">Add, edit, or remove users</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>

                <button onClick={() => navigate('/admin/team')} className="group flex items-center gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                  <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <UsersIcon className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold">Team Members</p>
                    <p className="text-sm text-muted-foreground">Manage your team</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>

                <button onClick={() => navigate('/admin/hospitals')} className="group flex items-center gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                  <div className="p-3 rounded-xl bg-violet-500/10 text-violet-500 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold">Hospitals</p>
                    <p className="text-sm text-muted-foreground">Manage hospital network</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>

                <button onClick={() => navigate('/admin/education')} className="group flex items-center gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/50 hover:shadow-lg transition-all duration-300">
                  <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <BookText className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold">Education</p>
                    <p className="text-sm text-muted-foreground">Manage topics and content</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                </button>
              </div>

              {/* Recent Users with Modern Design */}
              <div className="rounded-xl bg-card border border-border overflow-hidden">
                <div className="p-6 border-b border-border bg-gradient-to-r from-muted/50 to-transparent">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold">Recent Users</h3>
                        <p className="text-sm text-muted-foreground">Latest registered users</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/admin/users')}>
                      View All
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {recentUsers.length === 0 ? (
                    <div className="p-8 text-center">
                      <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                      <p className="text-muted-foreground">No users yet.</p>
                    </div>
                  ) : (
                    recentUsers.map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-medium shadow-md">
                            {u.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                          </div>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <p className="text-sm text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                            u.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            u.role === 'doctor' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                            u.role === 'optometrist' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          }`}>
                            {u.role}
                          </span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{u.date}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
          {activeNav.component === 'users' && <UserManagement />}
          {activeNav.component === 'team' && <TeamManagement />}
          {activeNav.component === 'services' && <ServiceTypes />}
          {activeNav.component === 'successStories' && <SuccessStories />}
          {activeNav.component === 'journey' && <JourneyMilestones />}
          {activeNav.component === 'research' && <ResearchLibrary />}
          {activeNav.component === 'education' && <EducationManagement />}
          {activeNav.component === 'hospitals' && <HospitalManagement />}
          {activeNav.component === 'donations' && <DonationManagement />}
          {activeNav.component === 'clinics' && <MobileClinics />}
          {activeNav.component === 'analytics' && <Analytics />}
          {activeNav.component === 'settings' && <AdminSettings />}
          {activeNav.component === 'appointments' && <AdminAppointments />}
          {activeNav.component === 'contactMessages' && <ContactMessages />}
        </main>
      </div>
    </div>
  );
}
