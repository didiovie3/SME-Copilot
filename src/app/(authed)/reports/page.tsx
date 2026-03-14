
import type { Metadata } from 'next';
import ReportsClient from './reports-client';

export const metadata: Metadata = {
  title: 'Business Reports | Uruvia',
  description: 'Generate and export professional business reports.',
};

export default function ReportsPage() {
  return <ReportsClient />;
}
