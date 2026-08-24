import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button, Input, ErrorBanner, Card } from "../components/ui";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@mobileshop.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-950 px-4">
      <Card className="w-full max-w-sm p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">📱 Mobile Shop</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sign in to manage your shop</p>
        </div>
        <ErrorBanner message={error} />
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </Button>
        </form>
        <p className="text-xs text-slate-400 mt-4 text-center">
          Demo: admin@mobileshop.com / admin123 &nbsp;•&nbsp; staff@mobileshop.com / staff123
        </p>
      </Card>
    </div>
  );
}
