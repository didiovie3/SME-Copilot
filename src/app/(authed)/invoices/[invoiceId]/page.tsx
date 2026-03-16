import InvoiceDetailPage from './invoice-detail-view';

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ invoiceId: 'default' }];
}

export default function Page() {
  return <InvoiceDetailPage />;
}