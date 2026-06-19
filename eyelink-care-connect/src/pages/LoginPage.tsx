import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import eyeTech from '@/assets/eye-tech.jpg';
import { ButtonLoading } from '@/components/common/Loading';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        console.log('LoginPage: Login successful, user:', result.user);
        toast.success(result.message || 'Welcome back!', {
          description: 'Redirecting you to your dashboard...',
        });
        // Store user explicitly and redirect based on role
        if (result.user) {
          localStorage.setItem('user', JSON.stringify(result.user));
          console.log('LoginPage: User stored in localStorage:', result.user);
        }
        // Determine redirect path before navigating
        const redirectPath = (() => {
          const userRole = result.user?.role || 'patient';
          console.log('LoginPage: User role:', userRole);
          if (userRole === 'patient') return '/patient';
          if (userRole === 'doctor') return '/doctor';
          if (userRole === 'admin' || userRole === 'super_admin') return '/admin';
          return '/patient';
        })();
        // Small delay to ensure state is updated before navigation
        setTimeout(() => {
          console.log('LoginPage: Navigating to:', redirectPath);
          navigate(redirectPath, { replace: true });
        }, 300);
      } else {
        console.log('LoginPage: Login failed:', result.message);
        toast.error(result.message || 'Login failed', {
          description: 'Please check your credentials and try again',
        });
        // Check if user doesn't exist in database
        if (result.message?.includes('Invalid email') || result.message?.includes('not found')) {
          toast.error('No account found with this email. Please register first.', {
            description: 'Create a new account to continue',
          });
        }
      }
    } catch {
      toast.error('Login failed', {
        description: 'Please check your credentials and try again',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-12">
            <Link to="/" className="block">
              <img
                src={logo}
                alt="IMBONI EyeLink"
                className="h-24 w-auto rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
              />
            </Link>
          </div>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome back</h1>
            <p className="text-muted-foreground">
              Sign in to access your eye health portal and manage appointments.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-12 h-12"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="password">Password</Label>
                <Link 
                  to="/forgot-password" 
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-12 pr-12 h-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base gap-2 group"
              disabled={isLoading}
            >
              {isLoading ? (
                <ButtonLoading message="Signing in..." />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-background text-muted-foreground">
                New to IMBONI EyeLink?
              </span>
            </div>
          </div>

          {/* Register Link */}
          <Link to="/register">
            <Button variant="outline" className="w-full h-12">
              Create an Account
            </Button>
          </Link>

        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary" />
        <img
          src={eyeTech}
          alt="Eye care technology"
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white max-w-md">
            <h2 className="text-3xl font-bold mb-4">
              Your Vision, Our Mission
            </h2>
            <p className="text-white/80 text-lg">
              Access your complete eye health journey, from screenings to treatments, 
              all in one secure platform.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
