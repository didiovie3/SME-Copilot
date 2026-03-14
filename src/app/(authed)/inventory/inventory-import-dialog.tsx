'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import { useFirestore } from '@/firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Loader2, FileText } from 'lucide-react';
import { getNextIdRange, formatBinaryId } from '@/lib/id-generator';
import type { InventoryItem } from '@/lib/types';

interface InventoryImportDialogProps {
  businessId: string;
  ownerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const csvHeaders = ['itemName', 'type', 'category', 'currentStock', 'unitCost', 'reorderPoint', 'value'];


export default function InventoryImportDialog({ businessId, ownerId, open, onOpenChange }: InventoryImportDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      if (selectedFile.type !== 'text/csv') {
        setError('Invalid file type. Please upload a CSV file.');
        setFile(null);
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleImport = async () => {
    if (!file || !firestore) return;

    setIsImporting(true);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        const errors: string[] = [];
        let successCount = 0;
        
        if (data.length > 500) {
            setError('Please upload a file with 500 rows or less.');
            setIsImporting(false);
            return;
        }

        const validRows = data.filter(row => row.itemName && row.type && (row.type === 'goods' || row.type === 'service'));
        const goodsRows = validRows.filter(r => r.type === 'goods');
        const serviceRows = validRows.filter(r => r.type === 'service');

        try {
          const goodsStartCount = goodsRows.length > 0 ? await getNextIdRange(firestore, 'goods', goodsRows.length) : 0;
          const serviceStartCount = serviceRows.length > 0 ? await getNextIdRange(firestore, 'service', serviceRows.length) : 0;

          const batch = writeBatch(firestore);
          const inventoryCollectionRef = collection(firestore, `businesses/${businessId}/inventory_items`);

          let goodsIndex = 0;
          let serviceIndex = 0;

          validRows.forEach((row) => {
            let sequentialId;
            if (row.type === 'goods') {
              sequentialId = formatBinaryId('GD', goodsStartCount + (++goodsIndex));
            } else {
              sequentialId = formatBinaryId('SV', serviceStartCount + (++serviceIndex));
            }

            const newItemRef = doc(inventoryCollectionRef, sequentialId);
            const newItemData: InventoryItem = {
                id: sequentialId,
                businessId,
                ownerId,
                itemName: row.itemName,
                type: row.type as 'goods' | 'service',
                category: row.category || '',
                currentStock: row.type === 'goods' ? Number(row.currentStock) || 0 : undefined,
                unitCost: row.type === 'goods' ? Number(row.unitCost) || 0 : undefined,
                reorderPoint: row.type === 'goods' ? Number(row.reorderPoint) || 0 : undefined,
                value: row.type === 'service' ? Number(row.value) || 0 : undefined,
            };
            
            // Cleanup undefined
            Object.keys(newItemData).forEach(k => (newItemData[k as keyof InventoryItem] === undefined) && delete newItemData[k as keyof InventoryItem]);

            batch.set(newItemRef, newItemData);
            successCount++;
          });

          if (successCount > 0) {
            await batch.commit();
            toast({
                title: 'Import Successful',
                description: `Successfully imported ${successCount} items with sequential IDs.`
            });
          } else {
            toast({ variant: 'destructive', title: 'Import Failed', description: 'No valid items found in file.' });
          }
          
          setIsImporting(false);
          onOpenChange(false);
          setFile(null);
        } catch (e: any) {
          console.error(e);
          setError('An error occurred during ID allocation or database write.');
          setIsImporting(false);
        }
      },
      error: (err) => {
        console.error(err);
        setError('Failed to parse CSV file.');
        setIsImporting(false);
      }
    });
  };
  
  const handleClose = () => {
    if (!isImporting) {
        onOpenChange(false);
        setFile(null);
        setError(null);
    }
  }

  const handleDownloadTemplate = () => {
    const csvContent = csvHeaders.join(',');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'inventory_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import Inventory from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to bulk-add items to your inventory.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription className="text-sm">
                    Your CSV file must have these headers: <br/>
                    <code className="font-mono bg-muted p-1 rounded-sm text-xs break-all">itemName,type,category,currentStock,unitCost,reorderPoint,value</code>
                    <br/>
                    <Button variant="link" size="sm" onClick={handleDownloadTemplate} className="p-0 h-auto">Download template file</Button>
                </AlertDescription>
            </Alert>
            <div className="grid gap-2">
                <Label htmlFor="inventory-file">CSV File</Label>
                <Input id="inventory-file" type="file" accept=".csv,text/csv" onChange={handleFileChange} disabled={isImporting}/>
                {file && <p className="text-sm text-muted-foreground">Selected file: {file.name}</p>}
            </div>
             {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isImporting}>Cancel</Button>
          <Button onClick={handleImport} disabled={!file || isImporting}>
            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            {isImporting ? 'Importing...' : 'Start Import'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
