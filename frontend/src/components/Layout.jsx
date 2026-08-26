import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/inventory", label: "Inventory" },
  { to: "/pos", label: "POS / Sales" },
  { to: "/repairs", label: "Repairs" },
  { to: "/customers", label: "Customers" },
  { to: "/suppliers", label: "Suppliers" },
];

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="md:w-64 shrink-0 bg-slate-900 text-slate-100 flex md:flex-col">
        <div className="p-4 border-b border-slate-800">
          <h1 className="text-lg font-bold tracking-tight">📱 Mobile Shop</h1>
          <p className="text-xs text-slate-400 mt-1">Business Management</p>
        </div>
        <nav className="flex-1 flex md:flex-col overflow-x-auto md:overflow-visible">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium whitespace-nowrap border-l-4 md:border-l-4 border-transparent hover:bg-slate-800 transition-colors ${
                  isActive ? "bg-slate-800 border-indigo-500 text-white" : "text-slate-300"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          {isAdmin && (
            <NavLink
              to="/users"
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium whitespace-nowrap border-l-4 border-transparent hover:bg-slate-800 transition-colors ${
                  isActive ? "bg-slate-800 border-indigo-500 text-white" : "text-slate-300"
                }`
              }
            >
              Staff Users
            </NavLink>
          )}
        </nav>
        <div className="p-4 border-t border-slate-800 hidden md:block">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          <button
            onClick={handleLogout}
            className="mt-3 w-full text-sm bg-slate-800 hover:bg-slate-700 rounded px-3 py-2 transition-colors"
          >
            Log out
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 max-w-full overflow-x-auto">
        <Outlet />
      </main>
    </div>
  );
}
