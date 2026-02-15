import React, { useState } from 'react';
import { toast } from 'sonner';
import axios from 'axios';
import { Lock, Mail, KeyRound, Eye, EyeOff, ShieldCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AppHeader from '@/components/shared/AppHeader';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminSettings = ({ user, onLogout }) => {
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [step, setStep] = useState('request'); // request, verify, change
  const [email, setEmail] = useState(user?.email || '');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [devOtp, setDevOtp] = useState(''); // For dev mode when email fails

  const handleRequestOtp = async () => {
    if (!email) {
      toast.error('Please enter your username or email');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/auth/request-otp`, { email });
      
      // Update email to actual email returned from backend (for OTP verification)
      if (response.data.email) {
        setEmail(response.data.email);
      }
      
      if (response.data.otp) {
        // Email failed, OTP returned in response (dev mode)
        setDevOtp(response.data.otp);
        toast.info('OTP generated (email service unavailable). Check below for OTP.');
      } else {
        toast.success('OTP sent to your email!');
      }
      
      setOtpSent(true);
      setStep('verify');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/verify-otp`, { email, otp });
      toast.success('OTP verified!');
      setStep('change');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-password`, {
        email,
        otp,
        new_password: newPassword
      });
      
      toast.success('Password changed successfully! Please login again.');
      setChangePasswordOpen(false);
      resetState();
      
      // Log out user after password change
      setTimeout(() => {
        onLogout();
      }, 2000);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const resetState = () => {
    setStep('request');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setOtpSent(false);
    setDevOtp('');
  };

  const handleDialogClose = (open) => {
    if (!open) {
      resetState();
    }
    setChangePasswordOpen(open);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader user={user} onLogout={onLogout} showBack={true} backTo="/admin" />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-serif text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground mb-8">Manage your account and preferences</p>

        {/* Account Section */}
        <div className="glass rounded-2xl p-6 mb-6">
          <h2 className="text-xl font-serif text-foreground mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Account Security
          </h2>

          <div className="space-y-4">
            {/* Current Email Display */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email Address</p>
                  <p className="font-medium">{user?.email}</p>
                </div>
              </div>
            </div>

            {/* Change Password Button */}
            <div className="flex items-center justify-between p-4 bg-muted/30 rounded-xl">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Password</p>
                  <p className="font-medium">••••••••</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={() => setChangePasswordOpen(true)}
                data-testid="change-password-button"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </div>
          </div>
        </div>

        {/* User Info Section */}
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-serif text-foreground mb-4">Account Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{user?.full_name}</p>
            </div>
            <div className="p-4 bg-muted/30 rounded-xl">
              <p className="text-sm text-muted-foreground">Role</p>
              <p className="font-medium capitalize">{user?.role?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={handleDialogClose}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-xl flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Change Password
            </DialogTitle>
            <DialogDescription>
              {step === 'request' && 'We\'ll send an OTP to your registered email to verify your identity.'}
              {step === 'verify' && 'Enter the 6-digit OTP sent to your email.'}
              {step === 'change' && 'Create a new secure password for your account.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {/* Step 1: Request OTP */}
            {step === 'request' && (
              <>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    data-testid="otp-email-input"
                  />
                </div>
                <Button 
                  onClick={handleRequestOtp} 
                  className="w-full"
                  disabled={loading}
                  data-testid="request-otp-button"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Sending...</>
                  ) : (
                    <>Send OTP</>
                  )}
                </Button>
              </>
            )}

            {/* Step 2: Verify OTP */}
            {step === 'verify' && (
              <>
                <div>
                  <Label htmlFor="otp">Enter OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    className="text-center text-2xl tracking-widest"
                    data-testid="otp-input"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    OTP sent to {email}
                  </p>
                </div>

                {/* Dev mode: Show OTP if email failed */}
                {devOtp && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 mb-1">Email service unavailable. Use this OTP:</p>
                    <p className="text-2xl font-bold text-amber-800 tracking-widest text-center">{devOtp}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep('request')}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleVerifyOtp}
                    className="flex-1"
                    disabled={loading || otp.length !== 6}
                    data-testid="verify-otp-button"
                  >
                    {loading ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</>
                    ) : (
                      <>Verify OTP</>
                    )}
                  </Button>
                </div>
              </>
            )}

            {/* Step 3: Change Password */}
            {step === 'change' && (
              <>
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                  ✓ OTP verified successfully
                </div>

                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      data-testid="new-password-input"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    data-testid="confirm-password-input"
                  />
                </div>

                {newPassword && confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}

                <Button 
                  onClick={handleChangePassword}
                  className="w-full"
                  disabled={loading || newPassword.length < 6 || newPassword !== confirmPassword}
                  data-testid="change-password-submit"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Changing...</>
                  ) : (
                    <>Change Password</>
                  )}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSettings;
