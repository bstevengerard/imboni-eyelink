import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Eye, EyeOff, Mail, Lock, User, Phone, MapPin, 
  ArrowRight, ArrowLeft, Check 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import logo from '@/assets/logo.png';
import heroImage from '@/assets/hero-eye-care.jpg';
import { ButtonLoading } from '@/components/common/Loading';

const districts = [
  // City of Kigali (3 districts)
  'Nyarugenge',
  'Gasabo',
  'Kicukiro',
  
  // Southern Province (8 districts)
  'Nyanza',
  'Gisagara',
  'Nyaruguru',
  'Huye',
  'Nyamagabe',
  'Ruhango',
  'Muhanga',
  'Kamonyi',
  
  // Western Province (7 districts)
  'Karongi',
  'Rusizi',
  'Rutsiro',
  'Nyamasheke',
  'Ngororero',
  'Rubavu',
  'Nyabihu',
  
  // Northern Province (5 districts)
  'Musanze',
  'Burera',
  'Gicumbi',
  'Rulindo',
  'Gakenke',
  
  // Eastern Province (7 districts)
  'Bugesera',
  'Rwamagana',
  'Kayonza',
  'Ngoma',
  'Kirehe',
  'Nyagatare',
  'Gatsibo',
];

export default function RegisterPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    district: '',
    password: '',
    confirmPassword: '',
  });

  const handleNext = () => {
    if (step === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email) {
        toast.error('Please fill in all required fields', {
          description: 'First name, last name, and email are required',
        });
        return;
      }
      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        toast.error('Invalid email format', {
          description: 'Please enter a valid email address',
        });
        return;
      }
    }
    setStep(step + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match', {
        description: 'Please make sure both passwords are identical',
      });
      return;
    }
    
    // Validate name - ensure it's not empty
    const firstName = formData.firstName.trim();
    const lastName = formData.lastName.trim();
    const fullName = `${firstName} ${lastName}`.trim();
    
    if (!fullName) {
      toast.error('Name is required', {
        description: 'Please enter your first and last name',
      });
      return;
    }
    
    // Validate email
    if (!formData.email || !formData.email.trim()) {
      toast.error('Email is required', {
        description: 'Please enter your email address',
      });
      return;
    }
    
    // Validate password
    if (!formData.password || formData.password.length < 6) {
      toast.error('Password is too short', {
        description: 'Password must be at least 6 characters',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const res = await api.post<{ alreadyExists?: boolean }>('/api/auth/register', {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        name: fullName,
        role: 'patient',
        phone: formData.phone.trim(),
        district: formData.district,
      });
      if (res.success) {
        if (res.alreadyExists) {
          toast.info(res.message || 'An account already exists with this email.', {
            description: 'Please try logging in or contact support if you need assistance.',
          });
        } else {
          toast.success(res.message || 'Registration submitted successfully!', {
            description: 'Your account is pending administrator approval. You will be able to log in once approved.',
            duration: 6000,
          });
        }
      } else {
        toast.error((res as { message?: string }).message || 'Registration failed', {
          description: 'Please try again or contact support',
        });
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Registration failed. Please try again.';
      toast.error(errorMessage, {
        description: 'Unable to save your account. Please contact support or try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-accent/80" />
        <img
          src={heroImage}
          alt="Eye care"
          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay"
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white max-w-md">
            <h2 className="text-3xl font-bold mb-4">
              Join Our Community
            </h2>
            <p className="text-white/80 text-lg mb-8">
              Create your patient account to access comprehensive eye care services, 
              book appointments, and manage your health records.
            </p>
            <p className="text-white/60 text-sm mb-4">
              Are you a doctor or optometrist? Please contact the administrator to get your account created.
            </p>
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-4">
              {[1, 2].map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    step >= s ? 'bg-white text-primary' : 'bg-white/20 text-white'
                  }`}>
                    {step > s ? <Check className="h-5 w-5" /> : s}
                  </div>
                  {s < 2 && (
                    <div className={`w-12 h-0.5 ${step > s ? 'bg-white' : 'bg-white/20'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12">
        <div className="max-w-md w-full mx-auto">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Link to="/" className="block">
              <img
                src={logo}
                alt="IMBONI EyeLink"
                className="h-24 w-auto rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300"
              />
            </Link>
          </div>

          {/* Step 1: Personal Info */}
          {step === 1 && (
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold text-foreground mb-2">Create your patient account</h1>
              <p className="text-muted-foreground mb-8">
                Enter your personal information to get started
              </p>

              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="firstName"
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="pl-12 h-12"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      className="h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="pl-12 h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+250 7XX XXX XXX"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="pl-12 h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Select 
                    value={formData.district} 
                    onValueChange={(value) => setFormData({ ...formData, district: value })}
                  >
                    <SelectTrigger className="h-12">
                      <MapPin className="h-5 w-5 text-muted-foreground mr-2" />
                      <SelectValue placeholder="Select your district" />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button onClick={handleNext} className="w-full h-12 gap-2 group">
                Continue
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          )}

          {/* Step 2: Password */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="animate-fade-in">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>

              <h1 className="text-2xl font-bold text-foreground mb-2">Create Password</h1>
              <p className="text-muted-foreground mb-8">
                Choose a secure password for your account
              </p>

              <div className="space-y-4 mb-8">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="pl-12 pr-12 h-12"
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="pl-12 h-12"
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 gap-2 group"
                disabled={isLoading}
              >
                {isLoading ? (
                  <ButtonLoading message="Creating Account..." />
                ) : (
                  <>
                    Create Account
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>

              <p className="text-sm text-muted-foreground text-center mt-6">
                By creating an account, you agree to our{' '}
                <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link>
                {' '}and{' '}
                <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>
            </form>
          )}

          {/* Login Link */}
          <p className="text-center text-muted-foreground mt-8">
            Already have an account?{' '}
            <Link to="/login" className="text-primary font-medium hover:underline">
              Sign in
            </Link>
          </p>
          
          {/* Info for doctors/optometrists */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Doctors & Optometrists:</strong> Please contact the administrator to have your account created.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
