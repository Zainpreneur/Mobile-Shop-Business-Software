import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import client from "../api/client";
import { Card, StatCard, Badge } from "../components/ui";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([client.get("/dashboard/summary"), client.get("/dashboard/sales-by-day?days=14")])
      .then(([s, c]) => {
        setSummary(s.data);
        setChartData(c.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-500">Loading dashboard...</p>;
  if (!summary) return <p className="text-slate-500">Could not load dashboard data.</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Overview of your shop's performance</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Revenue Today" value={money(summary.revenueToday)} hint={`${summary.salesCountToday} sales`} tone="good" />
        <StatCard label="Revenue This Month" value={money(summary.revenueMonth)} hint={`${summary.salesCountMonth} sales`} />
        <StatCard
          label="Low Stock Items"
          value={summary.lowStockCount}
          hint="Needs restocking"
          tone={summary.lowStockCount > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Pending Repairs"
          value={summary.pendingRepairs}
          hint="Pending / in progress"
          tone={summary.pendingRepairs > 0 ? "warn" : "default"}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={summary.totalProducts} />
        <StatCard label="Inventory Value" value={money(summary.inventoryValue)} hint="At cost price" />
        <StatCard label="Customers" value={summary.totalCustomers} />
        <StatCard label="Suppliers" value={summary.totalSuppliers} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-4 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Revenue — last 14 days</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => money(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-4">Top Selling Products</h3>
          <ul className="space-y-3">
            {summary.topProducts.length === 0 && <p className="text-sm text-slate-400">No sales yet.</p>}
            {summary.topProducts.map(({ product, quantitySold }) =>
              product ? (
                <li key={product.id} className="flex justify-between text-sm">
                  <span className="text-slate-700 dark:text-slate-300">{product.name}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">{quantitySold} sold</span>
                </li>
              ) : null
            )}
          </ul>
        </Card>
      </div>

      {summary.lowStockProducts.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Low Stock Alerts</h3>
            <Link to="/inventory" className="text-sm text-indigo-600 hover:underline">
              View inventory →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">SKU</th>
                  <th className="py-2 pr-4">Quantity</th>
                  <th className="py-2 pr-4">Threshold</th>
                </tr>
              </thead>
              <tbody>
                {summary.lowStockProducts.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/50">
                    <td className="py-2 pr-4 text-slate-800 dark:text-slate-200">{p.name}</td>
                    <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{p.sku}</td>
                    <td className="py-2 pr-4">
                      <Badge tone="warn">{p.quantity}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{p.lowStockThreshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
