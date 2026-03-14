
'use client';

import React, { useState, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Loader2, 
  Send, 
  FileUp, 
  ClipboardCheck, 
  FileText,
  X
} from 'lucide-react';
import { useFirestore, useStorage, addDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import type { UserProfile } from '@/lib/types';

const COMPLIANCE_TASKS = [
  "Monthly Bookkeeping",
  "VAT Filing",
  "PAYE Remittance",
  "Payroll Processing",
  "Bank Reconciliation",
  "Audit Preparation"
];

interface AccountantActionsProps {
  businessId: string;
  profile: UserProfile;
}

export default function AccountantActions({ businessId, profile }: AccountantActionsProps) {
  const firestore = useFirestore();
  const storage = useStorage();
  const { toast } = useToast();
  
  const [note, setNote] = useState('');
  const [task, setTask] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const logActivity = async (type: any, content: string, metadata: any = {}) => {
    if (!firestore) return;
    
    const feedCol = collection(firestore, `businesses/${businessId}/collaborationFeed`);
    const notifCol = collection(firestore, `businesses/${businessId}/notifications`);

    // Add to Feed
    addDocumentNonBlocking(feedCol, {
      businessId,
      type,
      content,
      metadata,
      createdBy: profile.id,
      createdByName: profile.name,
      timestamp: new Date().toISOString(),
      readBy: [profile.id]
    });

    // Add Notification for Owner
    addDocumentNonBlocking(notifCol, {
      title: 'Accountant Update',
      description: `${profile.name}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
      type: 'collaboration',
      priority: 'normal',
      link: '/collaboration',
      read: false,
      timestamp: new Date().toISOString()
    });
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setIsSubmitting(true);
    await logActivity('note', note.trim());
    setNote('');
    setIsSubmitting(false);
    toast({ title: "Note Shared", description: "The owner has been notified." });
  };

  const handleLogTask = async () => {
    if (!task) return;
    setIsSubmitting(true);
    await logActivity('status_update', `Completed task: ${task}`, { taskName: task });
    setTask('');
    setIsSubmitting(false);
    toast({ title: "Task Logged", description: "Progress updated successfully." });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({ variant: 'destructive', title: "File too large", description: "Maximum upload size is 10MB." });
        return;
      }
      setPendingFile(file);
    }
  };

  const confirmUpload = async () => {
    if (!pendingFile || !storage) return;
    setIsUploading(true);
    try {
      const storageRef = ref(storage, `collaboration/${businessId}/${Date.now()}_${pendingFile.name}`);
      const uploadResult = await uploadBytes(storageRef, pendingFile);
      const url = await getDownloadURL(uploadResult.ref);

      await logActivity('document', `Uploaded document: ${pendingFile.name}`, {
        fileName: pendingFile.name,
        fileUrl: url,
        fileType: pendingFile.type
      });

      setPendingFile(null);
      toast({ title: "Document Uploaded", description: "File is now in the collaboration vault." });
    } catch (e) {
      toast({ variant: 'destructive', title: "Upload Failed", description: "Could not save file to storage." });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-6 sticky top-24">
      <Card className="border-none shadow-sm overflow-hidden bg-primary/5 border-primary/10">
        <CardHeader className="bg-primary/10 border-b">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Compliance Logger
          </CardTitle>
          <CardDescription>Log completed professional tasks.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 space-y-4">
          <Select value={task} onValueChange={setTask}>
            <SelectTrigger className="bg-background">
              <SelectValue placeholder="Select task..." />
            </SelectTrigger>
            <SelectContent>
              {COMPLIANCE_TASKS.map(t => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            className="w-full h-10 gap-2" 
            disabled={!task || isSubmitting} 
            onClick={handleLogTask}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Log Task Completion
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Accountant's Notepad</CardTitle>
          <CardDescription>Direct guidance for the business owner.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder="Advice, queries, or reminders..." 
            className="min-h-[120px] bg-muted/20 text-xs"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button 
            className="w-full gap-2" 
            disabled={!note.trim() || isSubmitting}
            onClick={handleAddNote}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Share Note
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold">Document Vault</CardTitle>
          <CardDescription>Share reports, certificates, or receipts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            onChange={handleFileUpload}
          />
          
          {pendingFile ? (
            <div className="p-3 rounded-lg border bg-primary/5 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <span className="text-[10px] font-bold truncate">{pendingFile.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={confirmUpload} disabled={isUploading}>
                  {isUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setPendingFile(null)} disabled={isUploading}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full border-dashed gap-2 h-16 bg-muted/10 hover:bg-primary/5 hover:border-primary/30"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileUp className="h-5 w-5 text-muted-foreground" />
              <div className="flex flex-col items-start">
                <span className="text-xs font-bold">Upload Document</span>
                <span className="text-[9px] text-muted-foreground">PDF, JPEG, PNG (Max 10MB)</span>
              </div>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
