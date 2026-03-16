import AdminBusinessDetailPage from './business-detail-view';

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ businessId: 'default' }];
}

export default function Page() {
  return <AdminBusinessDetailPage />;
}
