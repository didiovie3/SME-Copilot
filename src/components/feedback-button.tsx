
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  MessageSquarePlus, 
  Bug, 
  Lightbulb, 
  Zap, 
  Loader2,
  X
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { useUserProfile } from '@/hooks/use-user-profile';
import { useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

const feedbackSchema = z.object({
  type: z.enum(['bug', 'feature', 'improvement']),
  title: z.string().min(5, 'Title must be at least 5 characters.'),
  description: z.string().min(10, 'Please provide a more detailed description.'),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { profile, business, user } = useUserProfile();
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      type: 'improvement',
      title: '',
      description: '',
    },
  });

  const onSubmit = (values: FeedbackFormValues) => {
    if (!firestore || !user) return;

    setIsSubmitting(true);
    const feedbackRef = collection(firestore, 'feedback');

    addDocumentNonBlocking(feedbackRef, {
      ...values,
      userId: user.uid,
      userName: profile?.name || 'Anonymous User',
      businessId: profile?.businessId || 'N/A',
      businessName: business?.profile.name || 'Unassigned Business',
      status: 'pending',
      timestamp: new Date().toISOString(),
    });

    toast({
      title: 'Feedback Received',
      description: 'Thank you! Our team will review your report shortly.',
    });

    setIsSubmitting(false);
    setIsOpen(false);
    form.reset();
  };

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl shadow-primary/40 hover:scale-110 active:scale-95 transition-all z-50 p-0"
      >
        <MessageSquarePlus className="h-6 w-6" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              How can we improve?
            </DialogTitle>
            <DialogDescription>
              Your feedback helps Uruvia become the best navigator for your business.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Feedback Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bug">
                          <div className="flex items-center gap-2">
                            <Bug className="h-4 w-4 text-destructive" />
                            <span>Issue / Bug</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="feature">
                          <div className="flex items-center gap-2">
                            <MessageSquarePlus className="h-4 w-4 text-primary" />
                            <span>Feature Request</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="improvement">
                          <div className="flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-accent" />
                            <span>Suggestion</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Short Summary</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Error on inventory export" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Detailed Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please tell us exactly what happened or what you'd like to see..." 
                        className="min-h-[100px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Submit Report
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
