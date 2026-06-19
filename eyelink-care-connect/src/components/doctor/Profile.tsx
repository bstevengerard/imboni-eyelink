import { useState, useEffect } from "react";
import { User, Mail, Phone, MapPin, Award, Calendar, Edit, Camera, Save, Shield, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { showBackendToast } from "@/lib/toast";

export default function DoctorProfile() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    specialty: "",
    licenseNumber: "",
    hospital: "",
    experience: "",
    education: "",
    languages: [],
    bio: "",
    availability: {
      monday: "",
      tuesday: "",
      wednesday: "",
      thursday: "",
      friday: "",
      saturday: "",
      sunday: "",
    },
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/doctors/profile");
        if (res.data) {
          setFormData({
            name: res.data.name || "",
            email: res.data.email || "",
            phone: res.data.phone || "",
            specialty: res.data.specialty || "",
            licenseNumber: res.data.licenseNumber || "",
            hospital: res.data.hospital || "",
            experience: res.data.experience || "",
            education: res.data.education || "",
            languages: res.data.languages || [],
            bio: res.data.bio || "",
            availability: res.data.availability || {
              monday: "", tuesday: "", wednesday: "", thursday: "", friday: "", saturday: "", sunday: ""
            },
          });
        }
      } catch (e) {
        // Profile may not exist yet
      }
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await api.put("/api/doctors/profile", formData);
      showBackendToast(res);
      if (res.success) {
        setIsEditing(false);
      }
    } catch (e: any) {
      showBackendToast({ success: false, message: e.message });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Profile</h2>
          <p className="text-muted-foreground">Manage your professional information</p>
        </div>
        {isEditing ? (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
<Button onClick={handleSave} disabled={loading}>
               {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
               Save Changes
             </Button>
          </div>
        ) : (
          <Button onClick={() => setIsEditing(true)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="card-elevated p-6 text-center">
          <div className="relative w-32 h-32 mx-auto mb-4">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-4xl font-bold text-white">{formData.name.split(' ').map(n => n[0]).join('').slice(0,2) || 'DR'}</span>
            </div>
            {isEditing && (
              <button className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
                <Camera className="w-5 h-5" />
              </button>
            )}
          </div>
          <h3 className="text-xl font-bold">{formData.name}</h3>
          <p className="text-primary font-medium">{formData.specialty}</p>
          <p className="text-sm text-muted-foreground mt-1">{formData.hospital}</p>
          
          <div className="mt-6 pt-6 border-t space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{formData.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span>{formData.phone}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Award className="w-4 h-4 text-muted-foreground" />
              <span>{formData.experience} experience</span>
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Personal Information */}
          <div className="card-elevated p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Professional Information
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                {isEditing ? (
                  <Input 
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                ) : (
                  <p className="font-medium mt-1">{formData.name}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Specialty</label>
                {isEditing ? (
                  <Input 
                    value={formData.specialty}
                    onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  />
                ) : (
                  <p className="font-medium mt-1">{formData.specialty}</p>
                )}
              </div>
<div>
                 <label className="text-sm font-medium text-muted-foreground">License Number</label>
                 {isEditing ? (
                   <Input 
                     value={formData.licenseNumber}
                     onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                   />
                 ) : (
                   <p className="font-medium mt-1">{formData.licenseNumber || "Not specified"}</p>
                 )}
               </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Hospital</label>
                {isEditing ? (
                  <Input 
                    value={formData.hospital}
                    onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                  />
                ) : (
                  <p className="font-medium mt-1">{formData.hospital}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Education</label>
                {isEditing ? (
                  <Textarea 
                    value={formData.education}
                    onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                    rows={2}
                  />
                ) : (
                  <p className="font-medium mt-1">{formData.education}</p>
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-muted-foreground">Bio</label>
                {isEditing ? (
                  <Textarea 
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={3}
                  />
                ) : (
                  <p className="text-muted-foreground mt-1">{formData.bio}</p>
                )}
              </div>
            </div>
          </div>

          {/* Availability */}
          <div className="card-elevated p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Availability Schedule
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {Object.entries(formData.availability).map(([day, hours]) => (
                <div key={day} className="flex justify-between p-3 rounded-lg bg-muted/50">
                  <span className="capitalize font-medium">{day}</span>
                  {isEditing ? (
                    <Input 
                      value={hours}
                      onChange={(e) => setFormData({ ...formData, availability: { ...formData.availability, [day]: e.target.value } })}
                      placeholder="e.g., 8:00 AM - 5:00 PM"
                    />
                  ) : (
                    <span className="text-muted-foreground">{hours || "Not set"}</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Security */}
          <div className="card-elevated p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Security
            </h3>
            <div className="space-y-4">
              <Button variant="outline">Change Password</Button>
              <Button variant="outline">Enable Two-Factor Authentication</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
