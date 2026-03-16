'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BellRing, PackageSearch, AlertCircle } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { InventoryItem } from '@/lib/types';
import { useUserProfile } from '@/hooks/use-user-profile';
import { Skeleton } from '@/components/ui/skeleton';
import { useMemo } from 'react';

export default function InventoryAlerts() {
  const { profile, isLoading: isProfileLoading } = useUserProfile();
  const firestore = useFirestore();

  const businessId = profile?.businessId;

  const inventoryCollectionRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/inventory_items`) : null),
    [firestore, businessId]
  );
  const { data: inventory, isLoading: isInventoryLoading } = useCollection<InventoryItem>(inventoryCollectionRef);

  const isLoading = isProfileLoading || isInventoryLoading;

  const lowStockItems = useMemo(() => {
    if (!inventory) return [];
    return inventory.filter(
      (item) => !item.isArchived && item.type === 'goods' && (item.currentStock ?? 0) <= (item.reorderPoint ?? 0)
    );
  }, [inventory]);

  if (isLoading) {
    return <Skeleton className="h-[180px] w-full rounded-2xl" />;
  }

  if (lowStockItems.length === 0) {
    return (
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BellRing className="h-5 w-5 text-primary" />
            Operational Alerts
          </CardTitle>
          <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100/50">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <PackageSearch className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900">Inventory Health</h4>
              <p className="text-xs font-medium text-slate-500 leading-relaxed mt-0.5">
                Active inventory levels are looking good. No restock needed today.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-sm bg-white overflow-hidden">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
          <BellRing className="h-5 w-5 text-rose-500" />
          Operational Alerts
        </CardTitle>
        <CardDescription className="text-xs font-bold text-slate-500 uppercase tracking-wider">Action Required</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableBody>
            {lowStockItems.map((item) => (
              <TableRow key={item.id} className="hover:bg-slate-50/50 border-slate-100">
                <TableCell className="py-4 pl-6">
                  <div className="flex items-start gap-4">
                     <div className="p-2 bg-rose-50 rounded-lg mt-0.5">
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-black text-slate-900">{item.itemName}</h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                          Low Stock: {item.currentStock} remaining (Threshold: {item.reorderPoint})
                        </p>
                      </div>
                  </div>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <Badge variant="outline" className="text-[10px] font-black uppercase text-rose-500 border-rose-100 bg-rose-50 px-2.5">
                    Restock
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
