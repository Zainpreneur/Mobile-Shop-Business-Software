import { useEffect, useState, useCallback } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Card, Button, Input, Badge, Modal, ErrorBanner, EmptyState } from "../components/ui";

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const emptyForm = { name: "", phone: "", email: "", address: "", notes: "" };

export default function Customers() {
  const { isAdmin } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    client
      .get("/customers", { params: search ? { search } : {} })
      .then((res) => setCustomers(res.data))
      .finally(() => setLoading(false));
  }, [search]);

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

  function openEdit(c) {
    setEditing(c);
    setForm({ name: c.name, phone: c.phone || "", email: c.email || "", address: c.address || "", notes: c.notes || "" });
    setError("");
    setModalOpen(true);
  }

  async function viewDetail(c) {
    const res = await client.get(`/customers/${c.id}`);
    setDetail(res.data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      if (editing) {
        await client.put(`/customers/${editing.id}`, form);
      } else {
        await client.post("/customers", form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save customer");
    }
  }

  async function handleDelete(c) {
    if (!confirm(`Delete customer "${c.name}"?`)) return;
    await client.delete(`/customers/${c.id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Customers</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage your customer records</p>
        </div>
        <Button onClick={openCreate}>+ Add Customer</Button>
      </div>

      <Card className="p-4">
        <Input placeholder="Search by name, phone or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 md:max-w-xs" />

        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : customers.length === 0 ? (
          <EmptyState message="No customers found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Address</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100 dark:border-slate-800/50">
                    <td className="py-2 pr-4">
                      <button className="font-medium text-indigo-600 hover:underline" onClick={() => viewDetail(c)}>
                        {c.name}
                      </button>
                    </td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{c.phone || "—"}</td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{c.email || "—"}</td>
                    <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{c.address || "—"}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <button onClick={() => openEdit(c)} className="text-indigo-600 hover:underline text-xs mr-3">
                        Edit
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(c)} className="text-red-600 hover:underline text-xs">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Customer" : "Add Customer"}>
        <ErrorBanner message={error} />
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Name *</label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Phone</label>
            <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Email</label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Address</label>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Notes</label>
            <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save Changes" : "Add Customer"}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail?.name} wide>
        {detail && (
          <div className="space-y-4">
            <div className="text-sm text-slate-600 dark:text-slate-300">
              <p>{detail.phone}</p>
              <p>{detail.email}</p>
              <p>{detail.address}</p>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Purchase History</h4>
              {detail.sales.length === 0 ? (
                <p className="text-xs text-slate-400">No purchases yet.</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {detail.sales.map((s) => (
                    <li key={s.id} className="flex justify-between">
                      <span>
                        {s.invoiceNumber} — {new Date(s.createdAt).toLocaleDateString()}
                      </span>
                      <Badge tone={s.status === "refunded" ? "refunded" : "good"}>{money(s.total)}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Repair History</h4>
              {detail.repairs.length === 0 ? (
                <p className="text-xs text-slate-400">No repair tickets yet.</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {detail.repairs.map((r) => (
                    <li key={r.id} className="flex justify-between">
                      <span>
                        {r.ticketNumber} — {r.deviceBrand} {r.deviceModel}
                      </span>
                      <Badge tone={r.status}>{r.status}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
