import { useEffect, useState } from 'react';
import {
  FileText, Download, Search, Calendar, User, ChevronRight, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { showBackendToast } from '@/lib/toast';
import { useAuth } from '@/contexts/AuthContext';

import { api } from '@/lib/api';

type MedicationRow = {
  medication: string;
  dosage?: string;
  duration?: string;
};

type RecordRow = {
  id: string;
  title: string;
  recordType: string;
  date: string;
  summary?: string | null;
  findings?: unknown;
  recommendations?: string | null;
  patient?: string;
  doctor?: string;
  diagnosis?: string;
  treatmentPlan?: string;
  medications?: MedicationRow[];
  visualAcuity?: { right?: string; left?: string; both?: string } | string | null;
  intraocularPressure?: { right?: string; left?: string } | string | null;
};

const recordTypes = ['All Types', 'Examination Report', 'Prescription', 'Screening Report', 'Consultation Notes', 'Surgery Report', 'Lab Results'];

const formatRecordDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const formatShortRecordDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatMedicationValue = (value?: string) => {
  const text = String(value || '').trim();
  if (!text || text.toLowerCase() === 'as directed') return 'N/A';
  return text;
};

export default function PatientRecords() {
  const { user } = useAuth();
  const patientName = user?.name || 'Unknown';
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<RecordRow | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<any[]>('/api/patient/records');
        if (!res.success) {
          showBackendToast({
            type: (res as any)?.type ?? 'error',
            message: (res as any)?.message ?? (res as any)?.error ?? 'Failed to load medical records',
          });
        }

        if (cancelled) return;
        if (res.success && Array.isArray(res.data)) {
          const mapped: RecordRow[] = res.data.map((r: any) => ({
            id: String(r._id ?? r.id),
            title: r.title ?? '',
            recordType: r.type ?? 'Record',
            date: r.record_date ? new Date(r.record_date).toISOString() : r.date || '',
            summary: r.summary ?? null,
            findings: r.findings,
            recommendations: r.recommendations ?? null,
            doctor: r.doctor_id?.name ?? '',
            diagnosis: r.diagnosis ?? r.findings?.diagnosis ?? '',
            treatmentPlan: r.treatmentPlan ?? '',
            medications: Array.isArray(r.medications) ? r.medications : [],
            visualAcuity: r.visualAcuity ?? r.findings?.visual_acuity ?? null,
            intraocularPressure: r.intraocularPressure ?? r.findings?.intraocular_pressure ?? null,
          }));
          setRecords(mapped);
        } else {
          setRecords([]);
        }
      } catch {
        if (!cancelled) setRecords([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRecords = records.filter((record) => {
    const matchesSearch =
      (record.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.doctor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (record.diagnosis || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All Types' || (record.recordType || '').includes(typeFilter);
    return matchesSearch && matchesType;
  });

  const findingsList = (r: RecordRow): string[] => {
    if (Array.isArray(r.findings)) return r.findings as string[];
    if (typeof r.findings === 'object' && r.findings !== null) {
      const obj = r.findings as Record<string, unknown>;
      const list: string[] = [];
      if (typeof obj.visual_acuity === 'string') list.push(`Visual Acuity: ${obj.visual_acuity}`);
      if (obj.remark) list.push(`Remark: ${obj.remark}`);
      return list;
    }
    return [];
  };

  const getMedicationRows = (r: RecordRow): MedicationRow[] => {
    if (Array.isArray(r.medications)) return r.medications;
    return [];
  };

  const getEyeMeasurements = (r: RecordRow): Array<{ label: string; value: string }> => {
    const measurements: Array<{ label: string; value: string }> = [];
    const visualAcuity = r.visualAcuity;

    if (visualAcuity) {
      if (typeof visualAcuity === 'string') {
        measurements.push({ label: 'Visual Acuity', value: visualAcuity });
      } else {
        const value = visualAcuity.both || [
          visualAcuity.right && `Right: ${visualAcuity.right}`,
          visualAcuity.left && `Left: ${visualAcuity.left}`,
        ].filter(Boolean).join(' | ');
        if (value) measurements.push({ label: 'Visual Acuity', value });
      }
    }

    const intraocularPressure = r.intraocularPressure;
    if (intraocularPressure) {
      if (typeof intraocularPressure === 'string') {
        measurements.push({ label: 'Intraocular Pressure', value: intraocularPressure });
      } else {
        const value = [
          intraocularPressure.right && `Right: ${intraocularPressure.right}`,
          intraocularPressure.left && `Left: ${intraocularPressure.left}`,
        ].filter(Boolean).join(' | ');
        if (value) measurements.push({ label: 'Intraocular Pressure', value });
      }
    }

    return measurements;
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Examination Report':
        return 'bg-primary/10 text-primary';
      case 'Prescription':
        return 'bg-secondary/10 text-secondary';
      case 'Screening Report':
        return 'bg-accent/10 text-accent';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const handleDownload = async (record?: RecordRow) => {
    const id = record?.id || selectedRecord?.id;
    if (!id) return;

    try {
      const token = api.getToken();
      const res = await fetch(`${api.BASE_URL || ''}/api/patient/records/${id}/export`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const html = await res.text();
      if (!res.ok) throw new Error(html || 'Failed to download record');

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    } catch {
      showBackendToast({ success: false, message: 'Failed to download medical record' });
    }
  };

  const eyeMeasurements = selectedRecord ? getEyeMeasurements(selectedRecord) : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Medical Records</h2>
        <p className="text-muted-foreground">Access your complete eye health history</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input placeholder="Search records..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by type" /></SelectTrigger>
          <SelectContent>
            {recordTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {filteredRecords.map((record) => (
          <div key={record.id} className="card-elevated hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedRecord(record)}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-foreground">{record.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(record.recordType)}`}>{record.recordType}</span>
                  </div>
                  {record.summary && <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{record.summary}</p>}
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{formatShortRecordDate(record.date)}</span>
                    <span className="flex items-center gap-1"><User className="h-4 w-4" />{record.doctor}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </div>
          </div>
        ))}

        {filteredRecords.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No records found</h3>
            <p className="text-muted-foreground">{searchTerm || typeFilter !== 'All Types' ? 'Try adjusting your search or filters' : "You don't have any medical records yet"}</p>
          </div>
        )}
      </div>

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
                      {formatRecordDate(selectedRecord.date)}
                    </p>
                  </div>
                </div>
              </div>

              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(selectedRecord.recordType)}`}>{selectedRecord.recordType}</span>
                  <span className="text-sm text-muted-foreground">{formatRecordDate(selectedRecord.date)}</span>
                </div>
                <DialogTitle>{selectedRecord.title}</DialogTitle>
                <DialogDescription>Examined by {selectedRecord.doctor}</DialogDescription>
              </DialogHeader>

              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>Patient: {patientName}</span>
              </div>

              <div className="space-y-6 py-4">
                <div className="border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b">
                    <h4 className="font-semibold text-foreground">Patient Information</h4>
                  </div>
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b">
                        <td className="px-4 py-2 font-medium bg-muted/30 w-1/3">Name</td>
                        <td className="px-4 py-2">{patientName}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2 font-medium bg-muted/30">Doctor</td>
                        <td className="px-4 py-2">{selectedRecord.doctor || 'Unknown'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2 font-medium bg-muted/30">Record Type</td>
                        <td className="px-4 py-2">{selectedRecord.recordType}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2 font-medium bg-muted/30">Record Date</td>
                        <td className="px-4 py-2">{formatRecordDate(selectedRecord.date)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {selectedRecord.summary && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2 border-b">
                      <h4 className="font-semibold text-foreground">Clinical Summary</h4>
                    </div>
                    <div className="p-4"><p className="text-muted-foreground">{selectedRecord.summary}</p></div>
                  </div>
                )}

                {findingsList(selectedRecord).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Findings</h4>
                    <ul className="space-y-2">
                      {findingsList(selectedRecord).map((finding, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                          <span className="text-muted-foreground">{finding}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {eyeMeasurements.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-2 border-b">
                      <h4 className="font-semibold text-foreground">Eye Measurements</h4>
                    </div>
                    <table className="w-full text-sm">
                      <tbody>
                        {eyeMeasurements.map((measurement, index) => (
                          <tr key={index} className={index > 0 ? 'border-t' : ''}>
                            <td className="px-4 py-2 font-medium bg-muted/30 w-1/3">{measurement.label}</td>
                            <td className="px-4 py-2 whitespace-pre-wrap">{measurement.value}</td>
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
                  <Button className="flex-1 gap-2" onClick={() => handleDownload(selectedRecord)}><Download className="h-4 w-4" />Download PDF</Button>
                  <Button variant="outline" className="flex-1 gap-2"><Eye className="h-4 w-4" />Share with Doctor</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
