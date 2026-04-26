import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Edit2, Save, X, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { userApi } from "@/services/api";

export default function Profile() {
  const { user: authUser } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: ""
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data } = await userApi.getProfile();
      setProfile(data);
      setFormData({
        name: data.user.name,
        email: data.user.email
      });
    } catch (error) {
      console.error("Failed to fetch profile", error);
      toast({ title: "Failed to load profile", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      // Only send the name to the backend
      const { data } = await userApi.updateProfile({ name: formData.name });
      toast({ title: "Profile updated successfully" });
      setIsEditing(false);
      // Refresh local profile state
      setProfile({
        ...profile,
        user: {
          ...profile.user,
          name: formData.name
        }
      });
    } catch (error: any) {
      toast({ 
        title: "Failed to update profile", 
        description: error.response?.data?.message || "An error occurred", 
        variant: "destructive" 
      });
    } finally {
      setSaving(false);
    }
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
        <div className="w-full px-6 lg:px-10 py-20 text-center">
          <p className="text-base text-muted-foreground">Please sign in to view your profile.</p>
          <Button className="mt-4" size="sm" asChild><Link to="/login">Sign In</Link></Button>
        </div>
      </div>
    );
  }

  const initials = formData.name.split(" ").map((n: string) => n[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-background w-full">
      <Navbar />
      <main className="w-full flex-1 flex flex-col items-center justify-start px-6 lg:px-10 py-12">
        <div className="w-full max-w-xl space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-muted-foreground">Manage your profile information and preferences.</p>
          </div>

          <Card className="border shadow-sm overflow-hidden bg-card/50 backdrop-blur-sm">
            <CardHeader className="border-b bg-muted/30 pb-6 pt-8">
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-24 w-24 border-2 border-background shadow-md">
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                    {initials || <User size={32} />}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h2 className="text-xl font-semibold">{profile.user.name}</h2>
                  <p className="text-sm text-muted-foreground">{profile.user.email}</p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium">Full Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={!isEditing}
                    placeholder="Enter your full name"
                    className="bg-background/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-muted-foreground">Email Address</Label>
                  <Input
                    id="email"
                    value={formData.email}
                    disabled={true}
                    className="bg-muted text-muted-foreground border-dashed"
                  />
                  <p className="text-[11px] text-muted-foreground opacity-70">Email addresses are verified and cannot be changed.</p>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t">
                {isEditing ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        setFormData({
                          name: profile.user.name,
                          email: profile.user.email
                        });
                      }}
                      className="gap-2"
                    >
                      <X size={16} /> Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSave}
                      disabled={saving}
                      className="gap-2"
                    >
                      {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                      Save Changes
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="gap-2"
                  >
                    <Edit2 size={16} /> Edit Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
