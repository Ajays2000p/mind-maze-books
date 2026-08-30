import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Edit2, Save, X, User, ShieldCheck, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { userApi } from "@/services/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

export default function Profile() {
  const { user: authUser, updateUser } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: ""
  });

  // OTP Verification state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpValue, setOtpValue] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      setProfile(null);
      return;
    }
    fetchProfile();
  }, [authUser]);

  useEffect(() => {
    let timer: any;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await userApi.getProfile();
      setProfile(data);
      setFormData({
        name: data?.user?.name || "",
        email: data?.user?.email || ""
      });
    } catch (error) {
      console.error("Failed to fetch profile", error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const trimmedName = formData.name.trim();
    const trimmedEmail = formData.email.trim();

    if (!trimmedName) {
      toast({ title: "Full name cannot be empty", variant: "destructive" });
      return;
    }

    if (!trimmedEmail) {
      toast({ title: "Email address cannot be empty", variant: "destructive" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      toast({ title: "Please enter a valid email address", variant: "destructive" });
      return;
    }

    const currentEmail = (profile?.user?.email || "").toLowerCase();
    const emailHasChanged = trimmedEmail.toLowerCase() !== currentEmail;

    // CASE 1: Only name changed (Email unchanged)
    if (!emailHasChanged) {
      try {
        setSaving(true);
        const { data } = await userApi.updateProfile({ name: trimmedName });
        if (data?.user) {
          updateUser(data.user);
          setProfile((prev: any) => prev ? {
            ...prev,
            user: { ...prev.user, name: data.user.name }
          } : null);
        }
        toast({ title: "Profile updated successfully" });
        setIsEditing(false);
      } catch (error: any) {
        toast({
          title: "Failed to update profile",
          description: error.response?.data?.message || "An error occurred",
          variant: "destructive"
        });
      } finally {
        setSaving(false);
      }
      return;
    }

    // CASE 2: Email HAS changed -> Request OTP verification code
    try {
      setSaving(true);
      const { data } = await userApi.requestEmailChangeOtp({ newEmail: trimmedEmail });
      setPendingEmail(trimmedEmail);
      setOtpValue("");
      setShowOtpModal(true);
      setResendCooldown(30);

      toast({
        title: "Verification Code Sent",
        description: `An OTP code has been sent to ${trimmedEmail}`
      });
    } catch (error: any) {
      toast({
        title: "Validation Failed",
        description: error.response?.data?.message || "Could not send verification code",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpValue || otpValue.length < 6) {
      toast({ title: "Please enter the full 6-digit OTP code", variant: "destructive" });
      return;
    }

    try {
      setOtpLoading(true);
      const { data } = await userApi.verifyEmailChangeOtp({
        otp: otpValue,
        newName: formData.name.trim()
      });

      if (data?.user) {
        updateUser(data.user);
        setProfile((prev: any) => prev ? {
          ...prev,
          user: {
            ...prev.user,
            name: data.user.name,
            email: data.user.email
          }
        } : null);
      }

      toast({ title: "Email address updated successfully." });
      setShowOtpModal(false);
      setIsEditing(false);
    } catch (error: any) {
      toast({
        title: "Verification Failed",
        description: error.response?.data?.message || "Incorrect OTP code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    try {
      setResendLoading(true);
      await userApi.requestEmailChangeOtp({ newEmail: pendingEmail });
      setResendCooldown(30);
      toast({ title: "OTP code resent to your new email address." });
    } catch (error: any) {
      toast({
        title: "Resend Failed",
        description: error.response?.data?.message || "Could not resend OTP code",
        variant: "destructive"
      });
    } finally {
      setResendLoading(false);
    }
  };

  const handleCancelOtp = () => {
    setShowOtpModal(false);
    setFormData((prev) => ({
      ...prev,
      email: profile?.user?.email || ""
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background w-full">
        <Navbar />
        <div className="w-full px-6 lg:px-10 py-20 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background w-full">
        <Navbar />
        <div className="w-full px-6 lg:px-10 py-20 text-center space-y-4">
          <p className="text-base text-muted-foreground">Please sign in to view your profile.</p>
          <Button size="sm" asChild><Link to="/login">Sign In</Link></Button>
        </div>
      </div>
    );
  }

  const user = profile.user || {};
  const initials = (formData.name || user.name || "").split(" ").filter(Boolean).map((n: string) => n[0]).join("").toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background w-full">
      <Navbar />
      <main className="w-full flex-1 flex flex-col items-center justify-start px-6 lg:px-10 py-12">
        <div className="w-full max-w-lg space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
          </div>

          {/* Centered User Profile Card */}
          <Card className="border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b bg-muted/30 pb-6 pt-8">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-background shadow-md">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl font-bold">
                    {initials || <User size={28} />}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h2 className="text-lg font-semibold">{user.name}</h2>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium">Full Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Enter your full name"
                  className="bg-background/50 text-sm h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  placeholder="Enter your email address"
                  className="bg-background/50 text-sm h-9"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          name: user.name || "",
                          email: user.email || ""
                        });
                      }}
                      className="gap-1 text-xs h-8"
                    >
                      <X size={14} /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                      className="gap-1 text-xs h-8"
                    >
                      {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      Save
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="gap-1 text-xs h-8 w-full"
                  >
                    <Edit2 size={14} /> Edit Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* OTP Verification Modal */}
        <Dialog open={showOtpModal} onOpenChange={(open) => { if (!open) handleCancelOtp(); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader className="space-y-2">
              <div className="mx-auto p-3 rounded-full bg-primary/10 text-primary w-fit">
                <ShieldCheck size={28} />
              </div>
              <DialogTitle className="text-center text-xl">Email Verification</DialogTitle>
              <DialogDescription className="text-center text-sm">
                We sent a 6-digit OTP verification code to <span className="font-semibold text-foreground">{pendingEmail}</span>. Enter the code below to confirm your new email.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <InputOTP maxLength={6} value={otpValue} onChange={(val) => setOtpValue(val)}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Didn't receive the code?</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={resendCooldown > 0 || resendLoading}
                  onClick={handleResendOtp}
                  className="h-auto p-0 text-primary font-semibold hover:bg-transparent"
                >
                  {resendLoading ? (
                    <Loader2 size={12} className="animate-spin mr-1" />
                  ) : resendCooldown > 0 ? (
                    `Resend in ${resendCooldown}s`
                  ) : (
                    <span className="flex items-center gap-1"><RefreshCw size={12} /> Resend OTP</span>
                  )}
                </Button>
              </div>
            </div>

            <DialogFooter className="flex sm:justify-between gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelOtp}
                disabled={otpLoading}
                className="w-full sm:w-auto text-xs"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleVerifyOtp}
                disabled={otpLoading || otpValue.length < 6}
                className="w-full sm:w-auto text-xs"
              >
                {otpLoading && <Loader2 size={14} className="animate-spin mr-1" />}
                Verify & Update Email
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
