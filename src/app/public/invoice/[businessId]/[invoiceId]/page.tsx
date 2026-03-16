import PublicInvoicePage from './invoice-page';

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ businessId: 'default', invoiceId: 'default' }];
}

export default function Page() {
  return <PublicInvoicePage />;
}