import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, BookOpen, ChevronDown } from 'lucide-react';
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
    { name: 'Education', href: '/education', children: [
        { name: 'Research Library', href: '/research' }
      ]
    },
    { name: 'Hospitals', href: '/hospitals' },
    { name: 'Contact', href: '/contact' },
    { name: 'Donate', href: '/donate' },
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
              {navigation.map((item) => {
                const isActive = location.pathname === item.href || (item.children && item.children.some(child => location.pathname === child.href));
                if (item.children) {
                  return (
                    <div key={item.href} className="relative group">
                      <Link
                        to={item.href}
                        className={`nav-link inline-flex items-center gap-1 ${isActive ? 'active' : ''}`}
                      >
                        {item.name}
                        <ChevronDown className="h-3.5 w-3.5 transition-transform group-hover:rotate-180" />
                      </Link>
                      <div className="absolute top-full left-0 pt-2 opacity-0 invisible translate-y-1 group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 z-50">
                        <div className="bg-card border border-border rounded-xl shadow-lg py-2 min-w-48 overflow-hidden">
                          {item.children.map((child) => (
                            <Link
                              key={child.href}
                              to={child.href}
                              className={`flex items-center gap-2 px-4 py-2.5 text-sm transition-colors ${
                                location.pathname === child.href
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                            >
                              <BookOpen className="h-4 w-4 shrink-0" />
                              <span>{child.name}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                  >
                    {item.name}
                  </Link>
                );
              })}
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
            <div className="flex flex-col gap-2 px-1">
              {navigation.map((item) => (
                <div key={item.href} className="px-2">
                  <Link
                    to={item.href}
                    className={`w-full block px-4 py-3 rounded-xl font-medium transition-colors border border-border/80 bg-card backdrop-blur-sm ${
                      location.pathname === item.href
                        ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                        : 'hover:bg-primary/10 hover:border-primary/40 hover:text-foreground'
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>

                  {item.children && (
                    <div className="mt-2 ml-3 pl-3 border-l border-border/60 space-y-1">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          to={child.href}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors border border-border/80 bg-card ${
                            location.pathname === child.href
                              ? 'bg-primary/10 text-primary font-medium border-primary/40'
                              : 'text-muted-foreground hover:bg-primary/10 hover:text-primary hover:border-primary/40'
                          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-card`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <BookOpen className="h-3.5 w-3.5 shrink-0" />
                          <span>{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              <div className="h-px bg-border my-2 mx-2" />

              <div className="px-4 py-2">
                <GoogleTranslate />
              </div>

              <Link
                to="/register"
                className="mx-2 px-4 py-3 rounded-xl font-medium bg-primary text-primary-foreground inline-flex items-center justify-center"
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
