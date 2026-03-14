
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useCollection, useMemoFirebase, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { getNextId } from '@/lib/id-generator';
import type { Invoice, Business, InventoryItem, Client } from '@/lib/types';
import { Plus, Trash2, Calendar, User, Package, Calculator, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { ClientSelector } from '@/components/client-selector';

const itemSchema = z.object({
  itemName: z.string().min(1, 'Required'),
  quantity: z.coerce.number().min(1, 'Min 1'),
  unitPrice: z.coerce.number().min(0, 'Min 0'),
  total: z.number(),
});

const formSchema = z.object({
  date: z.string(),
  dueDate: z.string(),
  clientId: z.string().min(1, 'Please select a client.'),
  clientName: z.string().optional(),
  clientEmail: z.string().email().optional().or(z.literal('')),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  items: z.array(itemSchema).min(1, 'Add at least one item.'),
  taxRate: z.coerce.number().min(0).max(100).default(0),
  discount: z.coerce.number().min(0).default(0),
  paymentMethod: z.string().default('Bank Transfer'),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  ownerId: string;
  business: Business | null;
}

export default function InvoiceDialog({ open, onOpenChange, businessId, ownerId, business }: InvoiceDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const inventoryRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/inventory_items`) : null),
    [firestore, businessId]
  );
  const { data: inventory } = useCollection<InventoryItem>(inventoryRef);

  const clientsRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/clients`) : null),
    [firestore, businessId]
  );
  const { data: clients } = useCollection<Client>(clientsRef);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      dueDate: format(addDays(new Date(), 7), 'yyyy-MM-dd'),
      clientId: '',
      clientName: '',
      clientEmail: '',
      clientPhone: '',
      clientAddress: '',
      items: [{ itemName: '', quantity: 1, unitPrice: 0, total: 0 }],
      taxRate: 0,
      discount: 0,
      paymentMethod: 'Bank Transfer',
      notes: '',
      terms: 'Payment is due within 7 days. Thank you for your business.',
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'items',
  });

  const watchedItems = form.watch('items');
  const watchedTax = form.watch('taxRate');
  const watchedDiscount = form.watch('discount');
  const watchedClientId = form.watch('clientId');

  const subtotal = useMemo(() => {
    return watchedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }, [watchedItems]);

  const taxAmount = (subtotal * watchedTax) / 100;
  const total = subtotal + taxAmount - watchedDiscount;

  // Sync client details
  useEffect(() => {
    if (watchedClientId && clients) {
      const client = clients.find(c => c.id === watchedClientId);
      if (client) {
        form.setValue('clientName', client.name);
        form.setValue('clientEmail', client.email || '');
        form.setValue('clientPhone', client.phone);
        form.setValue('clientAddress', client.address || '');
      }
    }
  }, [watchedClientId, clients, form]);

  const handleItemSelect = (index: number, itemId: string) => {
    const item = inventory?.find(i => i.id === itemId);
    if (item) {
      const price = item.type === 'goods' ? (item.unitCost || 0) : (item.value || 0);
      update(index, {
        itemName: item.itemName,
        quantity: 1,
        unitPrice: price,
        total: price,
      });
    }
  };

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !businessId) return;
    setIsSaving(true);

    try {
      const invoiceId = await getNextId(firestore, 'invoice');
      const docRef = doc(firestore, `businesses/${businessId}/invoices`, invoiceId);

      const invoiceData: Invoice = {
        id: invoiceId,
        businessId,
        ownerId,
        clientId: values.clientId,
        invoiceNumber: invoiceId.replace('IV', 'INV'),
        date: values.date,
        dueDate: values.dueDate,
        status: 'draft',
        client: {
          name: values.clientName || '',
          email: values.clientEmail,
          phone: values.clientPhone,
          address: values.clientAddress,
        },
        items: values.items,
        subtotal,
        taxRate: values.taxRate,
        taxAmount,
        discount: values.discount,
        total,
        paymentMethod: values.paymentMethod,
        notes: values.notes,
        terms: values.terms,
        createdAt: new Date().toISOString(),
      };

      setDocumentNonBlocking(docRef, invoiceData);
      toast({ title: "Invoice Created", description: `Saved as ${invoiceData.invoiceNumber}` });
      onOpenChange(false);
      form.reset();
    } catch (e) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save invoice." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Create Professional Invoice
          </DialogTitle>
          <DialogDescription>Fill in the details below. Business branding will be applied automatically.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 px-6">
              <div className="space-y-8 py-4">
                {/* Header Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <User className="h-3 w-3" /> Client Details
                    </h4>
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Client</FormLabel>
                          <ClientSelector 
                            businessId={businessId}
                            ownerId={ownerId}
                            value={field.value}
                            onChange={field.onChange}
                          />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="p-4 bg-muted/20 rounded-xl border space-y-3">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground uppercase font-bold tracking-tighter">Phone</span>
                        <span className="font-medium">{form.watch('clientPhone') || '—'}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground uppercase font-bold tracking-tighter">Email</span>
                        <span className="font-medium truncate max-w-[150px]">{form.watch('clientEmail') || '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Calendar className="h-3 w-3" /> Invoice Timing
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Issue Date</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Due Date</FormLabel>
                            <FormControl><Input type="date" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method</FormLabel>
                          <FormControl><Input placeholder="e.g., Bank Transfer, POS" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Package className="h-3 w-3" /> Line Items
                    </h4>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ itemName: '', quantity: 1, unitPrice: 0, total: 0 })}>
                      <Plus className="h-3 w-3 mr-1" /> Add Manual Item
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {fields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-12 gap-3 items-end bg-muted/20 p-3 rounded-lg border">
                        <div className="col-span-5 space-y-2">
                          <FormLabel className="text-[10px]">Item Description</FormLabel>
                          <Select onValueChange={(v) => handleItemSelect(index, v)}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select from Inventory" />
                            </SelectTrigger>
                            <SelectContent>
                              {inventory?.map(i => (
                                <SelectItem key={i.id} value={i.id}>{i.itemName}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input 
                            placeholder="Or enter name manually" 
                            className="h-9 mt-1"
                            {...form.register(`items.${index}.itemName` as const)}
                          />
                        </div>
                        <div className="col-span-2">
                          <FormLabel className="text-[10px]">Qty</FormLabel>
                          <Input 
                            type="number" 
                            className="h-9"
                            {...form.register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                          />
                        </div>
                        <div className="col-span-2">
                          <FormLabel className="text-[10px]">Unit Price</FormLabel>
                          <Input 
                            type="number" 
                            className="h-9"
                            {...form.register(`items.${index}.unitPrice` as const, { valueAsNumber: true })}
                          />
                        </div>
                        <div className="col-span-2 text-right py-2 px-1">
                          <p className="text-[10px] text-muted-foreground uppercase">Total</p>
                          <p className="font-bold text-sm">
                            ₦{(form.watch(`items.${index}.quantity`) * form.watch(`items.${index}.unitPrice`)).toLocaleString()}
                          </p>
                        </div>
                        <div className="col-span-1">
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 border-t pt-8">
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Internal Notes</FormLabel>
                          <FormControl><Textarea placeholder="Not visible to client" className="h-20" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="terms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Terms & Conditions</FormLabel>
                          <FormControl><Textarea placeholder="Visible on PDF" className="h-20" {...field} /></FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10 space-y-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                      <Calculator className="h-3 w-3" /> Summary
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span className="font-medium">₦{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground whitespace-nowrap">Tax (%)</span>
                          <Input type="number" className="h-7 w-16 text-right" {...form.register('taxRate')} />
                        </div>
                        <span className="font-medium">₦{taxAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-muted-foreground">Discount (₦)</span>
                        <Input type="number" className="h-7 w-24 text-right" {...form.register('discount')} />
                      </div>
                      <div className="pt-4 border-t flex justify-between items-end">
                        <span className="font-black text-primary uppercase text-xs">Total Amount Due</span>
                        <span className="text-2xl font-black text-primary">₦{total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="p-6 border-t bg-muted/10">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" className="gap-2" disabled={isSaving}>
                {isSaving ? "Saving..." : "Generate Invoice"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
