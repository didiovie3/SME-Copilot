
import type { Metadata } from 'next';
import DashboardClient from './dashboard-client';
import { FeedbackButton } from '@/components/feedback-button';

export const metadata: Metadata = {
  title: 'Dashboard | Uruvia',
  description: 'Your business overview.',
};

export default function DashboardPage() {
  return (
    <>
      <DashboardClient />
      <FeedbackButton />
    </>
  );
}
