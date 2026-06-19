import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useParams, Link } from "react-router-dom";
import { Shield, FileText, Cookie } from "lucide-react";

const legalContent = {
  privacy: {
    icon: Shield,
    title: "Privacy Policy",
    lastUpdated: "January 15, 2024",
    sections: [
      {
        title: "Introduction",
        content: "IMBONI EyeLink ('we', 'our', or 'us') is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our eye health platform and services."
      },
      {
        title: "Information We Collect",
        content: "We collect information you provide directly to us, including: personal identification information (name, email, phone number, national ID), health information (medical history, eye examination results, prescriptions), payment information, and usage data from your interaction with our platform."
      },
      {
        title: "How We Use Your Information",
        content: "We use your information to: provide and improve our eye care services, schedule and manage appointments, communicate with you about your care, process payments, send health reminders and educational content, comply with legal obligations, and for research purposes (with anonymized data)."
      },
      {
        title: "Information Sharing",
        content: "We may share your information with: healthcare providers involved in your care, partner hospitals and clinics, insurance providers (for claims processing), payment processors, and government authorities when required by law. We never sell your personal health information."
      },
      {
        title: "Data Security",
        content: "We implement industry-standard security measures to protect your data, including encryption, secure servers, access controls, and regular security audits. However, no method of transmission over the internet is 100% secure."
      },
      {
        title: "Your Rights",
        content: "You have the right to: access your personal data, request corrections, delete your account, opt-out of marketing communications, and request a copy of your data. Contact us to exercise these rights."
      },
      {
        title: "Contact Us",
        content: "For privacy-related questions, contact our Data Protection Officer at privacy@imbonieyelink.rw or call +250 788 123 456."
      },
    ],
  },
  terms: {
    icon: FileText,
    title: "Terms of Service",
    lastUpdated: "January 15, 2024",
    sections: [
      {
        title: "Acceptance of Terms",
        content: "By accessing or using IMBONI EyeLink's platform and services, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access our services."
      },
      {
        title: "Services Description",
        content: "IMBONI EyeLink provides an eye health platform connecting patients with eye care services, including appointment booking, tele-consultations, mobile clinic scheduling, and health record management. We facilitate but do not replace professional medical care."
      },
      {
        title: "User Accounts",
        content: "You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately of any unauthorized access."
      },
      {
        title: "Acceptable Use",
        content: "You agree not to: use the platform for unlawful purposes, impersonate others, share false health information, interfere with platform operations, attempt unauthorized access, or use automated systems to access our services."
      },
      {
        title: "Medical Disclaimer",
        content: "Our platform provides information and facilitates access to eye care services but does not provide medical advice. Always consult qualified healthcare professionals for medical decisions. In emergencies, seek immediate medical attention."
      },
      {
        title: "Payment Terms",
        content: "Service fees are displayed before booking. Payments are processed securely through our payment partners. Refund policies vary by service type. Insurance claims are processed according to your provider's terms."
      },
      {
        title: "Limitation of Liability",
        content: "IMBONI EyeLink is not liable for: medical outcomes from healthcare providers, service interruptions, data loss beyond our control, or indirect damages. Our liability is limited to the amount paid for services."
      },
      {
        title: "Termination",
        content: "We may terminate or suspend access to our platform for violations of these terms. You may terminate your account at any time through your profile settings."
      },
    ],
  },
  cookies: {
    icon: Cookie,
    title: "Cookie Policy",
    lastUpdated: "January 15, 2024",
    sections: [
      {
        title: "What Are Cookies",
        content: "Cookies are small text files stored on your device when you visit our website. They help us remember your preferences, understand how you use our platform, and improve your experience."
      },
      {
        title: "Types of Cookies We Use",
        content: "Essential Cookies: Required for platform functionality (login, security). Performance Cookies: Help us understand usage patterns. Functionality Cookies: Remember your preferences (language, location). Analytics Cookies: Provide insights for platform improvement."
      },
      {
        title: "Third-Party Cookies",
        content: "We may use third-party services that set cookies, including: analytics providers (to understand usage), payment processors (for secure transactions), and social media platforms (if you share content)."
      },
      {
        title: "Managing Cookies",
        content: "Most browsers allow you to control cookies through settings. You can block or delete cookies, but this may affect platform functionality. Some essential cookies are required for core features to work."
      },
      {
        title: "Cookie Consent",
        content: "By using our platform, you consent to our use of cookies as described in this policy. You can withdraw consent at any time by adjusting your browser settings or contacting us."
      },
      {
        title: "Updates to This Policy",
        content: "We may update this policy periodically. Significant changes will be communicated through the platform or via email."
      },
    ],
  },
};

export default function LegalPage() {
  const { type } = useParams<{ type: string }>();
  const content = legalContent[type as keyof typeof legalContent] || legalContent.privacy;
  const Icon = content.icon;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-16 lg:py-24 bg-gradient-to-br from-primary to-accent">
        <div className="container relative z-10 text-white">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-4">
              <Icon className="w-10 h-10" />
              <span className="text-lg font-medium">Legal</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{content.title}</h1>
            <p className="text-white/80">Last updated: {content.lastUpdated}</p>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="py-6 border-b">
        <div className="container">
          <div className="flex flex-wrap gap-4">
            <Link 
              to="/privacy" 
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                type === 'privacy' ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Privacy Policy
            </Link>
            <Link 
              to="/terms" 
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                type === 'terms' ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Terms of Service
            </Link>
            <Link 
              to="/cookies" 
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                type === 'cookies' ? 'bg-primary text-white' : 'bg-muted hover:bg-muted/80'
              }`}
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16 lg:py-24">
        <div className="container max-w-4xl">
          <div className="prose prose-lg max-w-none">
            {content.sections.map((section, index) => (
              <div key={index} className="mb-10">
                <h2 className="text-2xl font-bold mb-4">{section.title}</h2>
                <p className="text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
