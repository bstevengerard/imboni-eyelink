import { useEffect, useState } from "react";
import { Search, Plus, Pill, Send, X, Calendar, User, FileText, ChevronLeft, ChevronRight } from "lucide-react";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { api } from "@/lib/api";

const medications = [
  { id: "1", name: "Latanoprost Eye Drops", category: "Glaucoma", defaultDosage: "1 drop in affected eye(s) once daily at bedtime" },
  { id: "2", name: "Timolol 0.5%", category: "Glaucoma", defaultDosage: "1 drop in affected eye(s) twice daily" },
  { id: "3", name: "Brimonidine 0.2%", category: "Glaucoma", defaultDosage: "1 drop in affected eye(s) 3 times daily" },
  { id: "4", name: "Artificial Tears (Preservative-Free)", category: "Dry Eye", defaultDosage: "1-2 drops as needed, 4-6 times daily" },
  { id: "5", name: "Cyclosporine 0.05% (Restasis)", category: "Dry Eye", defaultDosage: "1 drop in each eye twice daily" },
  { id: "6", name: "Prednisolone Acetate 1%", category: "Anti-inflammatory", defaultDosage: "1-2 drops 2-4 times daily" },
  { id: "7", name: "Moxifloxacin 0.5%", category: "Antibiotic", defaultDosage: "1 drop 3 times daily for 7 days" },
  { id: "8", name: "Ketorolac 0.5%", category: "NSAID", defaultDosage: "1 drop 4 times daily" },
  { id: "9", name: "Olopatadine 0.1%", category: "Antihistamine", defaultDosage: "1-2 drops twice daily" },
  { id: "10", name: "Corrective Glasses/Lenses", category: "Vision Correction", defaultDosage: "As prescribed" },
];

const durations = [
  "7 days",
  "14 days",
  "1 month",
  "2 months",
  "3 months",
  "6 months",
  "1 year",
  "Ongoing",
];

interface PrescriptionItem {
  medicationId: string;
  medicationName: string;
  dosage: string;
  duration: string;
  quantity: string;
  refills: string;
}

interface PrescriptionFromDB {
  id: string;
  patient: string;
  patient_id: string;
  content: string;
  medication: string;
  dosage: string;
  duration: string;
  date: string;
  createdAt?: string;
  status: string;
  notes: string;
  doctor?: string;
}

interface PatientFromDB {
  id: string;
  name: string;
  phone: string;
  last_visit: string;
}

interface PrescriptionsResponse {
  data: PrescriptionFromDB[];
  total?: number;
  page?: number;
  limit?: number;
}

const recordTypes = ['All Types', 'Glaucoma', 'Dry Eye', 'Anti-inflammatory', 'Antibiotic', 'Antihistamine', 'Vision Correction'];

const getTypeColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-700';
    case 'refilled':
      return 'bg-blue-100 text-blue-700';
    case 'expired':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

const parsePrescriptionContent = (content: string) => {
  return content
    .split(';')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [medication, ...rest] = line.split(' - ');
      const details = rest.join(' - ').trim();
      const durationMatch = details.match(/for\s+(.+)$/i);
      const dosage = durationMatch ? details.replace(durationMatch[0], '').replace(/for\s*$/i, '').trim() : details;
      return {
        medication: medication.trim(),
        dosage,
        duration: durationMatch ? durationMatch[1].trim() : '',
      };
    });
};

export default function DoctorPrescriptions() {
  const [prescriptions, setPrescriptions] = useState<PrescriptionFromDB[]>([]);
  const [patients, setPatients] = useState<PatientFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNewPrescription, setShowNewPrescription] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionFromDB | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [selectedPatient, setSelectedPatient] = useState("");
  const [consultationDate, setConsultationDate] = useState(new Date().toISOString().split('T')[0]);
  const [diagnosis, setDiagnosis] = useState("");
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    { medicationId: "", medicationName: "", dosage: "", duration: "", quantity: "", refills: "0" }
  ]);
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [followUpRequired, setFollowUpRequired] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [prescriptionsRes, patientsRes] = await Promise.all([
          api.get<PrescriptionsResponse>(`/api/doctor/prescriptions?page=1&limit=20`),
          api.get<{ data: PatientFromDB[] }>(`/api/doctor/patients?page=1&limit=100`),
        ]);
        if (!cancelled) {
          if (prescriptionsRes.success && Array.isArray(prescriptionsRes.data)) {
            setPrescriptions(prescriptionsRes.data);
            setTotalPages(prescriptionsRes.total ? Math.ceil(prescriptionsRes.total / 20) : 1);
          }
          if (patientsRes.success && Array.isArray(patientsRes.data)) {
            const mappedPatients: PatientFromDB[] = patientsRes.data.map((p: any) => ({
              id: p._id || p.id || p.pt_id,
              name: p.name || 'Unknown',
              phone: p.phone || '',
              last_visit: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '',
            }));
            setPatients(mappedPatients);
          }
        }
      } catch {
        if (!cancelled) toast.error('Failed to load data');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fetchPrescriptions = async (page: number) => {
    setLoading(true);
    try {
      const res = await api.get<PrescriptionsResponse>(`/api/doctor/prescriptions?page=${page}&limit=20`);
      if (res.success && Array.isArray(res.data)) {
        setPrescriptions(res.data);
        setTotalPages(res.total ? Math.ceil(res.total / 20) : 1);
        setCurrentPage(page);
      }
    } catch {
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  const filteredPrescriptions = prescriptions.filter((rx) =>
    rx.patient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    rx.medication.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMedication = () => {
    setPrescriptionItems([
      ...prescriptionItems,
      { medicationId: "", medicationName: "", dosage: "", duration: "", quantity: "", refills: "0" }
    ]);
  };

  const handleRemoveMedication = (index: number) => {
    if (prescriptionItems.length > 1) {
      setPrescriptionItems(prescriptionItems.filter((_, i) => i !== index));
    }
  };

  const handleMedicationChange = (index: number, field: keyof PrescriptionItem, value: string) => {
    const updated = [...prescriptionItems];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'medicationId') {
      const medication = medications.find(m => m.id === value);
      if (medication) {
        updated[index].medicationName = medication.name;
        updated[index].dosage = medication.defaultDosage;
      }
    }
    
    setPrescriptionItems(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedPatient) {
      toast.error('Please select a patient');
      return;
    }
    
    setSubmitting(true);
    try {
      const content = prescriptionItems.map(item => 
        `${item.medicationName} - ${item.dosage} for ${item.duration}`
      ).join('; ');
      
      const res = await api.post('/api/doctor/prescriptions', {
        patient_id: selectedPatient,
        content,
      });
      
      if (res.success) {
        toast.success('Prescription created successfully');
        const refreshRes = await api.get<PrescriptionsResponse>(`/api/doctor/prescriptions?page=1&limit=20`);
        if (refreshRes.success && Array.isArray(refreshRes.data)) {
          setPrescriptions(refreshRes.data);
          setTotalPages(refreshRes.total ? Math.ceil(refreshRes.total / 20) : 1);
        }
        resetForm();
        setShowNewPrescription(false);
      } else {
        toast.error(res.message || 'Failed to create prescription');
      }
    } catch {
      toast.error('Failed to create prescription');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedPatient("");
    setConsultationDate(new Date().toISOString().split('T')[0]);
    setDiagnosis("");
    setPrescriptionItems([{ medicationId: "", medicationName: "", dosage: "", duration: "", quantity: "", refills: "0" }]);
    setSpecialInstructions("");
    setFollowUpRequired(false);
    setFollowUpDate("");
  };

  const handleSendPrescription = async (rx: PrescriptionFromDB) => {
    try {
      await api.post(`/api/doctor/prescriptions/${rx.id}/send`, {});
      toast.success('Prescription sent to patient');
    } catch {
      toast.error('Failed to send prescription');
    }
  };

  const selectedPatientData = patients.find(p => p.id === selectedPatient);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Prescriptions</h2>
          <p className="text-muted-foreground">Create and manage patient prescriptions</p>
        </div>
        <Button onClick={() => setShowNewPrescription(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Prescription
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{prescriptions.filter(p => p.status === 'active').length}</p>
          <p className="text-sm text-muted-foreground">Active Prescriptions</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-primary">{prescriptions.length}</p>
          <p className="text-sm text-muted-foreground">Total Prescriptions</p>
        </div>
        <div className="card-elevated p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{prescriptions.filter(p => p.status === 'expired').length}</p>
          <p className="text-sm text-muted-foreground">Expired</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <Input
          placeholder="Search prescriptions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading state */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Loading prescriptions...</p>
        </div>
      )}

      {/* Prescriptions List */}
      {!loading && filteredPrescriptions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No prescriptions found</p>
        </div>
      )}

      {!loading && filteredPrescriptions.length > 0 && (
        <div className="space-y-4">
          {filteredPrescriptions.map((rx) => (
            <div key={rx.id} className="card-elevated hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedPrescription(rx)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    rx.status === 'active' ? 'bg-green-100' : 'bg-muted'
                  }`}>
                    <Pill className={`w-6 h-6 ${rx.status === 'active' ? 'text-green-600' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{rx.patient}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(rx.status)}`}>
                        {rx.status}
                      </span>
                    </div>
                    <p className="text-sm text-primary font-medium mb-1">{rx.medication}</p>
                    {rx.notes && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {rx.notes}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {rx.date}
                      </span>
                      <span>{rx.duration}</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleSendPrescription(rx)}>
                    <Send className="w-4 h-4 mr-1" />
                    Send
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && !searchQuery && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchPrescriptions(currentPage - 1)} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => fetchPrescriptions(currentPage + 1)} disabled={currentPage === totalPages}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Prescription Details Dialog */}
      <Dialog open={!!selectedPrescription} onOpenChange={() => setSelectedPrescription(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto">
          {selectedPrescription && (
            <>
              {/* Prescription Letterhead */}
              <div className="border-b-2 border-primary/20 pb-4 mb-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src="/IMBONI.png"
                      alt="IMBONI EyeLink"
                      className="h-12 w-auto object-contain"
                    />
                    <div>
                      <h2 className="text-xl font-bold text-primary">IMBONI EyeLink</h2>
                      <p className="text-sm text-muted-foreground">Comprehensive Eye Care Services</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">Prescription</p>
                    <p className="text-muted-foreground">RX-{selectedPrescription.id.slice(-6)}</p>
                    <p className="text-muted-foreground">
                      {selectedPrescription.createdAt
                        ? new Date(selectedPrescription.createdAt).toLocaleDateString()
                        : selectedPrescription.date}
                    </p>
                  </div>
                </div>
              </div>

              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(selectedPrescription.status)}`}>
                    {selectedPrescription.status}
                  </span>
                </div>
                <DialogTitle className="text-2xl">Medication Prescription</DialogTitle>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Patient: {selectedPrescription.patient}</span>
                </div>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Patient Information */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b">
                    <h4 className="font-semibold text-foreground">Patient Information</h4>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b">
                        <td className="px-4 py-2 font-medium bg-muted/30 w-1/3">Patient Name</td>
                        <td className="px-4 py-2">{selectedPrescription.patient}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2 font-medium bg-muted/30">Doctor</td>
                        <td className="px-4 py-2">{selectedPrescription.doctor || 'Dr. Steven Byiringiro'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2 font-medium bg-muted/30">Prescribed</td>
                        <td className="px-4 py-2">
                          {selectedPrescription.createdAt
                            ? new Date(selectedPrescription.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                            : selectedPrescription.date}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Medication Instructions Table */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b">
                    <h4 className="font-semibold text-foreground flex items-center gap-2">
                      <Pill className="h-4 w-4" />
                      Medication Instructions
                    </h4>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">#</th>
                        <th className="px-4 py-2 text-left font-medium">Medication</th>
                        <th className="px-4 py-2 text-left font-medium">Dosage</th>
                        <th className="px-4 py-2 text-left font-medium">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsePrescriptionContent(selectedPrescription.content || selectedPrescription.medication).length > 0 ? (
                        parsePrescriptionContent(selectedPrescription.content || selectedPrescription.medication).map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">{index + 1}</td>
                            <td className="px-4 py-2">{item.medication}</td>
                            <td className="px-4 py-2 whitespace-pre-wrap">{item.dosage || selectedPrescription.dosage}</td>
                            <td className="px-4 py-2">{item.duration || selectedPrescription.duration || 'As directed'}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-2" colSpan={4}>
                            <p className="text-muted-foreground whitespace-pre-wrap">
                              {selectedPrescription.content || selectedPrescription.medication || 'No medication details recorded'}
                            </p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Notes */}
                {selectedPrescription.notes && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Additional Notes</h4>
                    <p className="text-muted-foreground">{selectedPrescription.notes}</p>
                  </div>
                )}

                {/* Footer with Doctor Signature */}
                <div className="border-t pt-6 mt-6">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <p className="text-sm text-muted-foreground">Doctor</p>
                      <p className="font-semibold">Dr. Steven Byiringiro</p>
                      <p className="text-sm text-muted-foreground">Ophthalmology Department</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Issued</p>
                      <p className="font-medium">
                        {selectedPrescription.createdAt
                          ? new Date(selectedPrescription.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : selectedPrescription.date}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Prescription Modal */}
      <Dialog open={showNewPrescription} onOpenChange={setShowNewPrescription}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              New Prescription
            </DialogTitle>
            <DialogDescription>
              Create a prescription based on patient consultation
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Patient Selection & Consultation Info */}
            <div className="border rounded-lg">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Patient & Consultation Details
                </h4>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patient">Select Patient *</Label>
                    <Select value={selectedPatient} onValueChange={setSelectedPatient} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose patient from your appointments" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            <div>
                              <span>{patient.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                Last visit: {patient.last_visit ? new Date(patient.last_visit).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="consultationDate">Consultation Date *</Label>
                    <Input
                      id="consultationDate"
                      type="date"
                      value={consultationDate}
                      onChange={(e) => setConsultationDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {selectedPatientData && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm font-medium">Patient Info</p>
                    <div className="grid grid-cols-1 gap-2 mt-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium text-foreground">Phone:</span> {selectedPatientData.phone || 'Not provided'}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Last Visit:</span> {selectedPatientData.last_visit ? new Date(selectedPatientData.last_visit).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="diagnosis">Diagnosis / Clinical Findings *</Label>
                  <Textarea
                    id="diagnosis"
                    placeholder="Enter diagnosis and clinical findings from the consultation..."
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    rows={3}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Medications */}
            <div className="border rounded-lg">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Pill className="w-4 h-4" />
                    Medications
                  </h4>
                  <Button type="button" variant="outline" size="sm" onClick={handleAddMedication}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Medication
                  </Button>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {prescriptionItems.map((item, index) => (
                  <div key={index} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">Medication #{index + 1}</span>
                      {prescriptionItems.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMedication(index)}
                          className="text-destructive hover:text-destructive"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Medication *</Label>
                        <Select
                          value={item.medicationId}
                          onValueChange={(value) => handleMedicationChange(index, 'medicationId', value)}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select medication" />
                          </SelectTrigger>
                          <SelectContent>
                            {medications.map((med) => (
                              <SelectItem key={med.id} value={med.id}>
                                <div>
                                  <span>{med.name}</span>
                                  <span className="text-xs text-muted-foreground ml-2">{med.category}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Duration *</Label>
                        <Select
                          value={item.duration}
                          onValueChange={(value) => handleMedicationChange(index, 'duration', value)}
                          required
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                          <SelectContent>
                            {durations.map((d) => (
                              <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Dosage Instructions *</Label>
                      <Textarea
                        placeholder="Enter specific dosage and usage instructions..."
                        value={item.dosage}
                        onChange={(e) => handleMedicationChange(index, 'dosage', e.target.value)}
                        rows={2}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input
                          placeholder="e.g., 1 bottle, 30 tablets"
                          value={item.quantity}
                          onChange={(e) => handleMedicationChange(index, 'quantity', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Refills Allowed</Label>
                        <Select
                          value={item.refills}
                          onValueChange={(value) => handleMedicationChange(index, 'refills', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">No refills</SelectItem>
                            <SelectItem value="1">1 refill</SelectItem>
                            <SelectItem value="2">2 refills</SelectItem>
                            <SelectItem value="3">3 refills</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Instructions */}
            <div className="border rounded-lg">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Additional Instructions
                </h4>
              </div>
              <div className="p-4 space-y-4">
                <div className="space-y-2">
                  <Label>Special Instructions for Patient</Label>
                  <Textarea
                    placeholder="Enter any special instructions, warnings, or lifestyle recommendations..."
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowNewPrescription(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !selectedPatient || !diagnosis || prescriptionItems.some(p => !p.medicationId)}>
                <Send className="w-4 h-4 mr-2" />
                {submitting ? 'Creating...' : 'Create Prescription'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}