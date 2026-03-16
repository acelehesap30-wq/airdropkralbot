import { redirect } from 'next/navigation';

/**
 * Blueprint: Root redirects to /hub
 * CTA opens hub with panel=onboarding for first run
 */
export default function RootPage() {
  redirect('/hub');
}
