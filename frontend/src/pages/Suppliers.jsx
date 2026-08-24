import { useEffect, useState, useCallback } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Card, Button, Input, Select, Badge, Modal, ErrorBanner, EmptyState } from "../components/ui";

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const emptyForm = { name: "", phone: "", email: "", address: "", notes: "" };

export default function Suppliers() {
  const { isAdmin } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [detail, setDetail] = useState(null);
  const [restockOpen, setRestockOpen] = useState(false);
  const [restockSupplier, setRestockSupplier] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    client
      .get("/suppliers", { params: search ? { search } : {} })
      .then((res) => setSuppliers(res.data))
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

  function openEdit(s) {
    setEditing(s);
    setForm({ name: s.name, phone: s.phone || "", email: s.email || "", address: s.address || "", notes: s.notes || "" });
    setError("");
    setModalOpen(true);
  }

  async function viewDetail(s) {
    const res = await client.get(`/suppliers/${s.id}`);
    setDetail(res.data);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      if (editing) {
        await client.put(`/suppliers/${editing.id}`, form);
      } else {
        await client.post("/suppliers", form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save supplier");
    }
  }

  async function handleDelete(s) {
    if (!confirm(`Delete supplier "${s.name}"?`)) return;
    await client.delete(`/suppliers/${s.id}`);
    load();
  }

  function openRestock(s) {
    setRestockSupplier(s);
    setRestockOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Suppliers</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage suppliers and record restocks</p>
        </div>
        <Button onClick={openCreate}>+ Add Supplier</Button>
      </div>

      <Card className="p-4">
        <Input placeholder="Search by name, phone or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4 md:max-w-xs" />

        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : suppliers.length === 0 ? (
          <EmptyState message="No suppliers found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Products</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {suppliers.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 dark:border-slate-800/50">
                    <td className="py-2 pr-4">
                      <button className="font-medium text-indigo-600 hover:underline" onClick={() => viewDetail(s)}>
                        {s.name}
                      </button>
                    </td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{s.phone || "—"}</td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{s.email || "—"}</td>
                    <td className="py-2 pr-4">
                      <Badge>{s._count?.products ?? 0} products</Badge>
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <button onClick={() => openRestock(s)} className="text-emerald-600 hover:underline text-xs mr-3">
                        Restock
                      </button>
                      <button onClick={() => openEdit(s)} className="text-indigo-600 hover:underline text-xs mr-3">
                        Edit
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(s)} className="text-red-600 hover:underline text-xs">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Supplier" : "Add Supplier"}>
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
            <Button type="submit">{editing ? "Save Changes" : "Add Supplier"}</Button>
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
              <h4 className="font-semibold text-sm mb-2">Products Supplied ({detail.products.length})</h4>
              <ul className="text-sm space-y-1 max-h-40 overflow-y-auto">
                {detail.products.map((p) => (
                  <li key={p.id} className="flex justify-between">
                    <span>{p.name}</span>
                    <Badge tone={p.quantity <= p.lowStockThreshold ? "warn" : "good"}>{p.quantity} in stock</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-sm mb-2">Purchase History</h4>
              {detail.purchases.length === 0 ? (
                <p className="text-xs text-slate-400">No purchases recorded yet.</p>
              ) : (
                <ul className="text-sm space-y-1">
                  {detail.purchases.map((p) => (
                    <li key={p.id} className="flex justify-between">
                      <span>
                        {new Date(p.createdAt).toLocaleDateString()} — {p.items.length} item(s)
                      </span>
                      <span className="font-medium">{money(p.totalCost)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </Modal>

      <RestockModal
        open={restockOpen}
        onClose={() => setRestockOpen(false)}
        supplier={restockSupplier}
        onDone={() => {
          setRestockOpen(false);
          load();
        }}
      />
    </div>
  );
}

function RestockModal({ open, onClose, supplier, onDone }) {
  const [products, setProducts] = useState([]);
  const [lines, setLines] = useState([{ productId: "", quantity: "1", unitCost: "" }]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) client.get("/products").then((res) => setProducts(res.data));
    setLines([{ productId: "", quantity: "1", unitCost: "" }]);
    setError("");
  }, [open]);

  function updateLine(idx, field, value) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: "", quantity: "1", unitCost: "" }]);
  }

  function removeLine(idx) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const items = lines
      .filter((l) => l.productId && Number(l.quantity) > 0)
      .map((l) => ({ productId: Number(l.productId), quantity: Number(l.quantity), unitCost: Number(l.unitCost) || 0 }));
    if (items.length === 0) {
      setError("Add at least one valid item");
      return;
    }
    setSubmitting(true);
    try {
      await client.post(`/suppliers/${supplier.id}/purchases`, { items });
      onDone();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to record purchase");
    } finally {
      setSubmitting(false);
    }
  }

  if (!supplier) return null;

  return (
    <Modal open={open} onClose={onClose} title={`Restock from ${supplier.name}`} wide>
      <ErrorBanner message={error} />
      <form onSubmit={handleSubmit} className="space-y-3">
        {lines.map((line, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-6">
              <label className="block text-xs text-slate-500 mb-1">Product</label>
              <Select value={line.productId} onChange={(e) => updateLine(idx, "productId", e.target.value)}>
                <option value="">Select product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </Select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Qty</label>
              <Input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(idx, "quantity", e.target.value)} />
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-slate-500 mb-1">Unit Cost</label>
              <Input type="number" min="0" step="0.01" value={line.unitCost} onChange={(e) => updateLine(idx, "unitCost", e.target.value)} />
            </div>
            <div className="col-span-1">
              <button type="button" onClick={() => removeLine(idx)} className="text-red-500 text-sm h-9">
                ✕
              </button>
            </div>
          </div>
        ))}
        <button type="button" onClick={addLine} className="text-indigo-600 text-sm hover:underline">
          + Add another item
        </button>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Record Purchase"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
