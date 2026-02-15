import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Sparkles, Mail, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Login = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/auth/login`, { email, password });
      toast.success('Welcome to Nirvaana Wellness');
      onLogin(response.data.user, response.data.token);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div
        className="lg:w-1/2 h-64 lg:h-screen bg-cover bg-center relative"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1741678095296-2b5cd407cc90?auto=format&fit=crop&q=80')"
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#2C2420]/60 to-[#B89D62]/40"></div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <img 
              src="https://customer-assets.emergentagent.com/job_wellness-erp-core/artifacts/fny25i7a_Logo.png" 
              alt="Nirvaana Wellness"
              className="w-48 h-auto mx-auto mb-6"
            />
            <p className="text-muted-foreground">Internal Operations Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6" data-testid="login-form">
            <div className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-11 h-12 rounded-lg"
                  required
                  data-testid="email-input"
                />
              </div>

              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-11 h-12 rounded-lg"
                  required
                  data-testid="password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-full text-base"
              disabled={loading}
              data-testid="login-submit-button"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            <p>Need assistance? Contact your administrator</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;