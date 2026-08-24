import { useEffect, useState, useCallback } from "react";
import client from "../api/client";
import { Card, Button, Input, Select, Badge, Modal, ErrorBanner, EmptyState } from "../components/ui";

const emptyForm = { name: "", email: "", password: "", role: "staff" };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    client
      .get("/auth/users")
      .then((res) => setUsers(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    try {
      await client.post("/auth/users", form);
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create user");
    }
  }

  async function toggleActive(u) {
    await client.patch(`/auth/users/${u.id}`, { active: !u.active });
    load();
  }

  async function toggleRole(u) {
    await client.patch(`/auth/users/${u.id}`, { role: u.role === "admin" ? "staff" : "admin" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Staff Users</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage who can access the system</p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setError("");
            setModalOpen(true);
          }}
        >
          + Add User
        </Button>
      </div>

      <Card className="p-4">
        {loading ? (
          <p className="text-slate-500 text-sm">Loading...</p>
        ) : users.length === 0 ? (
          <EmptyState message="No users found." />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800/50">
                  <td className="py-2 pr-4 font-medium text-slate-800 dark:text-slate-200">{u.name}</td>
                  <td className="py-2 pr-4 text-slate-600 dark:text-slate-300">{u.email}</td>
                  <td className="py-2 pr-4">
                    <Badge>{u.role}</Badge>
                  </td>
                  <td className="py-2 pr-4">
                    <Badge tone={u.active ? "good" : "danger"}>{u.active ? "active" : "disabled"}</Badge>
                  </td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    <button onClick={() => toggleRole(u)} className="text-indigo-600 hover:underline text-xs mr-3">
                      Make {u.role === "admin" ? "staff" : "admin"}
                    </button>
                    <button onClick={() => toggleActive(u)} className="text-red-600 hover:underline text-xs">
                      {u.active ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Staff User">
        <ErrorBanner message={error} />
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Name *</label>
            <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Email *</label>
            <Input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Password *</label>
            <Input required type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">Role</label>
            <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </Select>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Add User</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
