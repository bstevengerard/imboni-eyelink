import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Target, Lightbulb, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import eyeTech from '@/assets/eye-tech.jpg';

export default function AboutSection() {
  const features = [
    'Technology-driven mobile eye clinics',
    'Community-based outreach programs',
    'Digital patient tracking & follow-up',
    'Specialized care for all age groups',
    'Strong referral network with hospitals',
    'Bilingual AI-powered chatbot support',
  ];

  const values = [
    {
      icon: Target,
      title: 'Our Mission',
      description: 'To provide sustainable, technology-driven eye care services through digital health solutions, delivering prevention, early detection, treatment, and community education.',
    },
    {
      icon: Lightbulb,
      title: 'Our Vision',
      description: 'To eliminate reversible blindness and ensure our community has full access to comprehensive eye health education and services.',
    },
    {
      icon: Heart,
      title: 'Our Values',
      description: 'Compassion, innovation, accessibility, and excellence guide everything we do as we work to transform eye care across Rwanda.',
    },
  ];

  return (
    <section className="py-24 bg-background overflow-hidden" id="about">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
          {/* Image Side */}
          <div className="relative">
            <img
              src={eyeTech}
              alt="Eye technology"
              className="rounded-2xl shadow-xl w-full"
            />
            {/* Stats overlay - moved below image */}
            <div className="mt-6 bg-card rounded-xl p-4 shadow-lg inline-flex items-center gap-4">
              <div className="text-left">
                <div className="text-2xl font-bold text-primary">Since 2024</div>
                <div className="text-sm text-muted-foreground">Serving Rwanda</div>
              </div>
            </div>
          </div>

          {/* Content Side */}
          <div>
            <span className="inline-block px-4 py-2 rounded-full bg-accent/10 text-accent text-sm font-medium mb-4">
              About IMBONI EyeLink
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
              Bridging the Gap Between Communities and Quality Eye Care
            </h2>
            <p className="text-lg text-muted-foreground mb-6">
              IMBONI EyeLink was conceived to respond to critical gaps in eye care access by leveraging mobile clinic technology, digital health solutions, and community-based outreach to decentralize eye care services across Rwanda.
            </p>
            <p className="text-muted-foreground mb-8">
              In partnership with the University of Rwanda's College of Medicine and Health Sciences, we're building a sustainable model that combines clinical excellence with technological innovation to reach every corner of our nation.
            </p>

            <div className="grid sm:grid-cols-2 gap-3 mb-8">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-success shrink-0" />
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>

            <Link to="/about">
              <Button className="gap-2 group">
                Learn More
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Values */}
        <div className="grid md:grid-cols-3 gap-8">
          {values.map((value, index) => (
            <div 
              key={value.title} 
              className="card-elevated text-center group hover:shadow-xl transition-all duration-500"
              style={{ animationDelay: `${index * 0.15}s` }}
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:bg-primary group-hover:scale-110 transition-all duration-300">
                <value.icon className="h-10 w-10 text-primary group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">{value.title}</h3>
              <p className="text-muted-foreground">{value.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
