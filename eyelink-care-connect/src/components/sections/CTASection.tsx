import { Link } from 'react-router-dom';
import { ArrowRight, Phone, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ctaBackgroundImage from '@/assets/61510.jpg';

export default function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${ctaBackgroundImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/95 to-primary/80" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium mb-6">
            Get Started Today
          </span>

          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Your Vision Matters<br />
            <span className="text-secondary">Take Action Now</span>
          </h2>

          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Schedule your eye care appointment today and ensure the health of your vision. Our expert team is ready to provide comprehensive care.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register">
              <Button className="btn-hero group">
                <Calendar className="h-5 w-5" />
                Book Appointment
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <a href="tel:+250788000000">
              <button className="btn-hero-outline">
                <Phone className="h-5 w-5" />
                Call Us
              </button>
            </a>
          </div>

          {/* Trust indicators */}
          <div className="mt-12 flex flex-wrap justify-center gap-8 text-white/60 text-sm">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Free Consultation
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Qualified Specialists
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-success" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Community Outreach
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
