import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, FileText, Pill, Video,
  MessageSquare, User, Settings, LogOut, Menu, X, ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import NotificationCenter from '@/components/NotificationCenter';
import GoogleTranslate from '@/components/GoogleTranslate';
import logo from '@/assets/logo.png';
import { useAuth } from '@/contexts/AuthContext';

import PatientDashboard from '@/components/patient/Dashboard';
import PatientAppointments from '@/components/patient/Appointments';
import PatientRecords from '@/components/patient/MedicalRecords';
import PatientPrescriptions from '@/components/patient/Prescriptions';
import PatientTeleConsultation from '@/components/patient/TeleConsultation';
import PatientMessages from '@/components/patient/Messages';
import PatientProfile from '@/components/patient/Profile';
import PatientSettings from '@/components/patient/Settings';

const navigation = [
  { name: 'Dashboard', icon: LayoutDashboard, href: '/patient', component: 'dashboard' },
  { name: 'Appointments', icon: Calendar, href: '/patient/appointments', component: 'appointments' },
  { name: 'Medical Records', icon: FileText, href: '/patient/records', component: 'records' },
  { name: 'Prescriptions', icon: Pill, href: '/patient/prescriptions', component: 'prescriptions' },
  { name: 'Tele-Consultation', icon: Video, href: '/patient/consultation', component: 'consultation' },
  { name: 'Messages', icon: MessageSquare, href: '/patient/messages', component: 'messages' },
  { name: 'Profile', icon: User, href: '/patient/profile', component: 'profile' },
];

export default function PatientPortal() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  if (!user) return null;
  
  const currentPath = location.pathname;
  const activeNav = navigation.find(nav => nav.href === currentPath) || navigation[0];

  const displayName = user.name;
  const avatar = displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const renderComponent = () => {
    switch (activeNav.component) {
      case 'dashboard': return <PatientDashboard />;
      case 'appointments': return <PatientAppointments />;
      case 'records': return <PatientRecords />;
      case 'prescriptions': return <PatientPrescriptions />;
      case 'consultation': return <PatientTeleConsultation />;
      case 'messages': return <PatientMessages />;
      case 'profile': return <PatientProfile />;
      case 'settings': return <PatientSettings />;
      default: return <PatientDashboard />;
    }
  };

  const userInfo = (
    <div className="hidden sm:flex items-center gap-3 pl-3 border-l">
      <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
        {avatar}
      </div>
      <div className="text-left">
        <div className="font-medium text-foreground text-sm">{displayName}</div>
        <div className="text-xs text-muted-foreground font-mono">{user.pt_id || user.id}</div>
        <div className="text-xs text-muted-foreground truncate max-w-[160px]">{user.email}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-foreground/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-20 flex items-center justify-between px-6 border-b border-border">
          <Link to="/patient" className="flex items-center gap-3">
            <img src={logo} alt="IMBONI" className="h-16 w-auto" />
            <div>
              <span className="font-bold text-primary">Patient</span>&nbsp;
              <span className="font-bold text-green-600">Portal</span>
            </div>
          </Link>
          <button className="lg:hidden p-2 hover:bg-muted rounded-lg" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setSidebarOpen(false)}
              className={`sidebar-item w-full ${currentPath === item.href ? 'active' : ''}`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border">
          <Link to="/patient/settings" onClick={() => setSidebarOpen(false)} className={`sidebar-item w-full mb-2 ${currentPath === '/patient/settings' ? 'active' : ''}`}>
            <Settings className="h-5 w-5" />
            Settings
          </Link>
          <button type="button" onClick={logout} className="sidebar-item w-full text-destructive hover:bg-destructive/10 hover:text-destructive">
            <LogOut className="h-5 w-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <div className="lg:ml-72">
        <header className="h-20 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button className="lg:hidden p-2 hover:bg-muted rounded-lg" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{activeNav.name}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Welcome back, {displayName}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <GoogleTranslate />
            <NotificationCenter />
            {userInfo}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 p-2 hover:bg-muted rounded-lg">
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <Link to="/patient/profile"><DropdownMenuItem><User className="h-4 w-4 mr-2" />My Profile</DropdownMenuItem></Link>
                <Link to="/patient/settings"><DropdownMenuItem><Settings className="h-4 w-4 mr-2" />Settings</DropdownMenuItem></Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={logout}><LogOut className="h-4 w-4 mr-2" />Sign Out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-6 h-[calc(100vh-5rem)]">{renderComponent()}</main>
      </div>
    </div>
  );
}
