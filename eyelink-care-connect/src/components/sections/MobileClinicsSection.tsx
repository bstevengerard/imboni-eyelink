import { Eye, MapPin, Clock, Phone } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import clinicImage from '@/assets/48585.jpg';

const upcomingClinics = [
  {
    district: 'Huye District',
    location: 'Tumba Sector Health Center',
    date: 'January 20, 2026',
    time: '8:00 AM - 4:00 PM',
    services: ['eyeScreening', 'refraction', 'glassesDispensing'],
  },
  {
    district: 'Nyagatare District',
    location: 'Karangazi Sector',
    date: 'January 22, 2026',
    time: '8:00 AM - 4:00 PM',
    services: ['eyeScreening', 'diabeticScreening', 'referrals'],
  },
  {
    district: 'Rubavu District',
    location: 'Gisenyi Town Hall',
    date: 'January 25, 2026',
    time: '8:00 AM - 4:00 PM',
    services: ['fullExam', 'refraction', 'consultation'],
  },
];

export default function MobileClinicsSection() {

  return (
    <section className="py-24 bg-background overflow-hidden" id="mobile-clinics">
      <div className="container mx-auto px-4">
        {/* Featured Image & Header */}
        <div className="mb-16">
          <div className="relative h-64 md:h-80 rounded-3xl overflow-hidden mb-8">
            <img 
              src={clinicImage} 
              alt="Mobile eye clinic" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Upcoming Clinic Visits Near You
              </h2>
              <p className="text-lg text-white/80 max-w-2xl">
                Our mobile eye clinics travel across Rwanda bringing professional eye care to communities.
              </p>
            </div>
          </div>
        </div>

        {/* Clinic Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {upcomingClinics.map((clinic) => (
            <div 
              key={clinic.district} 
              className="card-elevated border-l-4 border-primary"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground">{clinic.district}</h3>
                  <p className="text-sm text-muted-foreground">{clinic.location}</p>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground font-medium">{clinic.date}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="w-4" />
                  {clinic.time}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {clinic.services.map((service) => (
                  <span
                    key={service}
                    className="px-3 py-1 bg-muted rounded-full text-xs font-medium text-muted-foreground"
                  >
                    {service === 'eyeScreening' ? 'Eye Screening' :
                     service === 'refraction' ? 'Refraction' :
                     service === 'glassesDispensing' ? 'Glasses Dispensing' :
                     service === 'diabeticScreening' ? 'Diabetic Screening' :
                     service === 'referrals' ? 'Referrals' :
                     service === 'fullExam' ? 'Full Exam' :
                     service === 'consultation' ? 'Consultation' : service}
                  </span>
                ))}
              </div>

              <Link to="/register">
                <Button variant="outline" className="w-full">
                  Book Clinic
                </Button>
              </Link>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Can't find a clinic near you? Request a mobile clinic visit for your community.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/contact">
              <Button className="gap-2">
                <Phone className="h-4 w-4" />
                Request a Clinic Visit
              </Button>
            </Link>
            <Link to="/hospitals">
              <Button variant="outline" className="gap-2">
                <Eye className="h-4 w-4" />
                Find Nearest Hospital
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
