import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle, MessageSquare } from "lucide-react";

const faqCategories = [
  {
    title: "General Questions",
    faqs: [
      {
        question: "What is IMBONI EyeLink?",
        answer: "IMBONI EyeLink is Rwanda's comprehensive eye health platform that connects patients with eye care services, including hospital visits, mobile clinics, and tele-consultations. Our mission is to make quality eye care accessible to every Rwandan."
      },
      {
        question: "How do I create an account?",
        answer: "Click on 'Register' in the top navigation, select your role (Patient, Doctor, etc.), fill in your personal information, and create a password. You'll receive a confirmation email to verify your account."
      },
      {
        question: "Is IMBONI EyeLink free to use?",
        answer: "Creating an account and browsing our educational resources is free. Consultation fees and treatment costs vary depending on the service and location. We work with various insurance providers to make care affordable."
      },
      {
        question: "What languages does the platform support?",
        answer: "IMBONI EyeLink supports Kinyarwanda, English, and French. You can change your language preference in your profile settings or using the language selector in the navigation."
      },
    ],
  },
  {
    title: "Appointments & Services",
    faqs: [
      {
        question: "How do I book an appointment?",
        answer: "Log into your patient account, go to 'Appointments', click 'Book New Appointment', select your preferred service, location, date, and time. You'll receive a confirmation via SMS and email."
      },
      {
        question: "Can I book an appointment for someone else?",
        answer: "Yes, you can book appointments for family members. During booking, you'll have the option to specify that the appointment is for a dependent. You may need to provide their basic information."
      },
      {
        question: "What happens if I need to cancel or reschedule?",
        answer: "You can cancel or reschedule appointments up to 24 hours before the scheduled time through your patient portal. For last-minute changes, please call our hotline."
      },
      {
        question: "How does tele-consultation work?",
        answer: "Book a tele-consultation appointment, and at the scheduled time, log into your account and join the video call. You'll need a stable internet connection and a device with a camera. The doctor can provide diagnoses, prescriptions, and referrals remotely."
      },
    ],
  },
  {
    title: "Mobile Clinics",
    faqs: [
      {
        question: "How do I find when a mobile clinic is coming to my area?",
        answer: "Visit the 'Mobile Clinics' section on our homepage or check the schedule page. You can also sign up for SMS notifications when a clinic is scheduled for your district."
      },
      {
        question: "What services are available at mobile clinics?",
        answer: "Our mobile clinics offer eye screenings, vision tests, glasses dispensing, basic treatments, and referrals for complex cases. They're fully equipped to handle most common eye care needs."
      },
      {
        question: "Do I need to book for a mobile clinic visit?",
        answer: "While walk-ins are welcome, booking in advance ensures you get a time slot. You can book through the platform or by calling our hotline."
      },
    ],
  },
  {
    title: "Medical Records & Privacy",
    faqs: [
      {
        question: "How can I access my medical records?",
        answer: "Log into your patient portal and navigate to 'Medical Records'. You can view your complete eye health history, test results, prescriptions, and doctor's notes."
      },
      {
        question: "Is my health information secure?",
        answer: "Yes, we take data security seriously. All data is encrypted, and we comply with healthcare data protection regulations. Only you and your authorized healthcare providers can access your records."
      },
      {
        question: "Can I share my records with another doctor?",
        answer: "Yes, you can grant temporary access to other healthcare providers through your portal. You control who sees your information and for how long."
      },
    ],
  },
  {
    title: "Payment & Insurance",
    faqs: [
      {
        question: "What payment methods are accepted?",
        answer: "We accept mobile money (MTN, Airtel), bank transfers, credit/debit cards, and cash at physical locations. Insurance payments are processed directly with your provider."
      },
      {
        question: "Do you accept health insurance?",
        answer: "Yes, we work with major insurance providers including RSSB (Mutuelle de Santé), MMI, SORAS, and others. Check with your insurance provider for coverage details."
      },
      {
        question: "What if I can't afford treatment?",
        answer: "We believe everyone deserves access to eye care. Contact our team to discuss payment plans or learn about our partnership programs that provide subsidized care for those in need."
      },
    ],
  },
];

export default function FAQsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28 bg-gradient-to-br from-primary to-accent">
        <div className="container relative z-10 text-white">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <HelpCircle className="w-10 h-10" />
              <span className="text-lg font-medium">Help Center</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-white/90">
              Find answers to common questions about IMBONI EyeLink services, 
              appointments, and eye care.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Categories */}
      <section className="py-16 lg:py-24">
        <div className="container max-w-4xl">
          {faqCategories.map((category) => (
            <div key={category.title} className="mb-12">
              <h2 className="text-2xl font-bold mb-6 pb-2 border-b">{category.title}</h2>
              <Accordion type="single" collapsible className="space-y-4">
                {category.faqs.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`${category.title}-${index}`}
                    className="card-elevated px-6"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-4">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>
      </section>

      {/* Still Have Questions */}
      <section className="py-16 lg:py-24 bg-muted/30">
        <div className="container text-center">
          <MessageSquare className="w-16 h-16 text-primary mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4">Still Have Questions?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Can't find what you're looking for? Our support team is here to help 
            with any questions you may have.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/contact">Contact Support</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="tel:+250788123456">Call Us: +250 788 123 456</a>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
