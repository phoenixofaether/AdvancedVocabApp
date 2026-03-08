import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { useLogout } from "../api/auth";

const NavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
  <Link
    to={to}
    className="px-3 py-1.5 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
    activeProps={{ className: "px-3 py-1.5 rounded-md text-sm font-medium text-gray-900 bg-gray-100" }}
  >
    {children}
  </Link>
);

const AuthenticatedLayout = () => {
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="text-xl font-bold text-gray-900 hover:text-gray-700 transition-colors">
            AdvancedVocab
          </Link>
          <nav className="flex gap-1">
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/sets">My Sets</NavLink>
            <NavLink to="/review">Review</NavLink>
            <NavLink to="/cambridge">Cambridge</NavLink>
            <NavLink to="/settings">Settings</NavLink>
          </nav>
        </div>
        <button
          onClick={() => logout.mutate()}
          className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          Sign out
        </button>
      </header>
      <main className="max-w-5xl mx-auto px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => {
    const hasToken = !!localStorage.getItem("accessToken");
    if (!hasToken) {
      throw redirect({ to: "/login" });
    }
  },
  component: AuthenticatedLayout,
});
