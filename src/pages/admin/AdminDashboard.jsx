import AppShell from "../../components/common/AppShell";
import Badge from "../../components/common/Badge";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FiTrendingUp, FiActivity, FiShield, FiAlertTriangle } from "react-icons/fi";

const kpis = [
  { label: "Total Users", value: "1,482", delta: "+1.5%", icon: FiTrendingUp, tone: "green" },
  { label: "Active Sessions", value: "128",  delta: "-2.1%", icon: FiActivity,    tone: "red" },
  { label: "System Health", value: "99.9% Uptime", delta: "+0.0%", icon: FiShield, tone: "green" },
  { label: "Failed Logins (24h)", value: "4", delta: "+10.0%", icon: FiAlertTriangle, tone: "red" },
];

const activity = [
  { d: "Mon", v: 420 }, { d: "Tue", v: 610 }, { d: "Wed", v: 480 },
  { d: "Thu", v: 820 }, { d: "Fri", v: 390 }, { d: "Sat", v: 210 }, { d: "Sun", v: 760 },
];

const rolePie = [
  { name: "Patients", value: 0.6 },
  { name: "Clinicians", value: 0.3 },
  { name: "Admins", value: 0.1 },
];
const COLORS = ["#10B981", "#3B82F6", "#F59E0B"];

export default function AdminDashboard() {
  return (
    <AppShell title="Admin Dashboard">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Welcome back, Evelyn!</h2>
        <p className="text-gray-600">Here is a summary of the system’s current status.</p>
      </div>

      {/* KPI cards */}
      <div className="grid md:grid-cols-4 gap-4 mb-6">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 text-sm">{k.label}</span>
              <k.icon className="text-gray-400" />
            </div>
            <div className="mt-2 text-2xl font-semibold">{k.value}</div>
            <div className="mt-1">
              <Badge tone={k.tone}>{k.delta}</Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">User Activity (Last 7 Days)</h3>
              <p className="text-sm text-gray-600">3,450 Actions • Last 7 Days <span className="text-green-600 font-medium">+5.2%</span></p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activity}>
                <XAxis dataKey="d" tickLine={false} axisLine={false} />
                <YAxis hide />
                <Tooltip cursor={{ stroke: "#e5e7eb" }} />
                <Line type="monotone" dataKey="v" stroke="#0EA5E9" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-5">
          <div className="flex items-baseline justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold">User Role Distribution</h3>
              <p className="text-sm text-gray-600">1,482 Total Users • <span className="text-green-600 font-medium">+1.5%</span> All Time</p>
            </div>
          </div>
          <div className="h-64 grid grid-cols-2">
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={rolePie} dataKey="value" innerRadius={60} outerRadius={90} paddingAngle={2}>
                    {rolePie.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col justify-center gap-2">
              <LegendItem color={COLORS[0]} label="Patients" value="60%" />
              <LegendItem color={COLORS[1]} label="Clinicians" value="30%" />
              <LegendItem color={COLORS[2]} label="Admins" value="10%" />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function LegendItem({ color, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-3.5 h-3.5 rounded-full" style={{ background: color }} />
      <span className="text-sm text-gray-700">{label}</span>
      <span className="ml-auto font-medium">{value}</span>
    </div>
  );
}
