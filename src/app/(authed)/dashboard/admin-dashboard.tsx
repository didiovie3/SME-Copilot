
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Business } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Download, Trash2, ArrowRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';

export default function AdminDashboard() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [businessToDelete, setBusinessToDelete] = useState<Business | null>(null);

  const businessesRef = useMemoFirebase(
    () => (firestore ? collection(firestore, 'businesses') : null),
    [firestore]
  );
  const { data: businesses, isLoading } = useCollection<Business>(businessesRef);

  const handleDeleteBusiness = () => {
    if (!firestore || !businessToDelete) return;

    const docRef = doc(firestore, 'businesses', businessToDelete.id);
    deleteDocumentNonBlocking(docRef);

    toast({
      title: 'Business Deleted',
      description: `${businessToDelete.profile.name} has been removed from the system.`,
    });
    setBusinessToDelete(null);
  };

  const handleExportAll = () => {
    if (!businesses || businesses.length === 0) return;

    const exportData = businesses.map(b => ({
      ID: b.id,
      'Business Name': b.profile.name,
      Industry: b.profile.industry,
      'Company Size': b.profile.companySize,
      Email: b.profile.email,
      Phone: b.profile.phone,
      TIN: b.profile.tin,
      CAC: b.profile.cac,
      Country: b.profile.country,
      State: b.profile.state,
      Address: b.profile.address,
      Platforms: b.profile.salesPlatforms?.join(', ') || 'None',
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Uruvia_Businesses_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Admin Control Center</h1>
          <p className="text-muted-foreground">Manage and oversee all registered SME businesses.</p>
        </div>
        <Button onClick={handleExportAll} className="gap-2">
          <Download className="h-4 w-4" />
          Export All Businesses
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Businesses</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{businesses?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg shadow-primary/5">
        <CardHeader>
          <CardTitle>Registered Businesses</CardTitle>
          <CardDescription>A complete directory of all businesses currently on the platform.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business Name</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!businesses || businesses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No businesses found.
                  </TableCell>
                </TableRow>
              ) : (
                businesses.map((business) => (
                  <TableRow key={business.id}>
                    <TableCell className="font-medium">{business.profile.name || 'Unnamed Business'}</TableCell>
                    <TableCell>{business.profile.industry || 'Not Specified'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{business.profile.companySize || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>
                      {business.profile.state}, {business.profile.country}
                    </TableCell>
                    <TableCell className="text-right flex items-center justify-end gap-2">
                      <Button 
                        asChild
                        variant="ghost" 
                        size="sm" 
                        className="gap-2"
                      >
                        <Link href={`/admin/business-details?id=${business.id}`}>
                          View Details
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setBusinessToDelete(business)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!businessToDelete} onOpenChange={(open) => !open && setBusinessToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{businessToDelete?.profile.name}</strong> from the database. This action cannot be undone and will remove all associated business profile information.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteBusiness} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
