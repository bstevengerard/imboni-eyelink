import { Link } from 'react-router-dom';
import {
  MapPin,
  Phone,
  Mail,
  Facebook,
  Twitter,
  Linkedin,
  Instagram,
  Heart
} from 'lucide-react';
import logo from '@/assets/logo.png';

const socialLinks = [
  { name: 'Facebook', icon: Facebook, href: '#' },
  { name: 'Twitter', icon: Twitter, href: '#' },
  { name: 'LinkedIn', icon: Linkedin, href: '#' },
  { name: 'Instagram', icon: Instagram, href: '#' },
];

export default function Footer() {
  const footerLinks = {
    services: [
      { name: 'Eye Screening', href: '/services#screening' },
      { name: 'Tele-Consultation', href: '/services#teleconsultation' },
      { name: 'Mobile Clinics', href: '/services#mobile-clinics' },
      { name: 'Referral Network', href: '/services#referral' },
    ],
    resources: [
      { name: 'Education', href: '/education' },
      { name: 'Research Library', href: '/research' },
      { name: 'Hospitals', href: '/hospitals' },
      { name: 'FAQs', href: '/faqs' },
    ],
    company: [
      { name: 'About', href: '/about' },
      { name: 'Our Team', href: '/about#team' },
      { name: 'Careers', href: '/careers' },
      { name: 'Contact', href: '/contact' },
    ],
    legal: [
      { name: 'Privacy', href: '/privacy' },
      { name: 'Terms', href: '/terms' },
      { name: 'Cookies', href: '/cookies' },
    ],
  };

  return (
    <footer className="bg-foreground text-background">
      {/* Main Footer */}
      <div className="container mx-auto px-4 py-10 md:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-8 md:gap-12">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-2 text-center sm:text-left">
            <Link to="/" className="flex items-center justify-center sm:justify-start gap-3 mb-3">
             <img src={logo} alt="IMBONI EyeLink" className="h-10 sm:h-12 md:h-14 lg:h-16 w-auto object-contain" />
            </Link>
            <p className="text-background/70 mb-4 max-w-sm mx-auto sm:mx-0 text-sm md:text-base">
              Connecting communities with quality eye care through innovative technology and mobile clinics.
            </p>
            <div className="flex gap-3 justify-center sm:justify-start">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  className="w-9 h-9 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Services */}
          <div className="text-center sm:text-left">
            <h3 className="font-semibold text-base mb-4">Services</h3>
            <ul className="space-y-2.5">
              {footerLinks.services.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-background/70 hover:text-secondary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div className="text-center sm:text-left">
            <h3 className="font-semibold text-base mb-4">Resources</h3>
            <ul className="space-y-2.5">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-background/70 hover:text-secondary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="text-center sm:text-left">
            <h3 className="font-semibold text-base mb-4">Company</h3>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    className="text-background/70 hover:text-secondary transition-colors text-sm"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div className="text-center sm:text-left">
            <h3 className="font-semibold text-base mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start justify-center sm:justify-start gap-3">
                <MapPin className="h-4 w-4 text-secondary shrink-0 mt-0.5" />
                <span className="text-background/70 text-sm">
                   Kigali, Rwanda
                </span>
              </li>
              <li className="flex items-center justify-center sm:justify-start gap-3">
                <Phone className="h-4 w-4 text-secondary shrink-0" />
                <a href="tel:+250788000000" className="text-background/70 hover:text-secondary text-sm">
                  +250 788 000 000
                </a>
              </li>
              <li className="flex items-center justify-center sm:justify-start gap-3">
                <Mail className="h-4 w-4 text-secondary shrink-0" />
                <a href="mailto:info@imbonieyelink.rw" className="text-background/70 hover:text-secondary text-sm">
                  info@imbonieyelink.rw
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-background/10">
        <div className="container mx-auto px-4 py-5">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-background/60 text-xs sm:text-sm text-center md:text-left">
              <span>© {new Date().getFullYear()} IMBONI EyeLink. All rights reserved.</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {footerLinks.legal.map((link) => (
                <Link
                  key={link.name}
                  to={link.href}
                  className="text-xs sm:text-sm text-background/60 hover:text-secondary transition-colors"
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
