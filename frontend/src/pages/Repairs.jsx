import { useEffect, useState, useCallback } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Card, Button, Input, Select, Badge, Modal, ErrorBanner, EmptyState } from "../components/ui";

const money = (n) => (n === null || n === undefined ? "—" : `$${Number(n).toFixed(2)}`);
const STATUSES = ["pending", "in_progress", "completed", "delivered", "cancelled"];

const emptyForm = {
  customerId: "",
  deviceBrand: "",
  deviceModel: "",
  issueDescription: "",
  estimatedCost: "",
  technician: "",
  notes: "",
};

export default function Repairs() {
  const { isAdmin } = useAuth();
  const [repairs, setRepairs] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (status) params.status = status;
    if (search) params.search = search;
    client
      .get("/repairs", { params })
      .then((res) => setRepairs(res.data))
      .finally(() => setLoading(false));
  }, [status, search]);

  useEffect(() => {
    client.get("/customers").then((res) => setCustomers(res.data));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setModalOpen(true);
  }

  function openEdit(r) {
    setEditing(r);
    setForm({
      customerId: r.customerId ? String(r.customerId) : "",
      deviceBrand: r.deviceBrand || "",
      deviceModel: r.deviceModel || "",
      issueDescription: r.issueDescription,
      estimatedCost: r.estimatedCost ?? "",
      technician: r.technician || "",
      notes: r.notes || "",
      status: r.status,
      actualCost: r.actualCost ?? "",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      if (editing) {
        await client.patch(`/repairs/${editing.id}`, form);
      } else {
        await client.post("/repairs", { ...form, customerId: form.customerId || null });
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save repair ticket");
    }
  }

  async function quickStatusChange(r, newStatus) {
    await client.patch(`/repairs/${r.id}`, { status: newStatus });
    load();
  }

  async function handleDelete(r) {
    if (!confirm(`Delete ticket ${r.ticketNumber}?`)) return;
    await client.delete(`/repairs/${r.id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Repair Tickets</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Track customer device repairs</p>
        </div>
        <Button onClick={openCreate}>+ New Repair Ticket</Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <Input placeholder="Search ticket, device, issue..." value={search} onChange={(e) => setSearch(e.target.value)} className="md:max-w-xs" />
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="md:max-w-[180px]">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </Select>
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : repairs.length === 0 ? (
          <EmptyState message="No repair tickets found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 pr-4">Ticket</th>
                  <th className="py-2 pr-4">Customer</th>
                  <th className="py-2 pr-4">Device</th>
                  <th className="py-2 pr-4">Issue</th>
                  <th className="py-2 pr-4">Est. Cost</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {repairs.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 dark:border-slate-800/50">
                    <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">{r.ticketNumber}</td>
                    <td className="py-2 pr-4">{r.customer?.name || "—"}</td>
                    <td className="py-2 pr-4">
                      {r.deviceBrand} {r.deviceModel}
                    </td>
                    <td className="py-2 pr-4 max-w-xs truncate" title={r.issueDescription}>
                      {r.issueDescription}
                    </td>
                    <td className="py-2 pr-4">{money(r.estimatedCost)}</td>
                    <td className="py-2 pr-4">
                      <Select
                        value={r.status}
                        onChange={(e) => quickStatusChange(r, e.target.value)}
                        className="!w-auto text-xs py-1"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </Select>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <button onClick={() => openEdit(r)} className="text-indigo-600 hover:underline text-xs mr-3">
                        Edit
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(r)} className="text-red-600 hover:underline text-xs">
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.ticketNumber}` : "New Repair Ticket"} wide>
        <ErrorBanner message={error} />
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Customer</label>
            <Select value={form.customerId} onChange={(e) => setForm({ ...form, customerId: e.target.value })}>
              <option value="">Walk-in customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Device Brand</label>
            <Input value={form.deviceBrand} onChange={(e) => setForm({ ...form, deviceBrand: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Device Model</label>
            <Input value={form.deviceModel} onChange={(e) => setForm({ ...form, deviceModel: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Issue Description *</label>
            <textarea
              required
              rows={3}
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.issueDescription}
              onChange={(e) => setForm({ ...form, issueDescription: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Estimated Cost</label>
            <Input type="number" min="0" step="0.01" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} />
          </div>
          {editing && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Actual Cost</label>
              <Input type="number" min="0" step="0.01" value={form.actualCost} onChange={(e) => setForm({ ...form, actualCost: e.target.value })} />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Technician</label>
            <Input value={form.technician} onChange={(e) => setForm({ ...form, technician: e.target.value })} />
          </div>
          {editing && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Status</label>
              <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Notes</label>
            <textarea
              rows={2}
              className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save Changes" : "Create Ticket"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
