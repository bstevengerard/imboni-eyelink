import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  FileText,
  Search,
  Calendar,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  Microscope,
  User,
  Plus,
  X,
  Download,
  Eye,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { showBackendToast } from '@/lib/toast';

type PatientFromDB = {
  id: string;
  name: string;
  phone: string;
  last_visit: string;
};

type MedicationRow = {
  medication: string;
  dosage?: string;
  duration?: string;
};

type RecordRow = {
  id: string;
  patient: string;
  patientId: string;
  recordType: string;
  date: string;
  title: string;
  summary?: string | null;
  findings?: unknown;
  recommendations?: string | null;
  diagnosis?: string;
  treatmentPlan?: string;
  medications?: MedicationRow[];
  visualAcuity?: { right?: string; left?: string; both?: string };
  intraocularPressure?: { right?: string; left?: string };
};

const recordTypes = ['All Types', 'Examination Report', 'Prescription', 'Screening Report', 'Consultation Notes', 'Surgery Report', 'Lab Results'];
const createRecordTypes = recordTypes.filter((type) => type !== 'All Types');

const getTypeColor = (type: string) => {
  switch (type) {
    case 'Examination Report':
      return 'bg-primary/10 text-primary';
    case 'Prescription':
      return 'bg-secondary/10 text-secondary';
    case 'Screening Report':
      return 'bg-accent/10 text-accent';
    case 'Surgery Report':
      return 'bg-green-100 text-green-700';
    case 'Lab Results':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

type RecordsResponse = {
  data: RecordRow[];
  total?: number;
  page?: number;
  limit?: number;
};

export default function DoctorRecords() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<RecordRow | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [patients, setPatients] = useState<PatientFromDB[]>([]);
  const [showNewRecord, setShowNewRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [selectedPatient, setSelectedPatient] = useState('');
  const [recordType, setRecordType] = useState('Examination Report');
  const [recordTitle, setRecordTitle] = useState('');
  const [recordDate, setRecordDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [medicationText, setMedicationText] = useState('');
  const [visualAcuity, setVisualAcuity] = useState({ right: '', left: '', both: '' });
  const [intraocularPressure, setIntraocularPressure] = useState({ right: '', left: '' });

  const [existingPrescriptionMedications, setExistingPrescriptionMedications] = useState<MedicationRow[]>([]);
  

  const [prescriptionsLoading, setPrescriptionsLoading] = useState(false);

  const prescriptionParseFromContent = useCallback((content: string): MedicationRow[] => {
    // Content format from backend: "Medication - dosage for duration; Medication2 - dosage for duration"
    return String(content || '')
      .split(';')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [medication, ...rest] = line.split(' - ');
        const details = rest.join(' - ').trim();

        const durationMatch = details.match(/for\s+(.+)$/i);
        const dosage = durationMatch
          ? details.replace(durationMatch[0], '').replace(/for\s*$/i, '').trim()
          : details;

        return {
          medication: String(medication || '').trim(),
          dosage: dosage || '',
          duration: durationMatch ? durationMatch[1].trim() : '',
        };
      })
      .filter((x) => x.medication);
  }, []);

  const fetchRecords = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await api.get<RecordsResponse>(`/api/doctor/records?page=${page}&limit=20`);
      if (res.success) {
        const anyRes = res as any;

        const rawRecords: any[] = Array.isArray(anyRes.data) ? anyRes.data : [];
        const mapped: RecordRow[] = rawRecords.map((r: any) => ({
          id: String(r.id ?? r._id ?? ''),
          patient: r.patient?.name ?? r.patient ?? 'Unknown',
          patientId: r.patient_id ?? '',
          recordType: r.recordType ?? r.type ?? 'Record',
          date: r.date ? new Date(r.date).toISOString() : r.record_date ? new Date(r.record_date).toISOString() : '',
          title: r.title ?? '',
          summary: r.summary ?? null,
          findings: r.findings,
          recommendations: r.recommendations ?? null,
          diagnosis: r.diagnosis ?? r.findings?.diagnosis ?? '',
          treatmentPlan: r.treatmentPlan ?? '',
          medications: Array.isArray(r.medications) ? r.medications : [],
          visualAcuity: r.visualAcuity ?? r.findings?.visual_acuity ?? null,
          intraocularPressure: r.intraocularPressure ?? r.findings?.intraocular_pressure ?? null,
        }));

        setRecords(mapped);

        const totalCount = typeof anyRes.total === 'number' ? anyRes.total : undefined;
        setTotalPages(totalCount ? Math.ceil(totalCount / 20) : 1);

        setCurrentPage(page);
      } else {
        showBackendToast({
          type: 'error',
          message: res.message ?? 'Failed to load medical records',
        });
      }
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      const res = await api.get<{ data: PatientFromDB[] }>('/api/doctor/patients?page=1&limit=100');
      if (res.success && Array.isArray(res.data)) {
        setPatients(res.data.map((p: any) => ({
          id: p._id || p.id || p.pt_id,
          name: p.name || 'Unknown',
          phone: p.phone || '',
          last_visit: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '',
        })));
      }
    } catch {
      setPatients([]);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchRecords(1), fetchPatients()]);
  }, [fetchPatients, fetchRecords]);

  useEffect(() => {
    // When doctor opens "New Medical Record", pre-fill medications from prescription on the same date (if any)
    if (!showNewRecord) return;

    if (!selectedPatient || !recordDate) {
      setExistingPrescriptionMedications([]);
      return;
    }

    type RxByDateItem = { id: string; content: string; createdAt: string };

    let cancelled = false;

    (async () => {
      setPrescriptionsLoading(true);
      try {
        const res = await api.get<Array<RxByDateItem>>(
          '/api/doctor/prescriptions/by-date',
          { patient_id: selectedPatient, date: recordDate }
        );

        if (cancelled) return;

        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          // backend sorts by createdAt desc, so first item is the latest for the day
          const latest = res.data[0];
          const rows = latest?.content ? prescriptionParseFromContent(latest.content) : [];
          setExistingPrescriptionMedications(rows);
          return;
        }

        setExistingPrescriptionMedications([]);
      } catch {
        if (!cancelled) setExistingPrescriptionMedications([]);
      } finally {
        if (!cancelled) setPrescriptionsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showNewRecord, selectedPatient, recordDate, prescriptionParseFromContent]);

  const getFindingsList = (r: RecordRow): string[] => {
    if (Array.isArray(r.findings)) return r.findings as string[];
    if (typeof r.findings === 'object' && r.findings !== null) {
      const obj = r.findings as Record<string, unknown>;
      const list: string[] = [];
      if (typeof obj.visual_acuity === 'string') list.push(`Visual Acuity: ${obj.visual_acuity}`);
      if (typeof obj.intraocular_pressure === 'string') list.push(`Intraocular Pressure: ${obj.intraocular_pressure}`);
      if (obj.remark) list.push(`Remark: ${obj.remark}`);
      return list;
    }
    return [];
  };

  const getMedicationRows = (r: RecordRow): MedicationRow[] => {
    if (Array.isArray(r.medications)) return r.medications;
    return [];
  };

  const formatMedicationValue = (value?: string) => {
    const text = String(value || '').trim();
    if (!text || text.toLowerCase() === 'as directed') return 'N/A';
    return text;
  };

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      (record.patient || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.diagnosis || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All Types' || (record.recordType || '').includes(typeFilter);
    return matchesSearch && matchesType;
  });

  const resetRecordForm = () => {
    setSelectedPatient('');
    setRecordType('Examination Report');
    setRecordTitle('');
    setRecordDate(new Date().toISOString().split('T')[0]);
    setSummary('');
    setDiagnosis('');
    setTreatmentPlan('');
    setRecommendations('');
    setMedicationText('');
    setVisualAcuity({ right: '', left: '', both: '' });
    setIntraocularPressure({ right: '', left: '' });
  };

  const parseMedicationText = (text: string): MedicationRow[] => {
    return text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split('|').map((part) => part.trim());
        if (parts.length >= 2) {
          return {
            medication: parts[0] || '',
            dosage: parts[1] || '',
            duration: parts[2] || '',
          };
        }

        const tokens = line.split(/\s+/).filter(Boolean);
        if (tokens.length < 3) {
          return { medication: line, dosage: '', duration: '' };
        }

        const durationIndex = (() => {
          for (let index = tokens.length - 1; index > 0; index -= 1) {
            if (/times|daily|day|days|week|weeks|month|months|nightly|bedtime|morning|afternoon|evening|needed|prn|as|qd|bid|tid|qid/i.test(tokens[index])) {
              return index;
            }
          }
          return -1;
        })();

        if (durationIndex > 0) {
          const dosageTokens = tokens.slice(0, durationIndex);
          let dosageStart = -1;
          for (let index = dosageTokens.length - 1; index >= 0; index -= 1) {
            if (/(\d|drop|drops|tablet|tablets|tab|tabs|ml|mg|%|g|cc|l\b)/i.test(dosageTokens[index])) {
              dosageStart = index;
              break;
            }
          }
          if (dosageStart >= 0) {
            return {
              medication: tokens.slice(0, dosageStart).join(' '),
              dosage: dosageTokens.slice(dosageStart).join(' '),
              duration: tokens.slice(durationIndex).join(' '),
            };
          }

          return {
            medication: tokens.slice(0, -1).join(' '),
            dosage: tokens[tokens.length - 1] || '',
            duration: tokens.slice(durationIndex).join(' '),
          };
        }

        let dosageStart = -1;
        for (let index = 0; index < tokens.length; index += 1) {
          if (/(\d|drop|drops|tablet|tablets|tab|tabs|ml|mg|%|g|cc|l\b)/i.test(tokens[index])) {
            dosageStart = index;
            break;
          }
        }
        if (dosageStart > 0) {
          return {
            medication: tokens.slice(0, dosageStart).join(' '),
            dosage: tokens.slice(dosageStart).join(' '),
            duration: '',
          };
        }

        return { medication: line, dosage: '', duration: '' };
      })
      .filter((item) => item.medication);
  };

  const getDisplayMedicationRows = (r: RecordRow): MedicationRow[] => {
    return getMedicationRows(r).map((med) => {
      if (med.dosage || med.duration) return med;
      const parsed = parseMedicationText(med.medication || '');
      return parsed[0] || med;
    });
  };

  const handleCreateRecord = async (e: FormEvent) => {
    e.preventDefault();

    if (!selectedPatient || !recordTitle || !recordDate) {
      showBackendToast({ success: false, message: 'Patient, title and record date are required' });
      return;
    }

    setSubmitting(true);
    try {
      const findings: Record<string, unknown> = {};
      if (diagnosis.trim()) findings.diagnosis = diagnosis.trim();

      const visualAcuityValue = {
        right: visualAcuity.right.trim() || undefined,
        left: visualAcuity.left.trim() || undefined,
        both: visualAcuity.both.trim() || undefined,
      };
      if (Object.values(visualAcuityValue).some(Boolean)) findings.visual_acuity = visualAcuityValue;

      const intraocularPressureValue = {
        right: intraocularPressure.right.trim() || undefined,
        left: intraocularPressure.left.trim() || undefined,
      };
      if (Object.values(intraocularPressureValue).some(Boolean)) findings.intraocular_pressure = intraocularPressureValue;

      const effectiveMedications = medicationText.trim() ? parseMedicationText(medicationText) : existingPrescriptionMedications;

      const res = await api.post('/api/doctor/records', {
        patient_id: selectedPatient,
        title: recordTitle.trim(),
        type: recordType,
        record_date: new Date(`${recordDate}T00:00:00`).toISOString(),
        summary: summary.trim() || null,
        findings: Object.keys(findings).length > 0 ? findings : null,
        recommendations: recommendations.trim() || null,
        diagnosis: diagnosis.trim() || null,
        treatmentPlan: treatmentPlan.trim() || null,
        medications: effectiveMedications,
        visualAcuity: Object.values(visualAcuityValue).some(Boolean) ? visualAcuityValue : null,
        intraocularPressure: Object.values(intraocularPressureValue).some(Boolean) ? intraocularPressureValue : null,
      });

      showBackendToast(res);
      resetRecordForm();
      setShowNewRecord(false);
      await fetchRecords(1);
    } catch {
      showBackendToast({ success: false, message: 'Failed to create medical record' });
    } finally {
      setSubmitting(false);
    }
  };

  const selectedPatientData = patients.find((p) => p.id === selectedPatient);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Medical Records</h2>
          <p className="text-muted-foreground">Create and manage eye examination records</p>
        </div>
        <Button onClick={() => setShowNewRecord(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Medical Record
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search records or patients..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            {recordTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">Loading records...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No records found</h3>
          <p className="text-muted-foreground">
            {searchTerm || typeFilter !== 'All Types'
              ? 'Try adjusting your search or filters'
              : "You haven't created any medical records yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <div
              key={record.id}
              className="card-elevated hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedRecord(record)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {record.recordType === 'Surgery Report' ? (
                      <Microscope className="h-6 w-6 text-primary" />
                    ) : (
                      <FileText className="h-6 w-6 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{record.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(record.recordType)}`}>
                        {record.recordType}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">{record.patient}</p>
                    {record.summary && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {record.summary}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(record.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {record.diagnosis && (
                        <span className="flex items-center gap-1">
                          <ClipboardList className="h-4 w-4" />
                          {record.diagnosis}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!searchTerm && typeFilter === 'All Types' && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchRecords(currentPage - 1)} disabled={currentPage === 1}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => fetchRecords(currentPage + 1)} disabled={currentPage === totalPages}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto print:max-w-none print:w-full">
          {selectedRecord && (
            <>
              <div className="border-b-2 border-primary/20 pb-4 mb-6 print:mb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <img src="/IMBONI.png" alt="IMBONI EyeLink" className="h-12 w-auto object-contain" />
                    <div>
                      <h2 className="text-xl font-bold text-primary">IMBONI EyeLink</h2>
                      <p className="text-sm text-muted-foreground">Comprehensive Eye Care Services</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold">Medical Record</p>
                    <p className="text-muted-foreground">MR-{selectedRecord.id.slice(-6)}</p>
                    <p className="text-muted-foreground flex items-center gap-1 justify-end">
                      <Calendar className="h-3 w-3" />
                      {new Date(selectedRecord.date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(selectedRecord.recordType)}`}>
                    {selectedRecord.recordType}
                  </span>
                </div>
                <DialogTitle className="text-2xl">{selectedRecord.title}</DialogTitle>
              </DialogHeader>

              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{selectedRecord.patient}</span>
              </div>

              <div className="space-y-6 py-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b">
                    <h4 className="font-semibold text-foreground">Patient Information</h4>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b">
                        <td className="px-4 py-2 font-medium bg-muted/30 w-1/3">Patient Name</td>
                        <td className="px-4 py-2">{selectedRecord.patient}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2 font-medium bg-muted/30">Record Type</td>
                        <td className="px-4 py-2">{selectedRecord.recordType}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2 font-medium bg-muted/30">Record Date</td>
                        <td className="px-4 py-2">
                          {new Date(selectedRecord.date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {selectedRecord.summary && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2 border-b">
                      <h4 className="font-semibold text-foreground flex items-center gap-2">
                        <ClipboardList className="h-4 w-4" />
                        Clinical Summary
                      </h4>
                    </div>
                    <div className="p-4">
                      <p className="text-muted-foreground">{selectedRecord.summary}</p>
                    </div>
                  </div>
                )}

                {(getFindingsList(selectedRecord).length > 0 || selectedRecord.visualAcuity || selectedRecord.intraocularPressure) && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2 border-b">
                      <h4 className="font-semibold text-foreground">Eye Measurements</h4>
                    </div>
                    <table className="w-full text-sm">
                      <tbody>
                        {selectedRecord.visualAcuity && (
                          <tr className="border-b">
                            <td className="px-4 py-2 font-medium bg-muted/30 w-1/3">Visual Acuity</td>
                            <td className="px-4 py-2">
                              {selectedRecord.visualAcuity.both || `Right: ${selectedRecord.visualAcuity.right || 'N/A'} | Left: ${selectedRecord.visualAcuity.left || 'N/A'}`}
                            </td>
                          </tr>
                        )}
                        {selectedRecord.intraocularPressure && (
                          <tr className="border-b">
                            <td className="px-4 py-2 font-medium bg-muted/30">Intraocular Pressure</td>
                            <td className="px-4 py-2">
                              Right: {selectedRecord.intraocularPressure.right || 'N/A'} | Left: {selectedRecord.intraocularPressure.left || 'N/A'}
                            </td>
                          </tr>
                        )}
                        {getFindingsList(selectedRecord).map((finding, index) => (
                          <tr key={index} className="border-b">
                            <td className="px-4 py-2 font-medium bg-muted/30">{finding.startsWith('Remark:') ? 'Remark' : finding.split(':')[0]}</td>
                            <td className="px-4 py-2">{finding.replace(/^[^:]+:\s*/, '')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedRecord.diagnosis && (
                  <div className="border-l-4 border-blue-500 bg-blue-50/50 p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">Diagnosis</h4>
                    <p className="text-blue-800">{selectedRecord.diagnosis}</p>
                  </div>
                )}

                {selectedRecord.treatmentPlan && (
                  <div className="border-l-4 border-green-500 bg-green-50/50 p-4">
                    <h4 className="font-semibold text-green-900 mb-2">Treatment Plan</h4>
                    <p className="text-green-800">{selectedRecord.treatmentPlan}</p>
                  </div>
                )}

                {getMedicationRows(selectedRecord).length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2 border-b">
                      <h4 className="font-semibold text-foreground">Prescribed Medications</h4>
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
                        {getMedicationRows(selectedRecord).map((med, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">{index + 1}</td>
                            <td className="px-4 py-2">{med.medication || 'N/A'}</td>
                            <td className="px-4 py-2 whitespace-pre-wrap">{formatMedicationValue(med.dosage)}</td>
                            <td className="px-4 py-2 whitespace-pre-wrap">{formatMedicationValue(med.duration)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedRecord.recommendations && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Recommendations</h4>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      {selectedRecord.recommendations.split('. ').filter(Boolean).map((rec, i) => (
                        <li key={i}>{rec}{rec.endsWith('.') ? '' : '.'}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-4 pt-4 border-t border-border">
                  <Button
                    className="flex-1 gap-2"
                    onClick={async () => {
                      try {
                        const token = api.getToken();
                        const url = `${api.BASE_URL}/api/doctor/records/${selectedRecord.id}/export`;
                        const res = await fetch(url, {
                          method: 'GET',
                          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                        });
                        if (!res.ok) throw new Error(`HTTP ${res.status}`);
                        const html = await res.text();
                        const w = window.open('', '_blank');
                        if (!w) throw new Error('Popup blocked');
                        w.document.open();
                        w.document.write(html);
                        w.document.close();
                      } catch {
                        showBackendToast({ type: 'error', message: 'Failed to export medical record' });
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                  <Button variant="outline" className="flex-1 gap-2"><Eye className="h-4 w-4" />Share with Patient</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showNewRecord} onOpenChange={(open) => {
        setShowNewRecord(open);
        if (!open) resetRecordForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              New Medical Record
            </DialogTitle>
            <DialogDescription>Create a medical record for a patient consultation.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRecord} className="space-y-6">
            <div className="border rounded-lg">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Patient & Record Details
                </h4>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recordPatient">Select Patient *</Label>
                    <Select value={selectedPatient} onValueChange={setSelectedPatient} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {patients.map((patient) => (
                          <SelectItem key={patient.id} value={patient.id}>
                            <div>
                              <span>{patient.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">
                                {patient.phone || 'No phone'}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recordType">Record Type *</Label>
                    <Select value={recordType} onValueChange={setRecordType} required>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {createRecordTypes.map((type) => (
                          <SelectItem key={type} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="recordTitle">Title *</Label>
                    <Input
                      id="recordTitle"
                      placeholder="e.g., Eye examination report"
                      value={recordTitle}
                      onChange={(e) => setRecordTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="recordDate">Record Date *</Label>
                    <Input
                      id="recordDate"
                      type="date"
                      value={recordDate}
                      onChange={(e) => setRecordDate(e.target.value)}
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
                        <span className="font-medium text-foreground">Last Visit:</span> {selectedPatientData.last_visit || 'N/A'}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="summary">Clinical Summary</Label>
                  <Textarea
                    id="summary"
                    placeholder="Enter clinical summary..."
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="border rounded-lg">
                <div className="bg-muted/50 px-4 py-2 border-b">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" />
                    Diagnosis & Treatment
                  </h4>
                </div>
                <div className="p-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="diagnosis">Diagnosis</Label>
                    <Textarea
                      id="diagnosis"
                      placeholder="Enter diagnosis..."
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="treatmentPlan">Treatment Plan</Label>
                    <Textarea
                      id="treatmentPlan"
                      placeholder="Enter treatment plan..."
                      value={treatmentPlan}
                      onChange={(e) => setTreatmentPlan(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="border rounded-lg">
                <div className="bg-muted/50 px-4 py-2 border-b">
                  <h4 className="font-semibold text-foreground flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Eye Measurements
                  </h4>
                </div>
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-2">
                      <Label>Right VA</Label>
                      <Input placeholder="Right" value={visualAcuity.right} onChange={(e) => setVisualAcuity({ ...visualAcuity, right: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Left VA</Label>
                      <Input placeholder="Left" value={visualAcuity.left} onChange={(e) => setVisualAcuity({ ...visualAcuity, left: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Both VA</Label>
                      <Input placeholder="Both" value={visualAcuity.both} onChange={(e) => setVisualAcuity({ ...visualAcuity, both: e.target.value })} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Right IOP</Label>
                      <Input placeholder="Right" value={intraocularPressure.right} onChange={(e) => setIntraocularPressure({ ...intraocularPressure, right: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Left IOP</Label>
                      <Input placeholder="Left" value={intraocularPressure.left} onChange={(e) => setIntraocularPressure({ ...intraocularPressure, left: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="border rounded-lg">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Medications
                </h4>
              </div>
              <div className="p-4 space-y-2">
                {prescriptionsLoading && !medicationText && (
                  <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-md mb-2">
                    <p className="text-sm text-blue-700 font-medium">Loading prescribed medications for this date...</p>
                  </div>
                )}

                {existingPrescriptionMedications.length > 0 && !medicationText && !prescriptionsLoading && (
                  <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-md mb-2">
                    <p className="text-sm text-blue-700 font-medium mb-1">Prescribed Medications from prescription on this date:</p>
                    <ul className="text-sm text-blue-600 space-y-1">
                      {existingPrescriptionMedications.map((med, idx) => (
                        <li key={idx}>
                          {med.medication}
                          {med.dosage ? ` | ${med.dosage}` : ''}
                          {med.duration ? ` | ${med.duration}` : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <Label htmlFor="medications">Medication | Dosage | Duration</Label>
                <Textarea
                  id="medications"
                  placeholder="Latanoprost Eye Drops | 1 drop nightly | 1 month"
                  value={medicationText}
                  onChange={(e) => setMedicationText(e.target.value)}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  {existingPrescriptionMedications.length > 0 && !medicationText
                    ? "Medications from prescription will be used. Enter new medications above to override."
                    : "Use either \"Medication | Dosage | Duration\" or natural text like \"Latanodrops 3.8l 4times\". One medication per line."}
                </p>
              </div>
            </div>

            <div className="border rounded-lg">
              <div className="bg-muted/50 px-4 py-2 border-b">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Recommendations
                </h4>
              </div>
              <div className="p-4 space-y-2">
                <Label htmlFor="recommendations">Recommendations</Label>
                <Textarea
                  id="recommendations"
                  placeholder="Enter follow-up advice and recommendations..."
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setShowNewRecord(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting || !selectedPatient || !recordTitle || !recordDate}>
                {submitting ? 'Creating...' : 'Create Medical Record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
