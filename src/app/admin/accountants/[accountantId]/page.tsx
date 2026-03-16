import AdminAccountantDetailPage from './accountant-detail-view';

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ accountantId: 'default' }];
}

export default function Page() {
  return <AdminAccountantDetailPage />;
}
