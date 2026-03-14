
'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
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
    // Only alert for non-archived goods
    return inventory.filter(
      (item) => !item.isArchived && item.type === 'goods' && (item.currentStock ?? 0) <= (item.reorderPoint ?? 0)
    );
  }, [inventory]);

  if (isLoading) {
    return (
        <Card className="transition-all duration-500 border-none bg-card/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="text-destructive"/>
                  Inventory Alerts
              </CardTitle>
              <CardDescription>
                Checking for items that need reordering...
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </CardContent>
        </Card>
    )
  }

  if (lowStockItems.length === 0) {
    return (
      <Card className="transition-all duration-500 hover:shadow-xl hover:shadow-primary/5 border-none bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Inventory Alerts</CardTitle>
          <CardDescription>
            All your active inventory levels are looking good.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground p-8">
            No active items need reordering at the moment.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_12px_24px_-6px_rgba(0,0,0,0.1)] hover:shadow-destructive/15 border-none bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="text-destructive animate-pulse"/>
            Inventory Alerts
        </CardTitle>
        <CardDescription>
          These active items are at or below their reorder point.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Name</TableHead>
              <TableHead className="text-center">Current Stock</TableHead>
              <TableHead className="text-center">Reorder Point</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lowStockItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.itemName}</TableCell>
                <TableCell className="text-center font-bold text-destructive">
                  {item.currentStock}
                </TableCell>
                <TableCell className="text-center">{item.reorderPoint}</TableCell>
                <TableCell className="text-right">
                  <Badge variant="destructive" className="shadow-lg shadow-destructive/20">Reorder</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
