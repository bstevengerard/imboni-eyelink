import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { 
  MapPin, Phone, Mail, Clock, Send 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import heroImage from "@/assets/hero-eye-care.jpg";
import eyeTechImage from "@/assets/eye-tech.jpg";

const contactInfo = [
  {
    icon: MapPin,
    title: "Visit Us",
    details: ["KG 123 Street, Kigali", "Gasabo District, Rwanda"],
  },
  {
    icon: Phone,
    title: "Call Us",
    details: ["07350990930", "0789001926"],
  },
  {
    icon: Mail,
    title: "Email Us",
    details: ["info.imbonieyelink@gmail.com"],
  },
  {
    icon: Clock,
    title: "Working Hours",
    details: ["Mon - Fri: 8:00 AM - 6:00 PM", "Sat: 9:00 AM - 2:00 PM"],
  },
];

const departments = [
  { value: "general", label: "General Inquiry" },
  { value: "appointments", label: "Appointments" },
  { value: "billing", label: "Billing & Insurance" },
  { value: "technical", label: "Technical Support" },
  { value: "partnership", label: "Partnership Opportunities" },
  { value: "careers", label: "Careers" },
];

export default function ContactPage() {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    department: "general",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const res = await api.post('/api/contact', {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        subject: formData.subject,
        message: formData.message
      });
      
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll respond within 24 hours.",
      });
      
      setFormData({
        name: "",
        email: "",
        phone: "",
        department: "general",
        subject: "",
        message: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Eye Care" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-accent/90" />
        </div>
        <div className="container relative z-10 text-white">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Get in Touch
            </h1>
            <p className="text-xl text-white/90">
              Have questions about our services? Need to schedule an appointment? 
              We're here to help you with all your eye care needs.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Cards */}
      <section className="py-12 -mt-12 relative z-20">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((info) => (
              <div key={info.title} className="card-elevated p-6 text-center">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <info.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{info.title}</h3>
                {info.details.map((detail, index) => (
                  <p key={index} className="text-muted-foreground text-sm">{detail}</p>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Form & Map */}
      <section className="py-16 lg:py-24">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Form */}
            <div>
              <h2 className="text-3xl font-bold mb-2">Send Us a Message</h2>
              <p className="text-muted-foreground mb-8">
                Fill out the form below and we'll get back to you as soon as possible.
              </p>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name *</label>
                    <Input
                      required
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email *</label>
                    <Input
                      required
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <Input
                      placeholder="+250 7XX XXX XXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Department</label>
                    <select
                      className="w-full h-10 px-3 rounded-md border border-input bg-background"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    >
                      {departments.map((dept) => (
                        <option key={dept.value} value={dept.value}>{dept.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Subject *</label>
                  <Input
                    required
                    placeholder="What is this regarding?"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Message *</label>
                  <Textarea
                    required
                    rows={5}
                    placeholder="Tell us how we can help you..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>
                
                <Button type="submit" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </div>
            
            {/* Map & Additional Info */}
            <div>
              {/* Map Placeholder with Image */}
              <div className="relative bg-muted rounded-2xl h-80 mb-8 overflow-hidden">
                <img 
                  src={eyeTechImage} 
                  alt="Our Office" 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent flex items-end justify-center pb-8">
                  <div className="text-center">
                    <MapPin className="w-12 h-12 text-primary mx-auto mb-2" />
                    <p className="text-foreground font-medium">KG 123 Street, Kigali, Rwanda</p>
                    <p className="text-sm text-muted-foreground">Interactive map coming soon</p>
                  </div>
                </div>
              </div>
              
{/* Quick Contact Options */}
               <div className="space-y-4">
                 <h3 className="font-semibold text-lg">Other Ways to Reach Us</h3>
                 
                 <div className="card-elevated p-4 flex items-center gap-4">
                   <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                     <Phone className="w-6 h-6 text-primary" />
                   </div>
                   <div>
                     <h4 className="font-medium">Emergency Hotline</h4>
                     <p className="text-sm text-muted-foreground">24/7 for urgent cases</p>
                   </div>
                   <Button size="sm" className="ml-auto">
                     07350990930
                   </Button>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ CTA */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container text-center">
          <h2 className="text-3xl font-bold mb-4">Have More Questions?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Check out our frequently asked questions for quick answers to common inquiries.
          </p>
          <Button asChild size="lg" variant="outline">
            <a href="/faqs">View FAQs</a>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
