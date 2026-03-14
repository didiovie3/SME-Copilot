import { redirect } from 'next/navigation';

/**
 * Admin Root Redirect
 * Land admins on the overview dashboard by default.
 */
export default function AdminRoot() {
  redirect('/admin/overview');
}
