import ClientDetailPage from './client-detail-view';

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ clientId: 'default' }];
}

export default function Page() {
  return <ClientDetailPage />;
}