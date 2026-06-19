import { Link } from 'react-router-dom';
import {
  Eye,
  Truck,
  Video,
  Stethoscope,
  GraduationCap,
  Building2,
  ArrowRight,
  Calendar
} from 'lucide-react';
import mobileClinic from '@/assets/mobile-clinic.jpg';
import teleConsultation from '@/assets/tele-consultation.jpg';
import childScreening from '@/assets/child-screening.jpg';
import { Button } from '@/components/ui/button';

export default function ServicesSection() {
  const services = [
    {
      icon: Eye,
      title: 'Eye Screening',
      description: 'Comprehensive eye examinations including visual acuity tests, refraction, and disease screening for all ages.',
      image: childScreening,
      gradient: 'primary',
      features: ['Visual Acuity Test', 'Refraction', 'Disease Screening'],
    },
    {
      icon: Truck,
      title: 'Mobile Clinics',
      description: 'Fully equipped mobile eye clinics bringing professional eye care directly to rural and underserved communities.',
      image: mobileClinic,
      gradient: 'warm',
      features: ['Rural Outreach', 'Free Screenings', 'Glasses Dispensing'],
    },
    {
      icon: Video,
      title: 'Tele-Consultation',
      description: 'Connect with ophthalmologists remotely for follow-ups, second opinions, and specialist consultations.',
      image: teleConsultation,
      gradient: 'heal',
      features: ['Video Calls', 'Quick Follow-ups', 'Specialist Access'],
    },
  ];

  const additionalServices = [
    {
      icon: Stethoscope,
      title: 'Diabetic Eye Screening',
      description: 'Specialized screening for diabetic retinopathy and related conditions.',
    },
    {
      icon: GraduationCap,
      title: 'Eye Health Education',
      description: 'Community awareness programs and educational resources on eye care.',
    },
    {
      icon: Building2,
      title: 'Referral Network',
      description: 'Seamless referrals to tertiary care centers for advanced treatments.',
    },
  ];

  return (
    <section className="py-24 section-gradient overflow-hidden" id="services">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            Our Services
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Comprehensive Eye Care at Your Doorstep
          </h2>
          <p className="text-lg text-muted-foreground">
            From screening to treatment, we provide end-to-end eye care services powered by technology and delivered with compassion.
          </p>
        </div>

        {/* Main Services */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 mb-16">
          {services.map((service, index) => (
            <div 
              key={service.title}
              className="card-service group relative flex h-full flex-col overflow-hidden rounded-2xl"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Image with hover zoom */}
              <div className="relative h-56 sm:h-60 rounded-t-2xl overflow-hidden">
                <img
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent" />
                {/* Icon overlay */}
                <div className={`absolute bottom-4 left-4 w-12 h-12 rounded-xl flex items-center justify-center ${service.gradient === 'primary' ? 'bg-primary' : service.gradient === 'warm' ? 'bg-amber-500' : 'bg-teal-500'} shadow-lg`}>
                  <service.icon className="h-6 w-6 text-white" />
                </div>
                {/* Gradient border at bottom */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 ${service.gradient === 'primary' ? 'bg-primary' : service.gradient === 'warm' ? 'bg-amber-500' : 'bg-teal-500'} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
              </div>
              
              {/* Content */}
              <div className="flex flex-1 flex-col p-6 bg-card">
                <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{service.title}</h3>
                <p className="text-muted-foreground mb-4 text-sm line-clamp-3">{service.description}</p>
                
                {/* Features list */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {service.features.map((feature) => (
                    <span key={feature} className="px-2 py-1 bg-muted rounded-md text-xs font-medium text-muted-foreground">
                      {feature}
                    </span>
                  ))}
                </div>

                {/* Push buttons to bottom for consistent card height */}
                <div className="mt-auto" />

                {/* Action buttons */}
                <div className="flex gap-3 mt-4">
                  <Link to="/register" className="flex-1">
                    <Button className="w-full gap-2 group-hover:bg-primary/90">
                      <Calendar className="h-4 w-4" />
                      Book Now
                    </Button>
                  </Link>
                  <Link
                    to={`/services#${service.title.toLowerCase().replace(' ', '-')}`}
                    className="px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors flex items-center gap-2"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              
              {/* Hover shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            </div>
          ))}
        </div>

        {/* Additional Services */}
        <div className="bg-card rounded-3xl p-8 md:p-12 shadow-xl">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-foreground">Additional Services</h3>
              <p className="text-muted-foreground text-sm">More ways we help protect your vision</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {additionalServices.map((service, index) => (
              <div
                key={service.title}
                className="group flex min-h-[9.5rem] flex-col p-6 rounded-2xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-300 cursor-pointer"
                style={{ animationDelay: `${index * 0.1}s` }}
              >

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                    <service.icon className="h-6 w-6 text-primary group-hover:text-white" />
                  </div>
                  <div className="flex-1 flex flex-col min-w-0">
                    <h4 className="font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{service.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{service.description}</p>

                    <div className="mt-auto" />

                    <Link 
                      to={`/services#${service.title.toLowerCase().replace(' ', '-')}`}
                      className="inline-flex items-center text-sm text-primary font-medium hover:gap-2 gap-1 transition-all"
                    >
                      Learn More <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>

              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
