import { useEffect, useState } from "react";
import { Search, Eye, FileText, MoreVertical, Mail, Phone, Calendar, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";

type Patient = {
  _id: string;
  pt_id?: string | null;
  name: string;
  email?: string;
  phone?: string | null;
  status?: string;
  createdAt?: string;
};

type PatientsResponse = {
  data: Patient[];
  total?: number;
  page?: number;
  limit?: number;
};

export default function DoctorPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);

  const fetchPatients = async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get<PatientsResponse>(`/api/doctor/patients?page=${page}&limit=20`);
      if (res.success) {
        setPatients(res.data || []);
        setTotalPages(res.total ? Math.ceil(res.total / 20) : 1);
        setTotalCount(res.total || 0);
        setCurrentPage(page);
      }
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients(1);
  }, []);

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch = 
      patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.pt_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (patient.phone && patient.phone.includes(searchQuery)) ||
      (patient.email && patient.email.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const handleViewProfile = (patient: Patient) => {
    setSelectedPatient(patient);
    setIsViewProfileOpen(true);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) fetchPatients(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) fetchPatients(currentPage + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Patients</h2>
          <p className="text-muted-foreground">Manage and view patient information</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-primary">{totalCount}</p>
          <p className="text-sm text-muted-foreground">Total Patients</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{patients.filter(p => p.status === 'active').length}</p>
          <p className="text-sm text-muted-foreground">Active</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{patients.filter(p => p.status === 'pending').length}</p>
          <p className="text-sm text-muted-foreground">Pending</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input placeholder="Search patients by name, ID, email, or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[500px] relative">
          <table className="w-full">
            <thead className="sticky top-0 z-10 bg-background border-b">
              <tr className="text-left text-sm">
                <th className="p-4 font-medium">Patient ID</th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Contact</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium">Registered</th>
                <th className="p-4 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" /></td></tr>
              ) : filteredPatients.length === 0 ? (
                <tr><td colSpan={6} className="p-4 text-muted-foreground text-center">No patients found. Use the search bar above to find patients by name.</td></tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient._id} className="border-t hover:bg-muted/30">
                    <td className="p-4"><span className="font-mono text-sm bg-muted px-2 py-1 rounded">{patient.pt_id}</span></td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">{patient.name.split(' ').map(n => n[0]).join('').toUpperCase()}</span>
                        </div>
                        <span className="font-medium">{patient.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        {patient.phone ? (
                          <div className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{patient.phone}</div>
                        ) : <span className="text-muted-foreground">—</span>}
                        {patient.email && (
                          <div className="flex items-center gap-1 text-muted-foreground mt-1"><Mail className="w-3 h-3" /><span className="text-xs">{patient.email}</span></div>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${patient.status === 'active' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>{patient.status}</span>
                    </td>
                    <td className="p-4 text-muted-foreground text-sm">
                      <div className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(patient.createdAt).toLocaleDateString()}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" title="View Profile" onClick={() => handleViewProfile(patient)}><Eye className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" title="Medical Records" onClick={() => handleViewProfile(patient)}><FileText className="w-4 h-4" /></Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="sm"><MoreVertical className="w-4 h-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleViewProfile(patient)}>View Profile</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!searchQuery && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevPage} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4" />Previous</Button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages}>Next<ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      <Dialog open={isViewProfileOpen} onOpenChange={setIsViewProfileOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader><DialogTitle>Patient Profile</DialogTitle></DialogHeader>
          {selectedPatient && (
            <div className="grid gap-6 py-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-medium text-primary">{selectedPatient.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{selectedPatient.name}</h3>
                  <p className="text-sm text-muted-foreground font-mono">{selectedPatient.pt_id}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="text-muted-foreground">Email</p><p className="font-medium">{selectedPatient.email || '—'}</p></div>
                <div><p className="text-muted-foreground">Phone</p><p className="font-medium">{selectedPatient.phone || '—'}</p></div>
                <div><p className="text-muted-foreground">Status</p><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${selectedPatient.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{selectedPatient.status}</span></div>
                <div><p className="text-muted-foreground">Registered</p><p className="font-medium">{new Date(selectedPatient.createdAt).toLocaleDateString()}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}