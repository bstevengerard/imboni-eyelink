import { useState, useEffect } from "react";
import { Search, Plus, ArrowRight, Building2, X, User, Calendar, Send, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { toast } from "sonner";

type ReferralRow = {
  id: string;
  patient: string;
  patient_id: string;
  referTo: string;
  to_facility: string;
  reason: string;
  priority: string;
  status: string;
  date: string;
};

type Patient = {
  id: string;
  name: string;
};

type PatientFromDB = {
  _id?: string;
  pt_id?: string;
  id?: string;
  name?: string;
};

type ReferralsResponse = {
  data: ReferralRow[];
  total?: number;
  page?: number;
  limit?: number;
};

const statusConfig: Record<string, { color: string }> = {
  pending: { color: "bg-yellow-100 text-yellow-700" },
  accepted: { color: "bg-green-100 text-green-700" },
  completed: { color: "bg-blue-100 text-blue-700" },
  declined: { color: "bg-red-100 text-red-700" },
};

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-red-100 text-red-700",
};

export default function DoctorReferrals() {
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewReferral, setShowNewReferral] = useState(false);
  const [selectedReferral, setSelectedReferral] = useState<ReferralRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const facilities = [
    "Kigali Specialty Eye Hospital",
    "Nyanza Referral Clinic",
    "Western Vision Hospital",
    "Southern Eye Clinic",
    "Northern Eye Center"
  ];

  const fetchReferrals = async (page: number) => {
    setLoading(true);
    try {
      const res = await api.get<ReferralsResponse>(`/api/doctor/referrals?page=${page}&limit=20`);
      if (res.success && Array.isArray(res.data)) {
        setReferrals(res.data.map(r => ({
          ...r,
          id: String(r.id ?? r._id ?? ''),
        })));
        setTotalPages(res.total ? Math.ceil(res.total / 20) : 1);
        setCurrentPage(page);
      }
    } catch {
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [referralsRes, patientsRes] = await Promise.all([
          api.get<ReferralsResponse>(`/api/doctor/referrals?page=1&limit=20`),
          api.get<{ data: PatientFromDB[] }>(`/api/doctor/patients?page=1&limit=100`),
        ]);
        if (!cancelled) {
          if (referralsRes.success && Array.isArray(referralsRes.data)) {
            setReferrals(referralsRes.data.map(r => ({
              ...r,
              id: String(r.id ?? r._id ?? ''),
            })));
            setTotalPages(referralsRes.total ? Math.ceil(referralsRes.total / 20) : 1);
          }
          if (patientsRes.success && Array.isArray(patientsRes.data)) {
            setPatients(patientsRes.data.map((p) => ({
              id: String(p._id || p.id || p.pt_id || ''),
              name: p.name || 'Unknown',
            })));
          }
        }
      } catch {
        if (!cancelled) setReferrals([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredReferrals = referrals.filter((ref) =>
    (ref.patient || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (ref.referTo || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedPatient = (e.target as any).elements.patient?.value;
    const referToFacility = (e.target as any).elements.facility?.value;
    const reason = (e.target as any).elements.reason?.value;
    const priority = (e.target as any).elements.priority?.value || "medium";
    
    if (!selectedPatient || !referToFacility || !reason) {
      toast.error('Please fill all required fields');
      return;
    }
    let submitting = true;
    try {
      const res = await api.post('/api/doctor/referrals', {
        patient_id: selectedPatient,
        to_facility: referToFacility,
        reason,
        priority,
      });
      if (res.success) {
        toast.success('Referral created successfully');
        const refreshRes = await api.get<ReferralsResponse>(`/api/doctor/referrals?page=1&limit=20`);
        if (refreshRes.success && Array.isArray(refreshRes.data)) {
          setReferrals(refreshRes.data.map(r => ({
            ...r,
            id: String(r.id ?? r._id ?? ''),
          })));
          setTotalPages(refreshRes.total ? Math.ceil(refreshRes.total / 20) : 1);
        }
        setShowNewReferral(false);
      } else {
        toast.error(res.message || 'Failed to create referral');
      }
    } catch {
      toast.error('Failed to create referral');
    } finally {
      submitting = false;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Referrals</h2>
          <p className="text-muted-foreground">Manage patient referrals to specialists</p>
        </div>
        <Button onClick={() => setShowNewReferral(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Referral
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-primary">{loading ? '—' : referrals.length}</p>
          <p className="text-sm text-muted-foreground">Total Referrals</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{referrals.filter(r => r.status === 'pending').length}</p>
          <p className="text-sm text-muted-foreground">Pending</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{referrals.filter(r => r.status === 'accepted').length}</p>
          <p className="text-sm text-muted-foreground">Accepted</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{referrals.filter(r => r.status === 'completed').length}</p>
          <p className="text-sm text-muted-foreground">Completed</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search referrals..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Referrals List */}
      {loading ? (
        <p className="text-sm text-muted-foreground py-4">Loading...</p>
      ) : filteredReferrals.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No referrals found.</p>
      ) : (
        <div className="space-y-4">
          {filteredReferrals.map((ref) => (
            <div key={ref.id} className="card-elevated p-5 flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <ArrowRight className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{ref.patient}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[ref.priority] || priorityColors.medium}`}>
                      {ref.priority}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Building2 className="w-4 h-4" />
                    <span>{ref.referTo}</span>
                  </div>
                  {ref.reason && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-2">{ref.reason}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right text-sm">
                  <p className="text-muted-foreground flex items-center gap-1 justify-end">
                    <Calendar className="h-3 w-3" />
                    {ref.date}
                  </p>
                  <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${statusConfig[ref.status]?.color || statusConfig.pending.color}`}>
                    {ref.status}
                  </span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setSelectedReferral(ref)}>
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !searchQuery && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchReferrals(currentPage - 1)} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => fetchReferrals(currentPage + 1)} disabled={currentPage === totalPages}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Referral Details Dialog */}
      <Dialog open={!!selectedReferral} onOpenChange={() => setSelectedReferral(null)}>
        <DialogContent className="sm:max-w-2xl">
          {selectedReferral && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[selectedReferral.priority] || priorityColors.medium}`}>
                    {selectedReferral.priority} priority
                  </span>
                </div>
                <DialogTitle className="text-2xl">Referral Details</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Referral Letterhead */}
                <div className="border-b pb-4 mb-4">
                  <div className="flex items-center gap-3">
                    <img src="/IMBONI.png" alt="IMBONI EyeLink" className="h-10 w-auto" />
                    <div>
                      <h3 className="font-bold text-primary">IMBONI EyeLink</h3>
                      <p className="text-xs text-muted-foreground">Referral Record</p>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b">
                    <h4 className="font-semibold text-foreground">Referral Information</h4>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b">
                        <td className="px-4 py-2 font-medium bg-muted/30 w-1/3">Patient</td>
                        <td className="px-4 py-2">{selectedReferral.patient}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2 font-medium bg-muted/30">Referred To</td>
                        <td className="px-4 py-2">{selectedReferral.referTo || selectedReferral.to_facility}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2 font-medium bg-muted/30">Reason</td>
                        <td className="px-4 py-2">{selectedReferral.reason}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2 font-medium bg-muted/30">Date</td>
                        <td className="px-4 py-2">{selectedReferral.date}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2 font-medium bg-muted/30">Status</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[selectedReferral.status]?.color || statusConfig.pending.color}`}>
                            {selectedReferral.status}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setSelectedReferral(null)}>Close</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Referral Modal */}
      <Dialog open={showNewReferral} onOpenChange={setShowNewReferral}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRight className="w-5 h-5 text-primary" />
              New Referral
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="border rounded-lg p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="patient">Select Patient *</Label>
                <Select name="patient" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose patient" />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="facility">Facility *</Label>
                <Select name="facility" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Referral *</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  placeholder="Enter reason for specialist referral..."
                  rows={3}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select name="priority" defaultValue="medium">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowNewReferral(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Send className="w-4 h-4 mr-2" />
                Create Referral
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}