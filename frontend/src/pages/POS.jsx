import { Fragment, useEffect, useState, useCallback, useMemo } from "react";
import client from "../api/client";
import { Card, Button, Input, Select, Badge, ErrorBanner, EmptyState } from "../components/ui";

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

export default function POS() {
  const [tab, setTab] = useState("checkout"); // "checkout" | "history"

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">POS / Sales</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Checkout new sales and review sales history</p>
        </div>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-md p-1 text-sm">
          {["checkout", "history"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md font-medium capitalize transition-colors ${
                tab === t ? "bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-slate-100" : "text-slate-500"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "checkout" ? <Checkout /> : <SalesHistory />}
    </div>
  );
}

function Checkout() {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]); // [{ productId, name, sellingPrice, quantity, stock }]
  const [customerId, setCustomerId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = useCallback(() => {
    client.get("/products", { params: search ? { search } : {} }).then((res) => setProducts(res.data));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(loadProducts, 200);
    return () => clearTimeout(t);
  }, [loadProducts]);

  useEffect(() => {
    client.get("/customers").then((res) => setCustomers(res.data));
  }, []);

  function addToCart(product) {
    setError("");
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map((i) => (i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      if (product.quantity <= 0) return prev;
      return [...prev, { productId: product.id, name: product.name, sellingPrice: product.sellingPrice, quantity: 1, stock: product.quantity }];
    });
  }

  function updateQty(productId, quantity) {
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: Math.max(1, Math.min(quantity, i.stock)) } : i))
    );
  }

  function removeItem(productId) {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  }

  const subtotal = useMemo(() => cart.reduce((sum, i) => sum + i.sellingPrice * i.quantity, 0), [cart]);
  const total = Math.max(0, subtotal - Number(discount || 0) + Number(tax || 0));

  async function handleCheckout() {
    setError("");
    setSuccess(null);
    if (cart.length === 0) {
      setError("Cart is empty");
      return;
    }
    setSubmitting(true);
    try {
      const res = await client.post("/sales", {
        customerId: customerId || null,
        items: cart.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.sellingPrice })),
        discount: Number(discount || 0),
        tax: Number(tax || 0),
        paymentMethod,
      });
      setSuccess(res.data);
      setCart([]);
      setDiscount("0");
      setTax("0");
      setCustomerId("");
      loadProducts();
    } catch (err) {
      setError(err.response?.data?.error || "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-4 lg:col-span-2">
        <Input placeholder="Search products by name, brand, SKU or IMEI..." value={search} onChange={(e) => setSearch(e.target.value)} className="mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[520px] overflow-y-auto">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => addToCart(p)}
              disabled={p.quantity <= 0}
              className="text-left border border-slate-200 dark:border-slate-800 rounded-lg p-3 hover:border-indigo-400 hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="font-medium text-sm text-slate-800 dark:text-slate-200 line-clamp-2">{p.name}</div>
              <div className="text-xs text-slate-400 mt-1">{p.sku}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="font-semibold text-indigo-600">{money(p.sellingPrice)}</span>
                <Badge tone={p.quantity <= p.lowStockThreshold ? "warn" : "good"}>{p.quantity} left</Badge>
              </div>
            </button>
          ))}
          {products.length === 0 && <EmptyState message="No products match your search." />}
        </div>
      </Card>

      <Card className="p-4 flex flex-col">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100 mb-3">Cart</h3>
        <ErrorBanner message={error} />
        {success && (
          <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm rounded-md px-3 py-2 mb-4">
            Sale {success.invoiceNumber} completed — total {money(success.total)}
          </div>
        )}

        <div className="flex-1 overflow-y-auto space-y-2 mb-4 max-h-64">
          {cart.length === 0 && <p className="text-sm text-slate-400">Cart is empty. Click a product to add it.</p>}
          {cart.map((item) => (
            <div key={item.productId} className="flex items-center justify-between gap-2 text-sm border-b border-slate-100 dark:border-slate-800 pb-2">
              <div className="flex-1 min-w-0">
                <div className="truncate font-medium text-slate-700 dark:text-slate-200">{item.name}</div>
                <div className="text-xs text-slate-400">{money(item.sellingPrice)} each</div>
              </div>
              <input
                type="number"
                min="1"
                max={item.stock}
                value={item.quantity}
                onChange={(e) => updateQty(item.productId, Number(e.target.value))}
                className="w-14 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded px-1 py-1 text-center text-sm"
              />
              <span className="w-16 text-right font-medium">{money(item.sellingPrice * item.quantity)}</span>
              <button onClick={() => removeItem(item.productId)} className="text-red-500 hover:text-red-700 text-xs">
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3">
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Walk-in customer</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Discount</label>
              <Input type="number" min="0" step="0.01" value={discount} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tax</label>
              <Input type="number" min="0" step="0.01" value={tax} onChange={(e) => setTax(e.target.value)} />
            </div>
          </div>
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="mobile_wallet">Mobile Wallet</option>
          </Select>

          <div className="flex justify-between text-sm pt-1">
            <span className="text-slate-500">Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          <div className="flex justify-between text-lg font-bold text-slate-900 dark:text-slate-100">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>

          <Button className="w-full" onClick={handleCheckout} disabled={submitting || cart.length === 0}>
            {submitting ? "Processing..." : "Complete Sale"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function SalesHistory() {
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    client
      .get("/sales")
      .then((res) => setSales(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleRefund(sale) {
    if (!confirm(`Refund invoice ${sale.invoiceNumber}? This will restock the items.`)) return;
    await client.post(`/sales/${sale.id}/refund`);
    load();
  }

  if (loading) return <p className="text-slate-500 text-sm">Loading...</p>;

  return (
    <Card className="p-4">
      {sales.length === 0 ? (
        <EmptyState message="No sales recorded yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 pr-4">Invoice</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Items</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Payment</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {sales.map((s) => (
                <Fragment key={s.id}>
                  <tr className="border-b border-slate-100 dark:border-slate-800/50">
                    <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">{s.invoiceNumber}</td>
                    <td className="py-2 pr-4 text-slate-500 dark:text-slate-400">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="py-2 pr-4">{s.customer?.name || "Walk-in"}</td>
                    <td className="py-2 pr-4">
                      <button className="text-indigo-600 hover:underline text-xs" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                        {s.items.length} item(s)
                      </button>
                    </td>
                    <td className="py-2 pr-4 font-semibold">{money(s.total)}</td>
                    <td className="py-2 pr-4 capitalize text-slate-500 dark:text-slate-400">{s.paymentMethod.replace(/_/g, " ")}</td>
                    <td className="py-2 pr-4">
                      <Badge tone={s.status === "refunded" ? "refunded" : "good"}>{s.status}</Badge>
                    </td>
                    <td className="py-2 pr-4">
                      {s.status !== "refunded" && (
                        <button onClick={() => handleRefund(s)} className="text-red-600 hover:underline text-xs">
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === s.id && (
                    <tr className="bg-slate-50 dark:bg-slate-800/30">
                      <td colSpan={8} className="p-3">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-slate-500">
                              <th className="text-left py-1">Product</th>
                              <th className="text-left py-1">Qty</th>
                              <th className="text-left py-1">Unit Price</th>
                              <th className="text-left py-1">Line Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {s.items.map((it) => (
                              <tr key={it.id}>
                                <td className="py-1">{it.product?.name}</td>
                                <td className="py-1">{it.quantity}</td>
                                <td className="py-1">{money(it.unitPrice)}</td>
                                <td className="py-1">{money(it.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
