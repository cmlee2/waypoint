import { redirect } from 'next/navigation';

export default function DashboardPage() {
  // Redirect to home page since dashboard is now the home page
  redirect('/');
}
