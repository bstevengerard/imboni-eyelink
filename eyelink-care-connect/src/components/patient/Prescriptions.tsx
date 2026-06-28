import { useEffect, useMemo, useState } from 'react';
import {
  Pill,
  User,
  RefreshCw,
  Download,
  AlertCircle,
  CheckCircle,
  Search,
  Calendar,
} from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { showBackendToast } from '@/lib/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type PrescriptionRow = {
  id?: string;
  _id: string;
  content: string;
  status: string;
  createdAt?: string;
  doctor?: string;
  doctor_id?: string;
  doctor_specialty?: string;
  hospital?: string;
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
      const dosage = durationMatch
        ? details.replace(durationMatch[0], '').replace(/for\s*$/i, '').trim()
        : details;

      return {
        medication: medication.trim(),
        dosage,
        duration: durationMatch ? durationMatch[1].trim() : '',
      };
    });
};

const formatPrescriptionDate = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const formatMedicationValue = (value?: string) => {
  const text = String(value || '').trim();
  if (!text || text.toLowerCase() === 'as directed') return 'N/A';
  return text;
};

export default function PatientPrescriptions() {
  const { user } = useAuth();
  const patientName = user?.name || 'Unknown';
  const [searchQuery, setSearchQuery] = useState('');
  const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionRow | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRefillOpen, setIsRefillOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await api.get<any[]>('/api/patient/prescriptions');
        if (cancelled) return;

        const mapped: PrescriptionRow[] = Array.isArray(res.data)
          ? res.data.map((r: any) => ({
              _id: String(r._id ?? r.id),
              id: r.id ?? r._id,
              content: r.content ?? '',
              status: r.status ?? 'active',
              createdAt: r.createdAt ?? r.created_at,
              doctor: r.doctor ?? '',
              doctor_id: r.doctor_id ?? undefined,
              doctor_specialty: r.doctor_specialty ?? '',
              hospital: r.hospital ?? '',
            }))
          : [];

        setPrescriptions(mapped);
      } catch (e) {
        if (!cancelled) setPrescriptions([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPrescriptions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return prescriptions;

    return prescriptions.filter(
      (rx) =>
        (rx.content ?? '').toLowerCase().includes(q) ||
        (rx.doctor ?? '').toLowerCase().includes(q)
    );
  }, [prescriptions, searchQuery]);

  const activePrescriptions = filteredPrescriptions.filter((rx) => rx.status === 'active');
  const completedPrescriptions = filteredPrescriptions.filter((rx) => rx.status !== 'active');

  const handleViewDetails = (rx: PrescriptionRow) => {
    setSelectedPrescription(rx);
    setIsDetailsOpen(true);
  };
  const handleRequestRefill = (rx: PrescriptionRow) => {
    setSelectedPrescription(rx);
    setIsRefillOpen(true);
  };

  const handleConfirmRefill = async () => {
    if (!selectedPrescription) return;
    try {
      const res = await api.post(`/api/patient/prescriptions/${selectedPrescription._id}/refill`);
      showBackendToast(res);
      setIsRefillOpen(false);
    } catch (e) {
      showBackendToast({ success: false, message: "Failed to request refill" });
    }
  };

  const handleDownload = async (rx?: PrescriptionRow) => {
    const id = (rx?._id || rx?.id || selectedPrescription?._id || selectedPrescription?.id);
    if (!id) return;

    try {
      const token = api.getToken();
      const res = await fetch(`${api.BASE_URL}/api/patient/prescriptions/${id}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const html = await res.text();

      if (!res.ok) {
        throw new Error(html || 'Failed to download prescription');
      }

      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      URL.revokeObjectURL(url);
    } catch {
      showBackendToast({ success: false, message: 'Failed to download prescription' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">My Prescriptions</h2>
        <p className="text-muted-foreground">View and manage your medication prescriptions</p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search prescriptions…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : filteredPrescriptions.length === 0 ? (
        <div className="text-center py-12">
          <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">No prescriptions found</h3>
        </div>
      ) : (
        <>
          {activePrescriptions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />Active Prescriptions
              </h3>
              <div className="space-y-4">
                {activePrescriptions.map((rx) => (
                  <div
                    key={rx._id}
                    className="card-elevated p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Pill className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground line-clamp-2">{rx.content}</p>
                        <p className="text-sm text-muted-foreground mt-1">{rx.doctor ?? ''}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPrescriptionDate(rx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewDetails(rx)}>
                        View Details
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleRequestRefill(rx)}>
                        <RefreshCw className="h-4 w-4 mr-1" />Refill
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDownload(rx)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedPrescriptions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />Past Prescriptions
              </h3>
              <div className="space-y-4">
                {completedPrescriptions.map((rx) => (
                  <div
                    key={rx._id}
                    className="card-elevated p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 opacity-90"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Pill className="h-6 w-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground line-clamp-2">{rx.content}</p>
                        <p className="text-sm text-muted-foreground mt-1">{rx.doctor ?? ''}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatPrescriptionDate(rx.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => handleViewDetails(rx)}>
                      View Details
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[95vh] overflow-y-auto">
          {selectedPrescription && (
            <>
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
                    <p className="text-muted-foreground">RX-{selectedPrescription._id.slice(-6)}</p>
                    <p className="text-muted-foreground">{formatPrescriptionDate(selectedPrescription.createdAt)}</p>
                  </div>
                </div>
              </div>

              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedPrescription.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                    {selectedPrescription.status}
                  </span>
                </div>
                <DialogTitle className="text-2xl">Medication Prescription</DialogTitle>
                <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Patient: {patientName}</span>
                </div>
              </DialogHeader>

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
                        <td className="px-4 py-2">{selectedPrescription.doctor || 'Unknown'}</td>
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-2 font-medium bg-muted/30">Prescribed</td>
                        <td className="px-4 py-2">{formatPrescriptionDate(selectedPrescription.createdAt)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

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
                      {parsePrescriptionContent(selectedPrescription.content).length > 0 ? (
                        parsePrescriptionContent(selectedPrescription.content).map((item, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">{index + 1}</td>
                            <td className="px-4 py-2">{item.medication}</td>
                            <td className="px-4 py-2 whitespace-pre-wrap">{formatMedicationValue(item.dosage)}</td>
                            <td className="px-4 py-2">{formatMedicationValue(item.duration)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="px-4 py-2" colSpan={4}>
                            <p className="text-muted-foreground whitespace-pre-wrap">{selectedPrescription.content || 'N/A'}</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between gap-4 border-t pt-6">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Issued {formatPrescriptionDate(selectedPrescription.createdAt)}</span>
                  </div>
                  <Button variant="outline" className="gap-2" onClick={() => handleDownload(selectedPrescription)}>
                    <Download className="h-4 w-4" />Download
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isRefillOpen} onOpenChange={setIsRefillOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Refill</DialogTitle>
            <DialogDescription>Submit a refill request</DialogDescription>
          </DialogHeader>

          {selectedPrescription && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-2">{selectedPrescription.content}</p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsRefillOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleConfirmRefill} className="flex-1">
                  Submit Refill Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
