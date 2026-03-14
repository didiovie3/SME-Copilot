
'use client';

import { useEffect, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useFirestore, setDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { getNextId } from '@/lib/id-generator';
import type { Client } from '@/lib/types';
import { User, Building2, Phone, Mail, MapPin } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Full name or business name is required.'),
  phone: z.string().min(1, 'Phone number is required.'),
  email: z.string().email().optional().or(z.literal('')),
  businessName: z.string().optional(),
  type: z.enum(['individual', 'business']),
  address: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface ClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  businessId: string;
  ownerId: string;
  client?: Client;
  onSuccess?: (clientId: string) => void;
}

export default function ClientDialog({ open, onOpenChange, businessId, ownerId, client, onSuccess }: ClientDialogProps) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      businessName: '',
      type: 'individual',
      address: '',
      notes: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(client ? {
        name: client.name,
        phone: client.phone,
        email: client.email || '',
        businessName: client.businessName || '',
        type: client.type,
        address: client.address || '',
        notes: client.notes || '',
      } : {
        name: '',
        phone: '',
        email: '',
        businessName: '',
        type: 'individual',
        address: '',
        notes: '',
      });
    }
  }, [open, client, form]);

  const onSubmit = async (values: FormValues) => {
    if (!firestore || !businessId) return;
    setIsSaving(true);

    try {
      const clientId = client?.id || await getNextId(firestore, 'client');
      const docRef = doc(firestore, `businesses/${businessId}/clients`, clientId);

      const clientData: Client = {
        id: clientId,
        businessId,
        ownerId,
        ...values,
        dateAdded: client?.dateAdded || new Date().toISOString(),
      };

      setDocumentNonBlocking(docRef, clientData);
      toast({ 
        title: client ? 'Client Updated' : 'Client Created', 
        description: `${values.name} has been saved.` 
      });
      
      onSuccess?.(clientId);
      onOpenChange(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to save client details.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{client ? 'Edit Client' : 'Register New Client'}</DialogTitle>
          <DialogDescription>Store customer details for easier invoicing and tracking.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="individual">Individual</SelectItem>
                        <SelectItem value="business">Corporate / Business</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+234..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Jane Smith" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {form.watch('type') === 'business' && (
              <FormField
                control={form.control}
                name="businessName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Smith Logistics Ltd" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address (Optional)</FormLabel>
                  <FormControl>
                    <Input type="email" placeholder="client@example.com" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Physical Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Client's office or home address" className="h-20" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Client'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
