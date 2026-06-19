import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { 
  Eye, Video, Truck, Stethoscope, Baby, Glasses, 
  Heart, Shield, CheckCircle, ArrowRight 
} from "lucide-react";
import teleConsultation from "@/assets/tele-consultation.jpg";
import mobileClinic from "@/assets/mobile-clinic.jpg";
import childScreening from "@/assets/child-screening.jpg";

const services = [
  {
    id: "screening",
    icon: Eye,
    title: "Comprehensive Eye Screening",
    description: "Complete eye examinations including visual acuity tests, refraction, and eye health assessment.",
    features: [
      "Visual acuity testing",
      "Refraction assessment",
      "Eye pressure measurement",
      "Retinal examination",
      "Disease screening",
    ],
    image: childScreening,
  },
  {
    id: "teleconsultation",
    icon: Video,
    title: "Tele-Consultation",
    description: "Connect with eye specialists remotely through secure video consultations from anywhere in Rwanda.",
    features: [
      "HD video consultations",
      "Specialist access 24/7",
      "Digital prescriptions",
      "Follow-up care",
      "Multilingual support",
    ],
    image: teleConsultation,
  },
  {
    id: "mobile-clinics",
    icon: Truck,
    title: "Mobile Eye Clinics",
    description: "Our fully-equipped mobile clinics bring comprehensive eye care directly to rural communities.",
    features: [
      "Community outreach",
      "On-site screening",
      "Glasses dispensing",
      "Referral services",
      "Health education",
    ],
    image: mobileClinic,
  },
  {
    id: "referral",
    icon: Stethoscope,
    title: "Specialist Referrals",
    description: "Seamless referral system connecting patients to the right specialists and hospitals.",
    features: [
      "Network of specialists",
      "Priority scheduling",
      "Complete medical records",
      "Treatment coordination",
      "Post-treatment follow-up",
    ],
  },
  {
    id: "pediatric",
    icon: Baby,
    title: "Pediatric Eye Care",
    description: "Specialized eye care services for children, including school screening programs.",
    features: [
      "School screening programs",
      "Amblyopia detection",
      "Pediatric glasses",
      "Child-friendly environment",
      "Parent education",
    ],
  },
  {
    id: "optical",
    icon: Glasses,
    title: "Optical Services",
    description: "Quality eyeglasses and contact lenses at affordable prices with professional fitting.",
    features: [
      "Wide frame selection",
      "Prescription lenses",
      "Contact lens fitting",
      "Repairs & adjustments",
      "Insurance accepted",
    ],
  },
];

const specialties = [
  { icon: Eye, name: "Cataract Surgery" },
  { icon: Heart, name: "Diabetic Eye Care" },
  { icon: Shield, name: "Glaucoma Treatment" },
  { icon: Baby, name: "Pediatric Ophthalmology" },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32">
        <div className="absolute inset-0 z-0">
          <img 
            src={childScreening} 
            alt="Eye Care Services" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 via-primary/70 to-accent/90" />
        </div>
        <div className="container relative z-10 text-white">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Comprehensive Eye Care Services
            </h1>
            <p className="text-xl text-white/90 mb-8">
              From routine screenings to advanced surgical procedures, we provide complete 
              eye care solutions for all ages across Rwanda.
            </p>
            <Button asChild size="lg" className="btn-hero">
              <Link to="/register">Book an Appointment</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We offer a full range of eye care services to meet the needs of every patient
            </p>
          </div>
          
          <div className="space-y-24">
            {services.map((service, index) => (
              <div 
                key={service.id} 
                id={service.id}
                className={`grid lg:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <service.icon className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-2xl md:text-3xl font-bold">{service.title}</h3>
                  </div>
                  <p className="text-lg text-muted-foreground mb-6">{service.description}</p>
                  <ul className="space-y-3 mb-8">
                    {service.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 text-accent flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild>
                    <Link to="/register" className="inline-flex items-center gap-2">
                      Book This Service <ArrowRight className="w-4 h-4" />
                    </Link>
                  </Button>
                </div>
                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                  {service.image ? (
                    <img 
                      src={service.image} 
                      alt={service.title}
                      className="rounded-2xl shadow-xl w-full h-80 object-cover"
                    />
                  ) : (
                    <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 w-full h-80 flex items-center justify-center">
                      <service.icon className="w-32 h-32 text-primary/30" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Medical Specialties</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Our team of specialists provides expert care across all areas of ophthalmology
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {specialties.map((specialty) => (
              <div key={specialty.name} className="card-elevated p-6 text-center hover:shadow-lg transition-shadow">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <specialty.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-lg">{specialty.name}</h3>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 lg:py-24 bg-primary text-white">
        <div className="container text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Book an appointment today and take the first step towards better eye health.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="btn-hero">
              <Link to="/register">Create Account</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-primary">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
