
'use client';

import React, { useState } from 'react';
import { 
  MessageCircle, 
  Search, 
  CheckCircle2, 
  Clock, 
  Send,
  Loader2,
  Building2,
  User,
  Inbox,
  Reply
} from 'lucide-react';
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, where, doc } from 'firebase/firestore';
import type { SupportMessage } from '@/lib/types';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdmin } from '@/hooks/use-admin';
import { useToast } from '@/hooks/use-toast';
import { logAdminAction } from '@/lib/admin-logger';

export default function AdminSupportInboxPage() {
  const firestore = useFirestore();
  const { profile: adminProfile } = useAdmin();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState('open');
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);

  const supportRef = useMemoFirebase(
    () => (firestore ? query(collection(firestore, 'support_messages'), orderBy('createdAt', 'desc')) : null),
    [firestore]
  );
  const { data: messages, isLoading } = useCollection<SupportMessage>(supportRef);

  const filteredMessages = (messages || []).filter(m => m.status === activeTab);

  const handleReply = async () => {
    if (!firestore || !selectedMessage || !adminProfile || !replyText.trim()) return;
    setIsSending(true);

    try {
      const msgRef = doc(firestore, 'support_messages', selectedMessage.id);
      
      await updateDocumentNonBlocking(msgRef, {
        status: 'resolved',
        replyMessage: replyText.trim(),
        repliedAt: new Date().toISOString(),
        repliedBy: adminProfile.uid
      });

      // Notify Business
      const notifRef = collection(firestore, `businesses/${selectedMessage.businessId}/notifications`);
      addDocumentNonBlocking(notifRef, {
        title: 'Support Response',
        description: `Agent ${adminProfile.name.split(' ')[0]}: ${replyText.trim().substring(0, 100)}...`,
        type: 'support',
        priority: 'high',
        link: '/dashboard',
        read: false,
        timestamp: new Date().toISOString()
      });

      // Log Admin Action
      await logAdminAction(firestore, { uid: adminProfile.uid, name: adminProfile.name }, {
        action: 'Support Ticket Resolved',
        targetType: 'user',
        targetId: selectedMessage.senderUid,
        targetName: selectedMessage.senderName,
        details: `Replied to ${selectedMessage.businessName}: ${replyText.substring(0, 50)}...`
      });

      toast({ title: "Response Sent", description: "The ticket has been resolved." });
      setSelectedMessage(null);
      setReplyText('');
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-[500px] w-full" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-primary" />
          Support Node
        </h1>
        <p className="text-muted-foreground text-sm">Review incoming queries and provide high-fidelity assistance to SMEs.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-background border h-12 mb-8">
          <TabsTrigger value="open" className="gap-2 px-6">
            <Clock className="h-4 w-4" />
            Open Issues
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 h-5 text-[10px]">
              {(messages || []).filter(m => m.status === 'open').length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="resolved" className="gap-2 px-6">
            <CheckCircle2 className="h-4 w-4" />
            Resolved
          </TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="m-0">
          <Card className="border-none shadow-sm bg-card/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Business / Sender</TableHead>
                    <TableHead>Message Preview</TableHead>
                    <TableHead>Received</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="h-32 text-center italic text-muted-foreground">
                        <Inbox className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        No pending support requests.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMessages.map((m) => (
                      <TableRow key={m.id} className="group hover:bg-muted/20">
                        <TableCell>
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5 font-bold text-xs">
                              <Building2 className="h-3 w-3 text-primary" /> {m.businessName}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                              <User className="h-2.5 w-2.5" /> {m.senderName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium text-muted-foreground leading-relaxed max-w-[400px] truncate">
                          "{m.message}"
                        </TableCell>
                        <TableCell className="text-[10px] font-bold text-muted-foreground">
                          {format(new Date(m.createdAt), 'MMM dd, HH:mm')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="ghost" className="h-8 gap-2" onClick={() => setSelectedMessage(m)}>
                            <Reply className="h-3.5 w-3.5" /> Reply
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved" className="m-0">
          <Card className="border-none shadow-sm bg-card/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Inquiry & Response</TableHead>
                    <TableHead>Resolved Date</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-bold text-xs">{m.businessName}</TableCell>
                      <TableCell>
                        <div className="space-y-1 py-2">
                          <p className="text-[10px] italic text-muted-foreground">Q: {m.message}</p>
                          <p className="text-xs font-bold text-primary">A: {m.replyMessage}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-[10px] text-muted-foreground">
                        {m.repliedAt ? format(new Date(m.repliedAt), 'MMM dd, HH:mm') : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge className="bg-accent/10 text-accent border-none h-5 px-2 text-[9px] uppercase font-black">Success</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* REPLY MODAL */}
      <Dialog open={!!selectedMessage} onOpenChange={(o) => !o && setSelectedMessage(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Support Resolution</DialogTitle>
            <DialogDescription>Providing assistance to {selectedMessage?.senderName} from {selectedMessage?.businessName}.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-6">
            <div className="p-4 rounded-xl bg-muted/30 border space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Original Message</p>
              <p className="text-sm font-medium leading-relaxed italic">"{selectedMessage?.message}"</p>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary">Response</label>
              <Textarea 
                placeholder="Type your reply here..." 
                className="min-h-[120px] bg-muted/10 text-sm"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedMessage(null)}>Cancel</Button>
            <Button className="gap-2 px-8" onClick={handleReply} disabled={isSending || !replyText.trim()}>
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send & Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
