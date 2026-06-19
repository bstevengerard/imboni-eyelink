import { useEffect, useState } from "react";
import {
  TrendingUp,
  Users,
  Eye,
  Calendar,
  MapPin,
  Download,
  Activity,
  Award,
  Clock,
  PhoneCall,
  Hospital,
  Truck,
  FileText,
  ClipboardCheck,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";

type Overview = {
  totalPatients: number;
  consultations: number;
  appointments: number;
  districtsCovered: number;
};

type TodayStats = {
  newPatientsToday: number;
  consultationsToday: number;
  appointmentsToday: number;
  teleconsultationsToday: number;
};

type MonthlyData = {
  month: string;
  patients: number;
  consultations: number;
};

type RegionData = {
  region: string;
  patients: number;
  percentage: number;
};

type AppointmentStatusData = {
  status: string;
  count: number;
};

type AppointmentTypeData = {
  type: string;
  count: number;
};

type ServiceTypeData = {
  name: string;
  appointments: number;
};

type HospitalData = {
  name: string;
  patients: number;
};

type MobileClinicData = {
  name: string;
  status: string;
  patients: number;
};

type MedicalRecordTypeData = {
  type: string;
  count: number;
};

type PrescriptionStatusData = {
  status: string;
  count: number;
};

type ReferralStatusData = {
  status: string;
  count: number;
};

type ReferralPriorityData = {
  priority: string;
  count: number;
};

type ClinicScheduleSummary = {
  visits: number;
  expectedPatients: number;
};

type RecentActivity = {
  id: string;
  type: "appointment" | "consultation" | "registration" | "clinic";
  title: string;
  description: string;
  time: string;
};

const chartConfig = {
  patients: { label: "Patients", color: "hsl(var(--primary))" },
  consultations: { label: "Consultations", color: "hsl(142, 76%, 36%)" },
  appointments: { label: "Appointments", color: "hsl(217, 91%, 60%)" },
  records: { label: "Records", color: "hsl(262, 83%, 58%)" },
  count: { label: "Count", color: "hsl(142, 76%, 36%)" },
};

const pieColors = ["hsl(var(--primary))", "hsl(142, 76%, 36%)", "hsl(217, 91%, 60%)", "hsl(38, 92%, 50%)", "hsl(262, 83%, 58%)", "hsl(346, 77%, 52%)"];

const overviewConfig = [
  { key: "totalPatients" as const, label: "Total Patients", icon: Users, color: "bg-blue-500/10 text-blue-600" },
  { key: "consultations" as const, label: "Consultations", icon: Eye, color: "bg-green-500/10 text-green-600" },
  { key: "appointments" as const, label: "Appointments", icon: Calendar, color: "bg-indigo-500/10 text-indigo-600" },
  { key: "districtsCovered" as const, label: "Locations Covered", icon: MapPin, color: "bg-orange-500/10 text-orange-600" },
];

const activityIcons = {
  appointment: { icon: Calendar, color: "bg-indigo-500/10 text-indigo-600" },
  consultation: { icon: Eye, color: "bg-green-500/10 text-green-600" },
  registration: { icon: Users, color: "bg-blue-500/10 text-blue-600" },
  clinic: { icon: MapPin, color: "bg-orange-500/10 text-orange-600" },
};

function exportAnalyticsCsv(timeRange: string, monthlyData: MonthlyData[]) {
  const rows = [
    ["Month", "Patients", "Consultations"],
    ...monthlyData.map((row) => [row.month, row.patients, row.consultations]),
  ];
  const csv = rows.map((row) => row.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `analytics-${timeRange}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex h-full min-h-[12rem] items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [regionData, setRegionData] = useState<RegionData[]>([]);
  const [appointmentStatusData, setAppointmentStatusData] = useState<AppointmentStatusData[]>([]);
  const [appointmentTypeData, setAppointmentTypeData] = useState<AppointmentTypeData[]>([]);
  const [serviceTypeData, setServiceTypeData] = useState<ServiceTypeData[]>([]);
  const [hospitalData, setHospitalData] = useState<HospitalData[]>([]);
  const [mobileClinicData, setMobileClinicData] = useState<MobileClinicData[]>([]);
  const [medicalRecordTypeData, setMedicalRecordTypeData] = useState<MedicalRecordTypeData[]>([]);
  const [prescriptionStatusData, setPrescriptionStatusData] = useState<PrescriptionStatusData[]>([]);
  const [referralStatusData, setReferralStatusData] = useState<ReferralStatusData[]>([]);
  const [referralPriorityData, setReferralPriorityData] = useState<ReferralPriorityData[]>([]);
  const [clinicScheduleSummary, setClinicScheduleSummary] = useState<ClinicScheduleSummary>({ visits: 0, expectedPatients: 0 });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await api.get<{
          overview: Overview;
          todayStats: TodayStats;
          monthlyData: MonthlyData[];
          regionData: RegionData[];
          appointmentStatusData: AppointmentStatusData[];
          appointmentTypeData: AppointmentTypeData[];
          serviceTypeData: ServiceTypeData[];
          hospitalData: HospitalData[];
          mobileClinicData: MobileClinicData[];
          medicalRecordTypeData: MedicalRecordTypeData[];
          prescriptionStatusData: PrescriptionStatusData[];
          referralStatusData: ReferralStatusData[];
          referralPriorityData: ReferralPriorityData[];
          clinicScheduleSummary: ClinicScheduleSummary;
          recentActivity: RecentActivity[];
        }>(`/api/admin/analytics?timeRange=${timeRange}`);

        if (!cancelled && res.success && res.data) {
          setOverview(res.data.overview);
          setTodayStats(res.data.todayStats);
          setMonthlyData(res.data.monthlyData || []);
          setRegionData(res.data.regionData || []);
          setAppointmentStatusData(res.data.appointmentStatusData || []);
          setAppointmentTypeData(res.data.appointmentTypeData || []);
          setServiceTypeData(res.data.serviceTypeData || []);
          setHospitalData(res.data.hospitalData || []);
          setMobileClinicData(res.data.mobileClinicData || []);
          setMedicalRecordTypeData(res.data.medicalRecordTypeData || []);
          setPrescriptionStatusData(res.data.prescriptionStatusData || []);
          setReferralStatusData(res.data.referralStatusData || []);
          setReferralPriorityData(res.data.referralPriorityData || []);
          setClinicScheduleSummary(res.data.clinicScheduleSummary || { visits: 0, expectedPatients: 0 });
          setRecentActivity(res.data.recentActivity || []);
        }
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  if (loading && !overview) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading analytics...</div>;
  }

  const latestMonth = monthlyData[monthlyData.length - 1];
  const previousMonth = monthlyData[monthlyData.length - 2];
  const patientGrowth = latestMonth && previousMonth ? latestMonth.patients - previousMonth.patients : 0;
  const averageConsultations = monthlyData.length
    ? Math.round(monthlyData.reduce((sum, row) => sum + row.consultations, 0) / monthlyData.length)
    : 0;
  const topHospital = regionData[0] || null;
  const completedAppointments = appointmentStatusData.find((item) => item.status === "completed")?.count || 0;
  const totalAppointmentsInScope = appointmentStatusData.reduce((sum, item) => sum + item.count, 0);
  const completionRate = totalAppointmentsInScope ? Math.round((completedAppointments / totalAppointmentsInScope) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Activity className="w-3.5 h-3.5" />
              Live system analytics
            </div>
            <h2 className="text-xl font-semibold">Analytics Dashboard</h2>
            <p className="text-sm text-muted-foreground">PowerBI-style operational views from IMBONI EyeLink data</p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
                <SelectItem value="1y">Last year</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" className="hidden sm:flex" onClick={() => exportAnalyticsCsv(timeRange, monthlyData)}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {overviewConfig.map((stat) => (
          <div key={stat.label} className="card-compact border border-border">
            <div className="mb-3 flex items-center justify-between">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${stat.color}`}>
                <stat.icon className="w-4 h-4" />
              </div>
              <TrendingUp className="w-4 h-4 text-muted-foreground/60" />
            </div>
            <p className="text-xl font-semibold">{overview ? overview[stat.key].toLocaleString() : "—"}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-compact border border-border lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold">Patient & Consultation Trend</h3>
              <p className="text-xs text-muted-foreground">Monthly registrations and completed consultations</p>
            </div>
            <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{timeRange}</span>
          </div>
          {monthlyData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} cursor={{ stroke: "hsl(var(--border))" }} />
                <Area type="monotone" dataKey="patients" stackId="1" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.25} name="Patients" />
                <Area type="monotone" dataKey="consultations" stackId="2" stroke="hsl(142, 76%, 36%)" fill="hsl(142, 76%, 36%)" fillOpacity={0.18} name="Consultations" />
              </AreaChart>
            </ChartContainer>
          ) : (
            <EmptyState label="No monthly trend data available" />
          )}
        </div>

        <div className="card-compact border border-border">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Appointment Status</h3>
            <p className="text-xs text-muted-foreground">Pipeline by current status</p>
          </div>
          {appointmentStatusData.length > 0 ? (
            <div className="grid gap-4">
              <ChartContainer config={chartConfig} className="h-48 w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="count" />} />
                  <Pie data={appointmentStatusData} dataKey="count" nameKey="status" innerRadius={52} outerRadius={78} paddingAngle={2}>
                    {appointmentStatusData.map((_, index) => (
                      <Cell key={index} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="grid grid-cols-2 gap-2">
                {appointmentStatusData.map((item) => (
                  <div key={item.status} className="rounded-lg bg-muted/40 p-2">
                    <p className="text-xs capitalize text-muted-foreground">{item.status}</p>
                    <p className="text-lg font-semibold">{item.count.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState label="No appointment status data available" />
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-compact border border-border">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Service Type Demand</h3>
            <p className="text-xs text-muted-foreground">Top booked service types</p>
          </div>
          {serviceTypeData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <BarChart layout="vertical" data={serviceTypeData} margin={{ top: 10, right: 20, left: 110, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent nameKey="appointments" />} cursor={false} />
                <Bar dataKey="appointments" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} name="Appointments" />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyState label="No service type demand data available" />
          )}
        </div>

        <div className="card-compact border border-border">
          <div className="mb-4">
            <h3 className="text-base font-semibold">Appointment Types</h3>
            <p className="text-xs text-muted-foreground">In-person, teleconsultation and other visit types</p>
          </div>
          {appointmentTypeData.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              <ChartContainer config={chartConfig} className="h-56 w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent nameKey="count" />} />
                  <Pie data={appointmentTypeData} dataKey="count" nameKey="type" innerRadius={48} outerRadius={76} paddingAngle={2}>
                    {appointmentTypeData.map((_, index) => (
                      <Cell key={index} fill={pieColors[index % pieColors.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
              <div className="space-y-2">
                {appointmentTypeData.map((item) => (
                  <div key={item.type} className="rounded-lg border border-border p-3">
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium capitalize">{item.type}</p>
                      <p className="text-sm font-semibold">{item.count.toLocaleString()}</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (item.count / (appointmentTypeData[0]?.count || 1)) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState label="No appointment type data available" />
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card-compact border border-border">
          <div className="mb-4 flex items-center gap-2">
            <Hospital className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-base font-semibold">Top Partner Hospitals</h3>
              <p className="text-xs text-muted-foreground">Patients linked to partner facilities</p>
            </div>
          </div>
          {hospitalData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <BarChart data={hospitalData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", angle: -25, textAnchor: "end", height: 55 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent nameKey="patients" />} cursor={false} />
                <Bar dataKey="patients" fill="hsl(217, 91%, 60%)" radius={[6, 6, 0, 0]} name="Patients" />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyState label="No hospital distribution data available" />
          )}
        </div>

        <div className="card-compact border border-border">
          <div className="mb-4 flex items-center gap-2">
            <Truck className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-base font-semibold">Mobile Clinic Performance</h3>
              <p className="text-xs text-muted-foreground">Patients served by clinic unit</p>
            </div>
          </div>
          {mobileClinicData.length > 0 ? (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <BarChart layout="vertical" data={mobileClinicData} margin={{ top: 10, right: 20, left: 120, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <ChartTooltip content={<ChartTooltipContent nameKey="patients" />} cursor={false} />
                <Bar dataKey="patients" fill="hsl(142, 76%, 36%)" radius={[0, 6, 6, 0]} name="Patients" />
              </BarChart>
            </ChartContainer>
          ) : (
            <EmptyState label="No mobile clinic performance data available" />
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card-compact border border-border">
          <div className="mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-base font-semibold">Medical Records</h3>
              <p className="text-xs text-muted-foreground">Record types in selected period</p>
            </div>
          </div>
          {medicalRecordTypeData.length > 0 ? (
            <div className="space-y-2">
              {medicalRecordTypeData.map((item) => (
                <div key={item.type} className="rounded-lg bg-muted/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{item.type}</span>
                    <span className="text-sm font-semibold">{item.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (item.count / (medicalRecordTypeData[0]?.count || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="No medical record data available" />
          )}
        </div>

        <div className="card-compact border border-border">
          <div className="mb-4 flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-base font-semibold">Prescriptions</h3>
              <p className="text-xs text-muted-foreground">Prescription status breakdown</p>
            </div>
          </div>
          {prescriptionStatusData.length > 0 ? (
            <div className="space-y-2">
              {prescriptionStatusData.map((item) => (
                <div key={item.status} className="rounded-lg bg-muted/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{item.status}</span>
                    <span className="text-sm font-semibold">{item.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (item.count / (prescriptionStatusData[0]?.count || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState label="No prescription data available" />
          )}
        </div>

        <div className="card-compact border border-border">
          <div className="mb-4 flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-base font-semibold">Referrals</h3>
              <p className="text-xs text-muted-foreground">Status and priority mix</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="text-xs text-muted-foreground">Scheduled visits</p>
              <p className="text-2xl font-semibold">{clinicScheduleSummary.visits.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{clinicScheduleSummary.expectedPatients.toLocaleString()} expected patients</p>
            </div>
            {referralStatusData.length > 0 ? (
              referralStatusData.map((item) => (
                <div key={item.status} className="rounded-lg bg-muted/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{item.status}</span>
                    <span className="text-sm font-semibold">{item.count.toLocaleString()}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (item.count / (referralStatusData[0]?.count || 1)) * 100)}%` }} />
                  </div>
                </div>
              ))
            ) : (
              <EmptyState label="No referral data available" />
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="card-compact border border-border border-l-4 border-l-primary">
          <div className="mb-1 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h4 className="font-semibold text-sm">Patient Growth</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            {patientGrowth > 0
              ? `${patientGrowth.toLocaleString()} more patients than the previous month.`
              : "Patient registrations are steady or unchanged this month."}
          </p>
        </div>
        <div className="card-compact border border-border border-l-4 border-l-green-500">
          <div className="mb-1 flex items-center gap-2">
            <Activity className="w-4 h-4 text-green-600" />
            <h4 className="font-semibold text-sm">Completion Rate</h4>
          </div>
          <p className="text-xs text-muted-foreground">{completionRate}% of tracked appointments are completed.</p>
        </div>
        <div className="card-compact border border-border border-l-4 border-l-purple-500">
          <div className="mb-1 flex items-center gap-2">
            <Award className="w-4 h-4 text-purple-600" />
            <h4 className="font-semibold text-sm">Top Hospital</h4>
          </div>
          <p className="text-xs text-muted-foreground">
            {topHospital ? `${topHospital.region} leads with ${topHospital.patients.toLocaleString()} patients.` : "No hospital data available yet."}
          </p>
        </div>
      </div>

      <div className="card-compact border border-border">
        <div className="mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <div>
            <h3 className="text-base font-semibold">Today's Operations</h3>
            <p className="text-xs text-muted-foreground">Live daily activity snapshot</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-blue-500/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-blue-600">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium">New Patients</span>
            </div>
            <p className="text-2xl font-semibold">{todayStats?.newPatientsToday ?? 0}</p>
          </div>
          <div className="rounded-lg bg-green-500/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-green-600">
              <Eye className="w-4 h-4" />
              <span className="text-xs font-medium">Consultations</span>
            </div>
            <p className="text-2xl font-semibold">{todayStats?.consultationsToday ?? 0}</p>
          </div>
          <div className="rounded-lg bg-indigo-500/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-indigo-600">
              <Calendar className="w-4 h-4" />
              <span className="text-xs font-medium">Appointments</span>
            </div>
            <p className="text-2xl font-semibold">{todayStats?.appointmentsToday ?? 0}</p>
          </div>
          <div className="rounded-lg bg-orange-500/10 p-3">
            <div className="mb-1 flex items-center gap-2 text-orange-600">
              <PhoneCall className="w-4 h-4" />
              <span className="text-xs font-medium">Tele-consultations</span>
            </div>
            <p className="text-2xl font-semibold">{todayStats?.teleconsultationsToday ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="card-compact border border-border">
        <div className="mb-4">
          <h3 className="text-base font-semibold">Recent System Activity</h3>
          <p className="text-xs text-muted-foreground">Latest appointments and registrations</p>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((activity) => {
              const iconConfig = activityIcons[activity.type];
              return (
                <div key={activity.id} className="flex items-center gap-3 rounded-lg bg-muted/30 p-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconConfig.color}`}>
                    <iconConfig.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                    <Clock className="w-3 h-3" />
                    <span>{activity.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
