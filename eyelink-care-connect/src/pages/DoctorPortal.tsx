import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Calendar, Users, FileText, Pill,
  Video, ClipboardList, BarChart3, User, LogOut, Menu, MessageSquare, Settings
} from "lucide-react";
import NotificationCenter from "@/components/NotificationCenter";
import GoogleTranslate from "@/components/GoogleTranslate";
import logo from "@/assets/logo.png";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown } from "lucide-react";
import DoctorDashboard from "@/components/doctor/Dashboard";
import DoctorAppointments from "@/components/doctor/Appointments";
import DoctorPatients from "@/components/doctor/Patients";
import DoctorRecords from "@/components/doctor/MedicalRecords";
import DoctorPrescriptions from "@/components/doctor/Prescriptions";
import DoctorConsultation from "@/components/doctor/TeleConsultation";
import DoctorReferrals from "@/components/doctor/Referrals";
import DoctorPerformance from "@/components/doctor/Performance";
import DoctorProfile from "@/components/doctor/Profile";
import DoctorMessages from "@/components/doctor/Messages";

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/doctor', component: 'dashboard' },
  { name: 'Appointments', icon: Calendar, href: '/doctor/appointments', component: 'appointments' },
  { name: 'My Patients', icon: Users, href: '/doctor/patients', component: 'patients' },
  { name: 'Medical Records', icon: FileText, href: '/doctor/records', component: 'records' },
  { name: 'Prescriptions', icon: Pill, href: '/doctor/prescriptions', component: 'prescriptions' },
  { name: 'Tele-Consultation', icon: Video, href: '/doctor/consultation', component: 'consultation' },
  { name: 'Referrals', icon: ClipboardList, href: '/doctor/referrals', component: 'referrals' },
  { name: 'Performance', icon: BarChart3, href: '/doctor/performance', component: 'performance' },
  { name: 'Messages', icon: MessageSquare, href: '/doctor/messages', component: 'messages' },
  { name: 'Profile', icon: User, href: '/doctor/profile', component: 'profile' },
];

export default function DoctorPortal() {
  const { user, logout, refreshUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (!user) return null;
  
  const currentPath = location.pathname;
  const activeNav = navigation.find(nav => nav.href === currentPath) || navigation[0];

  const displayName = user.name;
  const firstName = displayName.trim().split(' ')[0];
  const drName = firstName && !firstName.toLowerCase().startsWith('dr')
    ? `Dr ${firstName}`
    : displayName;
  const avatar = drName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const userId = user.dr_id || user.id;
  const userEmail = user.email || '';

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const renderComponent = () => {
    switch (activeNav.component) {
      case 'dashboard': return <DoctorDashboard />;
      case 'appointments': return <DoctorAppointments />;
      case 'patients': return <DoctorPatients />;
      case 'records': return <DoctorRecords />;
      case 'prescriptions': return <DoctorPrescriptions />;
      case 'consultation': return <DoctorConsultation />;
      case 'referrals': return <DoctorReferrals />;
      case 'performance': return <DoctorPerformance />;
      case 'messages': return <DoctorMessages />;
      case 'profile': return <DoctorProfile />;
      default: return <DoctorDashboard />;
    }
  };

  const userInfo = (
    <div className="hidden md:flex items-center gap-3 pl-3 border-l">
      <div className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold">
        {avatar}
      </div>
      <div className="text-left">
        <div className="font-medium text-foreground text-sm">{drName}</div>
        <div className="text-xs text-muted-foreground font-mono">{userId}</div>
        {userEmail && <div className="text-xs text-muted-foreground truncate max-w-[160px]">{userEmail}</div>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-card border-r transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <Link to="/doctor" className="flex items-center gap-3">
              <img src={logo} alt="IMBONI EyeLink" className="h-16 w-auto" />
              <div>
                <span className="font-bold text-sm text-primary">IMBONI</span>
                <span className="block text-xs text-muted-foreground">Doctor <span className="text-green-500">Portal</span></span>
              </div>
            </Link>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = item.href === currentPath;
              return (
                <Link key={item.name} to={item.href} onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${isActive ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}>
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg">
                    {userInfo}
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <Link to="/doctor/profile"><DropdownMenuItem><User className="h-4 w-4 mr-2" />My Profile</DropdownMenuItem></Link>
                  <Link to="/doctor/settings"><DropdownMenuItem><Settings className="h-4 w-4 mr-2" />Settings</DropdownMenuItem></Link>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={logout}><LogOut className="h-4 w-4 mr-2" />Sign Out</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-8 h-[calc(100vh-5rem)]">{renderComponent()}</main>
      </div>
    </div>
  );
}
