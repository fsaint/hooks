import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect to dashboard - auth will be checked there
  redirect('/dashboard');
}
