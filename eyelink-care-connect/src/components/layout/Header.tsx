import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import logo from '@/assets/logo.png';
import GoogleTranslate from '@/components/GoogleTranslate';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
    { name: 'Services', href: '/services' },
    { name: 'Education', href: '/education' },
    { name: 'Hospitals', href: '/hospitals' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border/50">
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="IMBONI EyeLink" className="h-16 sm:h-20 md:h-24 lg:h-[9rem] w-auto object-contain" />
          </Link>

          {/* Desktop Navigation and Actions */}
          <div className="hidden lg:flex items-center gap-4">
            <div className="flex items-center gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`nav-link ${location.pathname === item.href ? 'active' : ''}`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <GoogleTranslate />
              <Link to="/register">
                <Button className="bg-primary hover:bg-primary/90">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-muted"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-border animate-slide-up">
            <div className="flex flex-col gap-2">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                    location.pathname === item.href
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}

              <div className="h-px bg-border my-2" />
              <div className="px-4 py-2">
                <GoogleTranslate />
              </div>
              <Link
                to="/register"
                className="px-4 py-3 rounded-lg font-medium bg-primary text-primary-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
