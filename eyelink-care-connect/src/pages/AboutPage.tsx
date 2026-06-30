import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Heart, Eye, Users, Globe, Target, Award, CheckCircle, User } from "lucide-react";
import heroImage from "@/assets/hero-eye-care.jpg";
import mobileClinic from "@/assets/mobile-clinic.jpg";
import impactImage from "@/assets/61508.jpg";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";

type TeamMember = {
  _id: string;
  name: string;
  role: string;
  specialty?: string;
  bio?: string;
  photo_url?: string;
  order: number;
};

type JourneyMilestone = {
  _id: string;
  year: string;
  event: string;
  order: number;
};

const values = [
  { icon: Heart, title: "Compassion", description: "We treat every patient with dignity, empathy, and understanding" },
  { icon: Eye, title: "Excellence", description: "We deliver world-class eye care using the latest medical advances" },
  { icon: Users, title: "Accessibility", description: "Quality eye care should reach every community in Rwanda" },
  { icon: Globe, title: "Innovation", description: "We leverage technology to transform eye healthcare delivery" },
];

export default function AboutPage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [milestones, setMilestones] = useState<JourneyMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [journeyLoading, setJourneyLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await api.get<TeamMember[]>('/api/team');
        if (res.success && Array.isArray(res.data)) {
          setTeam(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch team members:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, []);

  useEffect(() => {
    const fetchJourney = async () => {
      try {
        const res = await api.get<JourneyMilestone[]>('/api/journey');
        if (res.success && Array.isArray(res.data)) {
          setMilestones(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch journey milestones:', error);
      } finally {
        setJourneyLoading(false);
      }
    };
    fetchJourney();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 to-primary/80" />
        <div className="container relative z-10 text-white">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Transforming Eye Care Across Rwanda
            </h1>
            <p className="text-xl text-white/90">
              IMBONI EyeLink is dedicated to eliminating preventable blindness by making quality 
              eye care accessible to every Rwandan, regardless of their location.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="card-elevated p-8">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
              <p className="text-muted-foreground text-lg">
                To provide accessible, affordable, and high-quality eye care services to all 
                Rwandans through innovative technology, mobile clinics, and a network of 
                dedicated healthcare professionals.
              </p>
            </div>
            <div className="card-elevated p-8">
              <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mb-6">
                <Award className="w-8 h-8 text-secondary" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Our Vision</h2>
              <p className="text-muted-foreground text-lg">
                A Rwanda where no one suffers from preventable blindness, where every 
                community has access to quality eye care, and where technology bridges 
                the gap between patients and specialists.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Core Values</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              These principles guide everything we do at IMBONI EyeLink
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div key={value.title} className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <value.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  IMBONI EyeLink was born from a simple observation: millions of Rwandans, 
                  especially in rural areas, lack access to basic eye care services. Many suffer 
                  from conditions that are easily treatable, yet they remain undiagnosed due to 
                  distance, cost, or lack of awareness.
                </p>
                <p>
                  Founded in 2020 by a team of dedicated ophthalmologists and technology 
                  enthusiasts, we set out to bridge this gap. Our name "IMBONI" means "vision" 
                  in Kinyarwanda – a fitting name for our mission to bring clear sight to all.
                </p>
                <p>
                  Today, we operate a network of mobile clinics, partner with hospitals across 
                  Rwanda, and provide tele-consultation services that connect patients with 
                  specialists, no matter where they are.
                </p>
              </div>
            </div>
            <div className="relative">
              <img 
                src={mobileClinic} 
                alt="IMBONI Mobile Clinic" 
                className="rounded-2xl shadow-xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Our Journey</h2>
          <div className="max-w-3xl mx-auto">
          {journeyLoading ? (
            <div className="flex items-center justify-center py-12">
              <CheckCircle className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : milestones.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">No journey milestones added yet.</p>
            </div>
          ) : (
            milestones.map((milestone, index) => (
              <div key={milestone._id} className="flex gap-6 mb-8 last:mb-0">
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                    {milestone.year.slice(-2)}
                  </div>
                  {index < milestones.length - 1 && (
                    <div className="w-0.5 h-full bg-primary/20 mt-2" />
                  )}
                </div>
                <div className="pb-8">
                  <span className="text-sm font-semibold text-primary">{milestone.year}</span>
                  <p className="text-lg mt-1">{milestone.event}</p>
                </div>
              </div>
            ))
          )}
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section id="team" className="py-8 lg:py-12 bg-muted/20">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">Our Leadership Team</h2>
            <p className="text-base text-muted-foreground max-w-2xl mx-auto">
              Meet the dedicated professionals driving innovation and excellence at IMBONI EyeLink
            </p>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="overflow-hidden animate-pulse">
                  <div className="aspect-[4/5] bg-muted" />
                  <div className="p-1.5 space-y-1">
                    <div className="h-3 bg-muted rounded w-2/3" />
                    <div className="h-2.5 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : team.length === 0 ? (
            <div className="text-center py-16">
              <User className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">Our leadership team will be featured here soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {team.map((member) => (
                <div
                  key={member._id}
                  className="group rounded-md overflow-hidden bg-card border border-border transition-all duration-200 hover:shadow-md"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-gradient-to-br from-primary/5 to-accent/5">
                    {member.photo_url ? (
                      <img
                        src={member.photo_url}
                        alt={member.name}
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-bold text-white">
                          {member.name.split(' ').slice(1, 3).map(n => n[0]).join('')}
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-primary/90 via-primary/70 to-transparent transition-opacity duration-200 opacity-0 group-hover:opacity-100 flex items-center justify-center p-2">
                      <p className="text-white text-xs font-medium leading-tight text-center line-clamp-4">
                        {member.bio || "Dedicated to transforming eye care."}
                      </p>
                    </div>
                  </div>
                  <div className="p-1.5">
                    <h3 className="font-semibold text-sm truncate">{member.name}</h3>
                    <p className="text-primary text-xs font-medium mt-0.5 truncate">{member.role}</p>
                    {member.specialty && (
                      <span className="inline-block text-[10px] bg-primary/10 text-primary px-1 py-0 rounded-full mt-1 truncate">
                        {member.specialty}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Impact Stats */}
      <section className="py-12 lg:py-16 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${impactImage})` }}
        />
        <div className="absolute inset-0 bg-primary/95" />
        <div className="container relative z-10 text-white">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-center mb-6">Our Impact</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1">50K+</div>
              <div className="text-white/80 text-xs md:text-sm">Patients Served</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1">30+</div>
              <div className="text-white/80 text-xs md:text-sm">Districts Reached</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1">10</div>
              <div className="text-white/80 text-xs md:text-sm">Partner Hospitals</div>
            </div>
            <div>
              <div className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1">5K+</div>
              <div className="text-white/80 text-xs md:text-sm">Surgeries Performed</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}