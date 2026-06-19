import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { 
  MapPin, Phone, Clock, Star, Search, Filter, 
  Building2, CheckCircle, Navigation, Building 
} from "lucide-react";
import heroImage from "@/assets/hero-eye-care.jpg";
import mobileClinicImage from "@/assets/mobile-clinic.jpg";
import { api } from "@/lib/api";

type Hospital = {
  _id: string;
  name: string;
  region?: string;
  district?: string;
  address?: string;
  phone?: string;
  hours?: string;
  rating: number;
  services: string[];
  featured: boolean;
  photo_url?: string;
};

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("All Districts");

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        const res = await api.get<Hospital[]>('/api/hospitals');
        if (res.success && Array.isArray(res.data)) {
          setHospitals(res.data);
        }
      } catch (error) {
        console.error('Failed to fetch hospitals:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchHospitals();
  }, []);

  // Get unique districts from hospitals
  const districts = ["All Districts", ...new Set(hospitals.filter(h => h.district).map(h => h.district as string))];

  const filteredHospitals = hospitals.filter((hospital) => {
    const matchesSearch = hospital.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (hospital.region?.toLowerCase().includes(searchQuery.toLowerCase()) || false);
    const matchesDistrict = selectedDistrict === "All Districts" || hospital.district === selectedDistrict;
    return matchesSearch && matchesDistrict;
  });

  const featuredHospitals = filteredHospitals.filter(h => h.featured);
  const otherHospitals = filteredHospitals.filter(h => !h.featured);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative py-20 lg:py-28">
        <div className="absolute inset-0 z-0">
          <img 
            src={mobileClinicImage} 
            alt="Mobile Eye Clinic" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-accent/90" />
        </div>
        <div className="container relative z-10 text-white">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              Find Eye Care Near You
            </h1>
            <p className="text-xl text-white/90 mb-8">
              Explore our network of partner hospitals and eye care centers across Rwanda.
            </p>
            
            {/* Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search by hospital name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-14 bg-white text-foreground"
                />
              </div>
              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="h-14 px-4 rounded-md bg-white text-foreground border-0"
              >
                {districts.map((district) => (
                  <option key={district} value={district}>{district}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Results Count */}
      <section className="py-8 border-b">
        <div className="container">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredHospitals.length}</span> hospitals
            </p>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter by services</span>
            </div>
          </div>
        </div>
      </section>

      {loading ? (
        <section className="py-12">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card-elevated p-6 animate-pulse">
                  <div className="h-6 bg-muted rounded mb-2 w-2/3" />
                  <div className="h-4 bg-muted rounded mb-4 w-1/2" />
                  <div className="h-4 bg-muted rounded mb-2 w-full" />
                  <div className="h-4 bg-muted rounded mb-4 w-3/4" />
                  <div className="flex gap-2">
                    <div className="h-6 bg-muted rounded w-20" />
                    <div className="h-6 bg-muted rounded w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : filteredHospitals.length === 0 ? (
        <section className="py-12">
          <div className="container text-center">
            <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Hospitals Found</h3>
            <p className="text-muted-foreground">No hospitals match your search criteria.</p>
          </div>
        </section>
      ) : (
        <>
          {/* Featured Hospitals */}
          {featuredHospitals.length > 0 && (
            <section className="py-12">
              <div className="container">
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                  <Star className="w-6 h-6 text-secondary" />
                  Featured Partners
                </h2>
                <div className="grid md:grid-cols-2 gap-6">
                  {featuredHospitals.map((hospital) => (
                    <div key={hospital._id} className="card-elevated p-6 border-2 border-secondary/20">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Building2 className="w-5 h-5 text-primary" />
                            <h3 className="text-xl font-semibold">{hospital.name}</h3>
                          </div>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {hospital.address || hospital.district || "No address"}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 bg-secondary/10 px-2 py-1 rounded-full">
                          <Star className="w-4 h-4 text-secondary fill-secondary" />
                          <span className="font-medium text-sm">{hospital.rating}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          <span>{hospital.phone || "No phone"}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span>{hospital.hours || "No hours"}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-4">
                        {hospital.services.map((service) => (
                          <span key={service} className="text-xs bg-muted px-2 py-1 rounded-full">
                            {service}
                          </span>
                        ))}
                      </div>
                      
                      <div className="flex gap-3">
                        <Button className="flex-1">
                          <Navigation className="w-4 h-4 mr-2" />
                          Get Directions
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Phone className="w-4 h-4 mr-2" />
                          Call
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* All Hospitals */}
          <section className="py-12 bg-muted/30">
            <div className="container">
              <h2 className="text-2xl font-bold mb-6">All Partner Hospitals</h2>
              <div className="grid gap-4">
                {(otherHospitals.length > 0 ? otherHospitals : featuredHospitals.length > 0 ? [] : filteredHospitals).map((hospital) => (
                  <div key={hospital._id} className="card-elevated p-6 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Building2 className="w-5 h-5 text-primary" />
                        <h3 className="text-lg font-semibold">{hospital.name}</h3>
                        {hospital.featured && (
                          <span className="text-xs bg-secondary/10 text-secondary px-2 py-0.5 rounded-full">
                            Featured
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 text-secondary fill-secondary" />
                          <span>{hospital.rating}</span>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-sm flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {hospital.address || hospital.district || "No address"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {hospital.services.slice(0, 2).map((service) => (
                        <span key={service} className="text-xs bg-muted px-2 py-1 rounded-full">
                          {service}
                        </span>
                      ))}
                      {hospital.services.length > 2 && (
                        <span className="text-xs bg-muted px-2 py-1 rounded-full">
                          +{hospital.services.length - 2} more
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Phone className="w-4 h-4" />
                      </Button>
                      <Button size="sm">
                        <Navigation className="w-4 h-4 mr-1" />
                        Directions
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}

      {/* CTA */}
      <section className="py-16 lg:py-24 relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={heroImage} 
            alt="Eye Care" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/95" />
        </div>
        <div className="container relative z-10 text-center">
          <h2 className="text-3xl font-bold mb-4">Can't Find a Hospital Near You?</h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Our mobile clinics travel to communities across Rwanda. Check our schedule or 
            request a mobile clinic visit to your area.
          </p>
          <Button asChild size="lg">
            <a href="/#mobile-clinics">View Mobile Clinic Schedule</a>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
}
