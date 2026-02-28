import { createFileRoute } from '@tanstack/react-router';
import { useCurrentUser } from '../../api/auth';

export const Route = createFileRoute('/_authenticated/dashboard')({
  component: DashboardPage,
});

function DashboardPage() {
  const { data: user } = useCurrentUser();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome{user?.displayName ? `, ${user.displayName}` : ''}
        </h1>
        <p className="text-gray-500 mt-1">Your vocabulary sets</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
        <p className="text-lg">No vocab sets yet.</p>
        <p className="text-sm mt-1">Create your first set to get started.</p>
      </div>
    </div>
  );
}
