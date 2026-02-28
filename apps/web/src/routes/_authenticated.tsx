import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { useLogout } from '../api/auth';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const hasToken = !!localStorage.getItem('accessToken');
    if (!hasToken) {
      throw redirect({ to: '/login' });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
        <span className="text-xl font-bold text-gray-900">AdvancedVocab</span>
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
}
