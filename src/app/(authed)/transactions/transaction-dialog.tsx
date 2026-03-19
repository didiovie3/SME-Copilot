
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useFirestore, useCollection, useMemoFirebase, useDoc, setDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getNextId } from '@/lib/id-generator';
import type { InventoryItem, SoldItem, Business, Client } from '@/lib/types';
import { Plus, Trash2, Camera, Receipt, X, Sparkles, Lock, User } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { EXPENSE_CATEGORIES } from '@/lib/constants';
import { useTier } from '@/hooks/use-tier';
import { format, addDays, addMonths } from 'date-fns';
import { ClientSelector } from '@/components/client-selector';

const formSchema = z.object({
  amount: z.coerce.number().min(0, 'Amount cannot be negative.'),
  category: z.string().optional(),
  paymentMethod: z.enum(['cash', 'transfer', 'pos']),
  description: z.string().optional(),
  extraDiscount: z.coerce.number().optional(),
  clientId: z.string().optional(),
  clientName: z.string().optional(),
  clientPhone: z.string().optional(),
  clientOrigin: z.string().optional(),
  receiptUrl: z.string().optional(),
  isRecurring: z.boolean().default(false),
  frequency: z.enum(['weekly', 'monthly', 'quarterly']).optional(),
  expenseName: z.string().optional(),
});

type FormSchemaType = z.infer<typeof formSchema>;

interface TransactionDialogProps {
  businessId: string;
  ownerId: string;
  type: 'income' | 'expense';
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TransactionDialog({ businessId, ownerId, type, open, onOpenChange }: TransactionDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { isProOrAbove } = useTier();
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [soldItems, setSoldItems] = useState<SoldItem[]>([]);
  const [currentItemId, setCurrentItemId] = useState<string | undefined>();
  const [currentQuantity, setCurrentQuantity] = useState<number>(1);

  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const [isExtraDiscountFocused, setIsExtraDiscountFocused] = useState(false);

  const inventoryCollectionRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/inventory_items`) : null),
    [firestore, businessId]
  );
  const { data: inventory, isLoading: isInventoryLoading } = useCollection<InventoryItem>(inventoryCollectionRef);
  
  const clientsRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/clients`) : null),
    [firestore, businessId]
  );
  const { data: clients } = useCollection<Client>(clientsRef);

  const businessRef = useMemoFirebase(
    () => (firestore && businessId ? doc(firestore, 'businesses', businessId) : null),
    [firestore, businessId]
  );
  const { data: business, isLoading: isBusinessLoading } = useDoc<Business>(businessRef);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amount: 0,
      category: '',
      paymentMethod: 'pos',
      description: '',
      extraDiscount: 0,
      clientId: '',
      clientName: '',
      clientPhone: '',
      clientOrigin: undefined,
      receiptUrl: '',
      isRecurring: false,
      frequency: 'monthly',
      expenseName: '',
    },
  });

  const { watch, setValue, reset, clearErrors } = form;
  const watchedExtraDiscount = watch('extraDiscount');
  const currentReceiptUrl = watch('receiptUrl');
  const isRecurring = watch('isRecurring');
  const watchedClientId = watch('clientId');
  
  const selectedInventoryItem = useMemo(() => {
    return inventory?.find(i => i.id === currentItemId);
  }, [inventory, currentItemId]);

  useEffect(() => {
    if (open) {
      reset({
        amount: 0,
        category: '',
        paymentMethod: 'pos',
        description: '',
        extraDiscount: 0,
        clientId: '',
        clientName: '',
        clientPhone: '',
        clientOrigin: undefined,
        receiptUrl: '',
        isRecurring: false,
        frequency: 'monthly',
        expenseName: '',
      });
      setSoldItems([]);
      setCurrentItemId(undefined);
      setCurrentQuantity(1);
      clearErrors();
    } else {
        setIsAmountFocused(false);
        setIsExtraDiscountFocused(false);
    }
  }, [open, reset, clearErrors]);

  useEffect(() => {
    if (type === 'income') {
      const itemsTotal = soldItems.reduce((total, item) => total + (item.unitCost * item.quantity), 0);
      const extra = watchedExtraDiscount || 0;
      const finalAmount = itemsTotal + extra;
      setValue('amount', finalAmount >= 0 ? finalAmount : 0, { shouldValidate: true });
    }
  }, [soldItems, watchedExtraDiscount, setValue, type]);

  // Sync client details if relational ID is picked
  useEffect(() => {
    if (watchedClientId && clients) {
      const client = clients.find(c => c.id === watchedClientId);
      if (client) {
        setValue('clientName', client.name);
        setValue('clientPhone', client.phone);
      }
    }
  }, [watchedClientId, clients, setValue]);

  const handleAddItem = () => {
    if (!currentItemId || !inventory) return;
    const itemToAdd = inventory.find(i => i.id === currentItemId);
    if (!itemToAdd) return;

    if (itemToAdd.type === 'goods') {
      if (currentQuantity > (itemToAdd.currentStock ?? 0)) {
          toast({
              variant: 'destructive',
              title: 'Not enough stock',
              description: `Only ${itemToAdd.currentStock} of ${itemToAdd.itemName} available.`,
          });
          return;
      }
    }

    setSoldItems(prev => [...prev, {
        itemId: itemToAdd.id,
        itemName: itemToAdd.itemName,
        quantity: currentQuantity,
        unitCost: itemToAdd.type === 'goods' ? (itemToAdd.unitCost || 0) : (itemToAdd.value || 0)
    }]);

    setCurrentItemId(undefined);
    setCurrentQuantity(1);
  };

  const handleRemoveItem = (itemId: string) => {
    setSoldItems(prev => prev.filter(item => item.itemId !== itemId));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Please upload an image smaller than 1MB.',
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setValue('receiptUrl', reader.result as string, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };


  const onSubmit = async (values: FormSchemaType) => {
    if (!firestore || !businessId) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Cannot save transaction. Missing connection details.',
      });
      return;
    }

    // Strict Validation for Expenses
    if (type === 'expense') {
      if (!values.category || values.category.trim() === '') {
        form.setError('category', { message: 'Category is required for an expense.' });
        return;
      }
      if (values.amount <= 0) {
        toast({
          variant: 'destructive',
          title: 'Incomplete Report',
          description: 'Please provide an expense amount greater than zero.',
        });
        return;
      }
      if (values.isRecurring && !values.expenseName?.trim()) {
        form.setError('expenseName', { message: 'Label is required for recurring automation.' });
        return;
      }
    }

    // Strict Validation for Income/Sales
    if (type === 'income') {
      if (soldItems.length === 0 && values.amount <= 0) {
        toast({
          variant: 'destructive',
          title: 'Incomplete Sale',
          description: 'Please add at least one item or provide a manual amount.',
        });
        return;
      }
      if (values.amount <= 0) {
        toast({
          variant: 'destructive',
          title: 'Invalid Sale',
          description: 'The final sale amount must be greater than zero.',
        });
        return;
      }
    }

    setIsSaving(true);
    
    try {
      // Generate sequential ID based on type (TC for income, TD for expense)
      const tdId = await getNextId(firestore, type);
      const transactionsCollectionRef = collection(firestore, `businesses/${businessId}/transactions`);

      // If it's an inventory sale, update the stock for all items
      if (type === 'income' && soldItems.length > 0) {
        soldItems.forEach(soldItem => {
          const inventoryItem = inventory?.find(i => i.id === soldItem.itemId);
          if (inventoryItem && inventoryItem.type === 'goods') {
            const itemRef = doc(firestore, `businesses/${businessId}/inventory_items`, soldItem.itemId);
            const newStock = (inventoryItem.currentStock || 0) - soldItem.quantity;
            updateDocumentNonBlocking(itemRef, { currentStock: newStock });
          }
        });
      }

      // Handle category data
      let categoryName = '';
      let categoryGroup = '';

      if (type === 'income') {
        categoryName = soldItems.length > 0 ? 'Product Sale' : 'Other Income';
        categoryGroup = 'Revenue';
      } else {
        categoryName = values.category!;
        const matchedGroup = EXPENSE_CATEGORIES.find(g => g.items.includes(categoryName));
        categoryGroup = matchedGroup?.group || 'Other';
      }

      // Log the actual transaction occurring now
      const rawData = {
        ...values,
        id: tdId,
        ownerId,
        category: categoryName,
        categoryName,
        categoryGroup,
        businessId,
        type,
        timestamp: new Date().toISOString(),
        items: soldItems.length > 0 ? soldItems : undefined,
      };
      
      const dataToSave = Object.fromEntries(Object.entries(rawData).filter(([k, v]) => v !== undefined && v !== '' && k !== 'isRecurring' && k !== 'frequency' && k !== 'expenseName'));

      setDocumentNonBlocking(doc(transactionsCollectionRef, tdId), dataToSave, { merge: true });

      // Save recurring template if requested
      if (type === 'expense' && values.isRecurring && values.frequency) {
        const recurringRef = collection(firestore, `businesses/${businessId}/recurring_expenses`);
        
        let nextDate = new Date();
        if (values.frequency === 'weekly') nextDate = addDays(nextDate, 7);
        else if (values.frequency === 'monthly') nextDate = addMonths(nextDate, 1);
        else if (values.frequency === 'quarterly') nextDate = addMonths(nextDate, 3);

        addDocumentNonBlocking(recurringRef, {
          businessId,
          ownerId,
          expenseName: values.expenseName,
          categoryGroup,
          categoryName,
          amount: values.amount,
          frequency: values.frequency,
          nextDueDate: nextDate.toISOString(),
          paymentMethod: values.paymentMethod,
          notes: values.description || '',
          isActive: true,
          createdAt: new Date().toISOString()
        });
        
        toast({ title: 'Success', description: 'Automation active! Future expenses will log automatically.' });
      } else {
        toast({ title: 'Success', description: `New ${type} logged as ${tdId}.` });
      }

      setIsSaving(false);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to complete transaction.' });
      setIsSaving(false);
    }
  };

  const originOptions = useMemo(() => {
    const platforms = business?.profile.salesPlatforms ?? [];
    const options = ['Walk-in', ...platforms];
    return [...new Set(options)];
  }, [business]);

  const title = type === 'income' ? 'Log Sale' : 'Log Expense';
  const description = type === 'income' ? 'Record a new sale or income.' : 'Record a new business expense.';
  const itemsSubtotal = soldItems.reduce((total, item) => total + (item.unitCost * item.quantity), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
              {/* Only show receipt image upload for Expenses */}
              {type === 'expense' && (
                <div className="flex flex-col items-center gap-2 mb-2">
                  <FormLabel>Proof / Receipt (Optional)</FormLabel>
                  <div 
                    className="relative group size-24 rounded-lg border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {currentReceiptUrl ? (
                      <>
                        <Image src={currentReceiptUrl} alt="Receipt Preview" fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Camera className="text-white h-6 w-6" />
                        </div>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon" 
                          className="absolute top-1 right-1 h-5 w-5 rounded-full scale-0 group-hover:scale-100 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            setValue('receiptUrl', '');
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-0.5 text-muted-foreground">
                        <Camera className="h-6 w-6" />
                        <span className="text-[8px] font-bold uppercase tracking-tighter">Attach File</span>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*" 
                    onChange={handleImageChange} 
                  />
                </div>
              )}

              {type === 'income' && (
                <>
                  <div className="space-y-2">
                    <FormLabel className="flex items-center gap-2">
                      <User className="h-3.5 w-3.5 text-primary" />
                      Client Details
                    </FormLabel>
                    <ClientSelector 
                      businessId={businessId}
                      ownerId={ownerId}
                      value={watchedClientId}
                      onChange={(id) => setValue('clientId', id)}
                    />
                  </div>

                  <div className="space-y-2">
                      <FormLabel>Items Sold</FormLabel>
                      <div className="grid grid-cols-6 gap-2">
                          <Select onValueChange={setCurrentItemId} value={currentItemId || ''} disabled={isInventoryLoading}>
                              <FormControl>
                                  <SelectTrigger className="col-span-3">
                                      <SelectValue placeholder="Select an item" />
                                  </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  {inventory?.map(item => (
                                  <SelectItem key={item.id} value={item.id} disabled={soldItems.some(i => i.itemId === item.id) || (item.type === 'goods' && (item.currentStock || 0) <= 0)}>
                                      {item.itemName} {item.type === 'goods' ? `(${item.currentStock} in stock)` : '(Service)'}
                                  </SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                          <Input 
                              type="number" 
                              placeholder="Qty"
                              value={currentQuantity} 
                              onChange={e => setCurrentQuantity(Number(e.target.value))} 
                              min="1" 
                              className="col-span-1"
                              disabled={!currentItemId}
                          />
                          <Button type="button" onClick={handleAddItem} disabled={!currentItemId} className="col-span-2">
                              <Plus className="mr-2 h-4 w-4" /> Add Item
                          </Button>
                      </div>
                  </div>
                  
                  {soldItems.length > 0 && (
                       <ScrollArea className="h-24 w-full pr-4">
                          <div className="space-y-2">
                              {soldItems.map(item => (
                                  <div key={item.itemId} className="flex justify-between items-center text-sm p-2 bg-muted rounded-md">
                                      <div className="flex flex-col">
                                          <span className="font-medium">{item.itemName}</span>
                                          <span className="text-muted-foreground">Qty: {item.quantity} @ ₦{item.unitCost.toLocaleString()}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                          <span className="font-medium">₦{(item.unitCost * item.quantity).toLocaleString()}</span>
                                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveItem(item.itemId)}>
                                              <Trash2 className="h-4 w-4 text-destructive" />
                                          </Button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                       </ScrollArea>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                      <FormItem>
                          <FormLabel>Subtotal</FormLabel>
                          <FormControl>
                              <Input readOnly value={`₦${itemsSubtotal.toLocaleString('en-US')}`} className="bg-muted" />
                          </FormControl>
                      </FormItem>
                       <FormField
                          control={form.control}
                          name="extraDiscount"
                          render={({ field }) => (
                              <FormItem>
                                  <FormLabel>Extra Fee / Discount (-)</FormLabel>
                                  <FormControl>
                                      <Input
                                          {...field}
                                          type={isExtraDiscountFocused ? 'number' : 'text'}
                                          step="any"
                                          placeholder="0"
                                          onFocus={() => setIsExtraDiscountFocused(true)}
                                          onBlur={(e) => {
                                              setIsExtraDiscountFocused(false);
                                              field.onBlur();
                                          }}
                                          value={
                                              isExtraDiscountFocused
                                                  ? field.value || ''
                                                  : (field.value || 0).toLocaleString('en-US')
                                          }
                                          onChange={(e) => {
                                              field.onChange(e.target.valueAsNumber || 0);
                                          }}
                                      />
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                          )}
                      />
                  </div>
                   <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Final Sale Amount</FormLabel>
                          <FormControl>
                              <Input readOnly {...field} value={`₦${field.value.toLocaleString('en-US')}`} className="font-bold text-lg bg-muted" />
                          </FormControl>
                          <FormMessage />
                          </FormItem>
                      )}
                  />
                   <div className="grid grid-cols-2 gap-4">
                      <FormField
                          control={form.control}
                          name="clientName"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Client Name (Optional)</FormLabel>
                              <FormControl>
                                  <Input placeholder="Enter client's name" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                       <FormField
                          control={form.control}
                          name="clientPhone"
                          render={({ field }) => (
                              <FormItem>
                              <FormLabel>Client Phone (Optional)</FormLabel>
                              <FormControl>
                                  <Input placeholder="Enter client's phone" {...field} />
                              </FormControl>
                              <FormMessage />
                              </FormItem>
                          )}
                      />
                  </div>
                   <FormField
                      control={form.control}
                      name="clientOrigin"
                      render={({ field }) => (
                          <FormItem>
                          <FormLabel>Client Origin</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isBusinessLoading}>
                              <FormControl>
                              <SelectTrigger>
                                  <SelectValue placeholder={isBusinessLoading ? "Loading origins..." : "Select the client origin"} />
                              </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                  {originOptions.map(option => (
                                      <SelectItem key={option} value={option.toLowerCase().replace(/\s+/g, '-')}>{option}</SelectItem>
                                  ))}
                              </SelectContent>
                          </Select>
                          <FormMessage />
                          </FormItem>
                      )}
                      />
                </>
              )}

              {type === 'expense' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (₦)</FormLabel>
                          <FormControl>
                            <Input
                                {...field}
                                type={isAmountFocused ? 'number' : 'text'}
                                step="any"
                                onFocus={() => setIsAmountFocused(true)}
                                onBlur={(e) => {
                                    setIsAmountFocused(false);
                                    field.onBlur();
                                }}
                                value={
                                    isAmountFocused
                                    ? field.value || ''
                                    : (field.value || 0).toLocaleString('en-US')
                                }
                                onChange={(e) => {
                                    field.onChange(e.target.valueAsNumber || 0);
                                }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {EXPENSE_CATEGORIES.map((group) => (
                                <SelectGroup key={group.group}>
                                  <SelectLabel>{group.group}</SelectLabel>
                                  {group.items.map((item) => (
                                    <SelectItem key={item} value={item}>
                                      {item}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* RECURRING EXPENSE SECTION */}
                  <div className={cn(
                    "p-4 rounded-xl border transition-all duration-300",
                    isRecurring ? "bg-primary/5 border-primary/20" : "bg-muted/20"
                  )}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <FormLabel className="text-sm font-bold">Automate Expense</FormLabel>
                          {!isProOrAbove && <Lock className="h-3 w-3 text-muted-foreground" />}
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Log automatically in future</p>
                      </div>
                      <FormField
                        control={form.control}
                        name="isRecurring"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Switch 
                                checked={field.value} 
                                onCheckedChange={field.onChange} 
                                disabled={!isProOrAbove}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {isRecurring && (
                      <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="expenseName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Expense Label</FormLabel>
                                <FormControl>
                                  <Input placeholder="e.g., Monthly Rent" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name="frequency"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-xs">Frequency</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="weekly">Weekly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="bg-background/50 p-2 rounded-lg border border-primary/10 flex items-start gap-2">
                          <Sparkles className="h-3 w-3 text-primary mt-0.5" />
                          <p className="text-[10px] text-muted-foreground leading-relaxed italic">
                            Harbor & Co. Copilot will automatically log this ₦{form.getValues('amount').toLocaleString()} expense 
                            every {form.getValues('frequency') || 'month'} starting from tomorrow.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              <FormField
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Method</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a payment method" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pos">Point of Sale (POS)</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={type === 'income' ? "" : 'e.g., Receipt number, purpose...'}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter className="pt-4">
              <DialogClose asChild>
                <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
