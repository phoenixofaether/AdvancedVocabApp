import { createFileRoute, redirect } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    const hasToken = !!localStorage.getItem('accessToken');
    if (hasToken) {
      throw redirect({ to: '/dashboard' });
    } else {
      throw redirect({ to: '/login' });
    }
  },
  component: () => null,
});
