import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/sections/HeroSection';
import ServicesSection from '@/components/sections/ServicesSection';
import AboutSection from '@/components/sections/AboutSection';
import MobileClinicsSection from '@/components/sections/MobileClinicsSection';
import TestimonialsSection from '@/components/sections/TestimonialsSection';
import EducationSection from '@/components/sections/EducationSection';
import CTASection from '@/components/sections/CTASection';

export default function Index() {
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <ServicesSection />
        <AboutSection />
        <MobileClinicsSection />
        <EducationSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
