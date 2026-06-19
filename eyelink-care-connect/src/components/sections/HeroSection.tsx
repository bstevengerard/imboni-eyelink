import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Video, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/hero-eye-care.jpg';

export default function HeroSection() {
  const stats = [
    { value: '50K+', label: 'Patients Served', icon: Users },
    { value: '30+', label: 'Mobile Clinics', icon: MapPin },
    { value: '100+', label: 'Hospital Partners', icon: Calendar },
  ];

  return (
    <section className="section-hero min-h-screen flex items-center pt-20 relative overflow-hidden">
      
      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm mb-6 animate-fade-in">
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
              Rwanda's Digital Eye Health Platform
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 animate-slide-up">
              See the World Clearly with
              <span className="text-secondary"> IMBONI EyeLink</span>
            </h1>

            <p className="text-xl text-white/80 mb-8 max-w-xl mx-auto lg:mx-0 animate-slide-up stagger-1">
              Bridging the gap between communities and quality eye care through mobile clinics, tele-consultations, and cutting-edge digital health solutions.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8 animate-slide-up stagger-2">
              <Link to="/register">
                <Button className="btn-hero group">
                  Book an Eye Screening
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
              <Link to="/services">
                <button className="btn-hero-outline">
                  <Video className="h-5 w-5" />
                  Explore Our Services
                </button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 animate-slide-up stagger-3">
              {stats.map((stat) => (
                <div key={stat.label} className="stat-badge text-center group hover:bg-white/20 transition-colors">
                  <stat.icon className="h-5 w-5 mx-auto mb-2 text-secondary group-hover:scale-110 transition-transform" />
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-white/70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Image */}
          <div className="relative hidden lg:block animate-fade-in">
            <img
              src={heroImage}
              alt="Eye care consultation"
              className="rounded-2xl shadow-2xl w-full"
            />
            {/* Floating card - Clinic Visit */}
            <div className="absolute bottom-4 left-4 bg-white rounded-xl p-3 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-success" />
                </div>
                <div>
                  <div className="text-xs font-medium text-foreground">Next Clinic</div>
                  <div className="text-xs text-muted-foreground">Huye District</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Wave decoration */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
            fill="hsl(var(--background))"
          />
        </svg>
      </div>
    </section>
  );
}
