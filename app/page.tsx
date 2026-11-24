import { redirect } from 'next/navigation';

// The app starts at the intake.
export default function Home() {
  redirect('/intake');
}
