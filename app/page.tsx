import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect root path to /adp (our main ADP tool page)
  redirect('/adp');
}
