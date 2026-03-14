'use client';

import { useEffect, useState, useRef } from 'react';
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
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useFirestore } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { setDocumentNonBlocking } from '@/firebase';
import type { InventoryItem } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getNextId } from '@/lib/id-generator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Camera, Image as ImageIcon, X } from 'lucide-react';
import Image from 'next/image';

const formSchema = z.object({
  itemName: z.string().min(1, 'Item name is required.'),
  type: z.enum(['goods', 'service'], { required_error: 'You must select an item type.'}),
  category: z.string().min(1, 'Category is required.'),
  currentStock: z.coerce.number().optional(),
  unitCost: z.coerce.number().optional(),
  reorderPoint: z.coerce.number().optional(),
  value: z.coerce.number().optional(),
  imageUrl: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.type === 'goods') {
        if (data.currentStock === undefined || data.currentStock < 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Stock must be 0 or more.', path: ['currentStock']});
        }
        if (data.unitCost === undefined || data.unitCost < 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Cost must be 0 or more.', path: ['unitCost']});
        }
        if (data.reorderPoint === undefined || data.reorderPoint < 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Reorder point must be 0 or more.', path: ['reorderPoint']});
        }
    } else if (data.type === 'service') {
        if (data.value === undefined || data.value < 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Service value must be 0 or more.', path: ['value']});
        }
    }
});


type FormSchemaType = z.infer<typeof formSchema>;

interface InventoryDialogProps {
  businessId: string;
  ownerId: string;
  item?: InventoryItem; // if item is passed, it's an edit
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: string[];
}

export default function InventoryDialog({ businessId, ownerId, item, open, onOpenChange, categories = [] }: InventoryDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isUnitCostFocused, setIsUnitCostFocused] = useState(false);
  const [isValueFocused, setIsValueFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  
  const [internalCategories, setInternalCategories] = useState(categories);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemName: '',
      type: 'goods',
      category: '',
      currentStock: 0,
      unitCost: 0,
      reorderPoint: 0,
      value: 0,
      imageUrl: '',
    },
  });
  const { reset, clearErrors, setValue, watch } = form;

  const itemType = watch('type');
  const currentImageUrl = watch('imageUrl');

  useEffect(() => {
    if (open) {
      reset(item ? {
        itemName: item.itemName,
        type: item.type,
        category: item.category || '',
        currentStock: item.currentStock || 0,
        unitCost: item.unitCost || 0,
        reorderPoint: item.reorderPoint || 0,
        value: item.value || 0,
        imageUrl: item.imageUrl || '',
      } : {
        itemName: '',
        type: 'goods',
        category: '',
        currentStock: 0,
        unitCost: 0,
        reorderPoint: 0,
        value: 0,
        imageUrl: '',
      });
      clearErrors();
      setInternalCategories(categories);
    } else {
      setIsUnitCostFocused(false);
      setIsValueFocused(false);
    }
  }, [item, open, reset, clearErrors, categories]);

  const handleAddNewCategory = () => {
    const trimmedCategory = newCategoryName.trim();
    if (trimmedCategory) {
      if (!internalCategories.includes(trimmedCategory)) {
        setInternalCategories(prev => [...prev, trimmedCategory].sort());
      }
      setValue('category', trimmedCategory, { shouldValidate: true, shouldDirty: true });
      setIsNewCategoryDialogOpen(false);
      setNewCategoryName('');
    }
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
        setValue('imageUrl', reader.result as string, { shouldDirty: true });
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (values: FormSchemaType) => {
    if (!firestore || !businessId) {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Cannot save item. Missing connection details.',
        });
        return;
    }
    setIsSaving(true);

    try {
      const inventoryCollectionRef = collection(firestore, `businesses/${businessId}/inventory_items`);
      
      const data = {
        itemName: values.itemName,
        type: values.type,
        category: values.category,
        imageUrl: values.imageUrl || '',
        businessId,
        ownerId,
      };
      
      const metrics = values.type === 'goods'
        ? { currentStock: values.currentStock, unitCost: values.unitCost, reorderPoint: values.reorderPoint }
        : { value: values.value };

      if (item) {
        // Update existing item
        const itemRef = doc(inventoryCollectionRef, item.id);
        setDocumentNonBlocking(itemRef, { ...data, ...metrics, id: item.id }, { merge: true });
        toast({ title: 'Success', description: 'Inventory item updated.' });
      } else {
        // Create new item with sequential binary ID
        const generatedId = await getNextId(firestore, values.type);
        const itemRef = doc(inventoryCollectionRef, generatedId);
        setDocumentNonBlocking(itemRef, { ...data, ...metrics, id: generatedId }, { merge: true });
        toast({ title: 'Success', description: `New ${values.type} added as ${generatedId}.` });
      }

      setIsSaving(false);
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save inventory item.' });
      setIsSaving(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{item ? 'Edit Item' : 'Add New Item'}</DialogTitle>
            <DialogDescription>
              {item ? 'Update the details for this inventory item.' : 'Enter the details for the new inventory item.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
                <div className="flex justify-center mb-4">
                   <div 
                    className="relative group size-32 rounded-xl border-2 border-dashed border-muted-foreground/20 bg-muted/30 flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                    onClick={() => fileInputRef.current?.click()}
                   >
                     {currentImageUrl ? (
                       <>
                        <Image src={currentImageUrl} alt="Item Preview" fill className="object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <ImageIcon className="text-white h-8 w-8" />
                        </div>
                        <Button 
                          type="button" 
                          variant="destructive" 
                          size="icon" 
                          className="absolute top-1 right-1 h-6 w-6 rounded-full scale-0 group-hover:scale-100 transition-transform"
                          onClick={(e) => {
                            e.stopPropagation();
                            setValue('imageUrl', '');
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                       </>
                     ) : (
                       <div className="flex flex-col items-center gap-1 text-muted-foreground">
                         <Camera className="h-8 w-8" />
                         <span className="text-[10px] font-bold uppercase">Add Photo</span>
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

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel>Item Type</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          value={field.value}
                          className="flex gap-4"
                        >
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="goods" />
                            </FormControl>
                            <FormLabel className="font-normal">Goods</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value="service" />
                            </FormControl>
                            <FormLabel className="font-normal">Service</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="itemName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{itemType === 'goods' ? 'Item Name' : 'Service Name'}</FormLabel>
                      <FormControl>
                        <Input placeholder={itemType === 'goods' ? "e.g., Whole Wheat Flour" : "e.g., Consulting Hour"} {...field} />
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
                      <div className="flex items-center gap-2">
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {internalCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                            {field.value && !internalCategories.includes(field.value) && (
                                <SelectItem value={field.value}>
                                    {field.value}
                                </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          variant="outline"
                          className="whitespace-nowrap"
                          onClick={() => setIsNewCategoryDialogOpen(true)}
                        >
                          Add New
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {itemType === 'goods' ? (
                    <div className="grid grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="currentStock"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Current Stock</FormLabel>
                            <FormControl>
                            <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="unitCost"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Unit Cost (₦)</FormLabel>
                            <FormControl>
                            <Input
                                {...field}
                                type={isUnitCostFocused ? 'number' : 'text'}
                                onFocus={() => setIsUnitCostFocused(true)}
                                onBlur={(e) => {
                                    setIsUnitCostFocused(false);
                                    field.onBlur();
                                }}
                                step="any"
                                value={
                                    isUnitCostFocused
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
                        name="reorderPoint"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Reorder Point</FormLabel>
                            <FormControl>
                            <Input type="number" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    </div>
                ) : (
                    <FormField
                        control={form.control}
                        name="value"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Service Value (₦)</FormLabel>
                            <FormControl>
                            <Input
                                {...field}
                                type={isValueFocused ? 'number' : 'text'}
                                onFocus={() => setIsValueFocused(true)}
                                onBlur={(e) => {
                                    setIsValueFocused(false);
                                    field.onBlur();
                                }}
                                step="any"
                                value={
                                    isValueFocused
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
                )}
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
      <Dialog open={isNewCategoryDialogOpen} onOpenChange={setIsNewCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>
                Enter the name for the new category. This will be added to your list of categories upon saving.
                </DialogDescription>
            </DialogHeader>
            <Input
                placeholder="e.g., Marketing Expenses"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddNewCategory();
                    }
                }}
            />
            <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" onClick={() => setNewCategoryName('')}>Cancel</Button>
                </DialogClose>
                <Button onClick={handleAddNewCategory} disabled={!newCategoryName.trim()}>
                  Set Category
                </Button>
            </DialogFooter>
          </DialogContent>
      </Dialog>
    </>
  );
}
