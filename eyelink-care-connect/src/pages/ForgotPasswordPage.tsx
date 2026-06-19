import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';
import eyeTech from '@/assets/eye-tech.jpg';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
      toast.success('Password reset link sent to your email!');
    }, 1500);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h1>
          <p className="text-muted-foreground mb-6">We've sent a password reset link to <strong>{email}</strong></p>
          <p className="text-sm text-muted-foreground mb-8">Didn't receive the email? Check your spam folder or try again.</p>
          <div className="space-y-4">
            <Button onClick={() => setIsSubmitted(false)} variant="outline" className="w-full">Try Different Email</Button>
            <Link to="/login"><Button className="w-full">Back to Sign In</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <div className="flex-1 flex flex-col justify-center px-8 md:px-16 lg:px-24 py-12">
        <div className="max-w-md w-full mx-auto">
          <Link to="/login" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="w-4 h-4" />Back to Sign In
          </Link>
          <Link to="/" className="flex items-center gap-3 mb-8">
            <img src={logo} alt="IMBONI EyeLink" className="h-10 w-auto" />
            <div><span className="text-xl font-bold text-primary">IMBONI</span><span className="text-xl font-bold text-secondary"> EyeLink</span></div>
          </Link>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Reset Your Password</h1>
            <p className="text-muted-foreground">Enter your email address and we'll send you a link to reset your password.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-12 h-12" required />
              </div>
            </div>
            <Button type="submit" className="w-full h-12 text-base" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending Reset Link...</>) : 'Send Reset Link'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-6">
            Remember your password?{' '}<Link to="/login" className="text-primary hover:underline">Sign in here</Link>
          </p>
        </div>
      </div>
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary" />
        <img src={eyeTech} alt="Eye care technology" className="absolute inset-0 w-full h-full object-cover mix-blend-overlay" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white max-w-md">
            <h2 className="text-3xl font-bold mb-4">Secure Password Recovery</h2>
            <p className="text-white/80 text-lg">Your account security is our priority. We'll help you regain access safely.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
