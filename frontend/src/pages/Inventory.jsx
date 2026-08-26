import { useEffect, useState, useCallback } from "react";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Card, Button, Input, Select, Badge, Modal, ErrorBanner, EmptyState } from "../components/ui";

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const emptyForm = {
  name: "",
  brand: "",
  category: "phone",
  sku: "",
  imei: "",
  costPrice: "",
  sellingPrice: "",
  quantity: "",
  lowStockThreshold: "3",
  supplierId: "",
};

export default function Inventory() {
  const { isAdmin } = useAuth();
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (category) params.category = category;
    if (lowStockOnly) params.lowStock = "true";
    client
      .get("/products", { params })
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }, [search, category, lowStockOnly]);

  useEffect(() => {
    client.get("/suppliers").then((res) => setSuppliers(res.data));
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

  function openEdit(p) {
    setEditing(p);
    setForm({
      name: p.name,
      brand: p.brand || "",
      category: p.category,
      sku: p.sku,
      imei: p.imei || "",
      costPrice: String(p.costPrice),
      sellingPrice: String(p.sellingPrice),
      quantity: String(p.quantity),
      lowStockThreshold: String(p.lowStockThreshold),
      supplierId: p.supplierId ? String(p.supplierId) : "",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const payload = {
      ...form,
      imei: form.imei || null,
      supplierId: form.supplierId || null,
    };
    try {
      if (editing) {
        await client.put(`/products/${editing.id}`, payload);
      } else {
        await client.post("/products", payload);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save product");
    }
  }

  async function handleDelete(p) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    await client.delete(`/products/${p.id}`);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Inventory</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Phones and accessories in stock</p>
        </div>
        <Button onClick={openCreate}>+ Add Product</Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <Input placeholder="Search by name, brand, SKU or IMEI..." value={search} onChange={(e) => setSearch(e.target.value)} className="md:max-w-xs" />
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="md:max-w-[160px]">
            <option value="">All categories</option>
            <option value="phone">Phones</option>
            <option value="accessory">Accessories</option>
          </Select>
          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
            Low stock only
          </label>
        </div>

        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : products.length === 0 ? (
          <EmptyState message="No products found." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-2 pr-4">Product</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">SKU / IMEI</th>
                  <th className="py-2 pr-4">Cost</th>
                  <th className="py-2 pr-4">Price</th>
                  <th className="py-2 pr-4">Stock</th>
                  <th className="py-2 pr-4">Supplier</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 dark:border-slate-800/50">
                    <td className="py-2 pr-4">
                      <div className="font-medium text-slate-800 dark:text-slate-200">{p.name}</div>
                      <div className="text-xs text-slate-400">{p.brand}</div>
                    </td>
                    <td className="py-2 pr-4 capitalize text-slate-600 dark:text-slate-300">{p.category}</td>
                    <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">
                      <div>{p.sku}</div>
                      {p.imei && <div className="text-xs">{p.imei}</div>}
                    </td>
                    <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{money(p.costPrice)}</td>
                    <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">{money(p.sellingPrice)}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={p.quantity <= p.lowStockThreshold ? "warn" : "good"}>{p.quantity}</Badge>
                    </td>
                    <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{p.supplier?.name || "—"}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">
                      <button onClick={() => openEdit(p)} className="text-indigo-600 hover:underline text-xs mr-3">
                        Edit
                      </button>
                      {isAdmin && (
                        <button onClick={() => handleDelete(p)} className="text-red-600 hover:underline text-xs">
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Product" : "Add Product"} wide>
        <ErrorBanner message={error} />
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Name *</label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Brand</label>
            <Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Category</label>
            <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              <option value="phone">Phone</option>
              <option value="accessory">Accessory</option>
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">SKU *</label>
            <Input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">IMEI (phones)</label>
            <Input value={form.imei} onChange={(e) => setForm({ ...form, imei: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Supplier</label>
            <Select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">— None —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Cost Price *</label>
            <Input required type="number" step="0.01" min="0" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Selling Price *</label>
            <Input required type="number" step="0.01" min="0" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Quantity *</label>
            <Input required type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Low Stock Threshold</label>
            <Input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{editing ? "Save Changes" : "Add Product"}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
