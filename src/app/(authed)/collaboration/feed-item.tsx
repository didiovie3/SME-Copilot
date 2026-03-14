
'use client';

import React, { useState } from 'react';
import { 
  Card, 
  CardContent 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Flag, 
  ClipboardCheck, 
  MessageSquare, 
  Download, 
  ChevronRight,
  ShieldCheck,
  Send,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc, arrayUnion } from 'firebase/firestore';
import type { CollaborationItem } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface FeedItemProps {
  item: CollaborationItem;
  businessId: string;
  currentUserId: string;
}

export default function FeedItem({ item, businessId, currentUserId }: FeedItemProps) {
  const firestore = useFirestore();
  const [reply, setReply] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const isUnread = !item.readBy?.includes(currentUserId);

  const handleRead = () => {
    if (!firestore || !isUnread) return;
    const docRef = doc(firestore, `businesses/${businessId}/collaborationFeed`, item.id);
    updateDocumentNonBlocking(docRef, { readBy: arrayUnion(currentUserId) });
  };

  const handleAddReply = async () => {
    if (!firestore || !reply.trim()) return;
    setIsReplying(true);
    const docRef = doc(firestore, `businesses/${businessId}/collaborationFeed`, item.id);
    
    await updateDocumentNonBlocking(docRef, {
      replies: arrayUnion({
        content: reply.trim(),
        createdBy: currentUserId,
        createdByName: 'Business Owner', // In a real app, fetch the current user's name
        timestamp: new Date().toISOString()
      })
    });

    setReply('');
    setIsReplying(false);
  };

  const getIcon = () => {
    switch (item.type) {
      case 'flag': return <Flag className="h-4 w-4 text-orange-600" />;
      case 'document': return <FileText className="h-4 w-4 text-blue-600" />;
      case 'status_update': return <ClipboardCheck className="h-4 w-4 text-emerald-600" />;
      case 'review_complete': return <ShieldCheck className="h-4 w-4 text-primary" />;
      default: return <MessageSquare className="h-4 w-4 text-slate-600" />;
    }
  };

  const getBg = () => {
    if (isUnread) return "bg-white shadow-md border-primary/20 ring-1 ring-primary/5";
    return "bg-card/50 border-border opacity-90";
  };

  return (
    <Card 
      className={cn("transition-all duration-500 overflow-hidden", getBg())}
      onMouseEnter={handleRead}
    >
      <CardContent className="p-4 sm:p-6">
        <div className="flex gap-4">
          <div className={cn(
            "p-3 rounded-2xl h-fit shrink-0",
            item.type === 'flag' ? "bg-orange-500/10" : "bg-muted"
          )}>
            {getIcon()}
          </div>
          
          <div className="flex-1 min-w-0 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-primary tracking-tighter">{item.createdByName}</span>
                {isUnread && <span className="size-1.5 rounded-full bg-primary animate-pulse" />}
              </div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
              </span>
            </div>

            <p className="text-sm leading-relaxed text-foreground/80 font-medium">
              {item.content}
            </p>

            {/* Type Specific Context */}
            {item.type === 'flag' && item.metadata?.transactionId && (
              <Button asChild variant="outline" size="sm" className="h-8 text-[10px] font-bold gap-2 bg-background">
                <Link href={`/transactions?search=${item.metadata.transactionId}`}>
                  View Transaction Details <ChevronRight className="h-3 w-3" />
                </Link>
              </Button>
            )}

            {item.type === 'document' && item.metadata?.fileUrl && (
              <div className="p-3 rounded-xl border bg-background flex items-center justify-between">
                <div className="flex items-center gap-2 overflow-hidden">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-xs font-bold truncate max-w-[200px]">{item.metadata.fileName}</span>
                </div>
                <Button asChild size="sm" variant="ghost" className="h-8 gap-2">
                  <a href={item.metadata.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </Button>
              </div>
            )}

            {/* Replies */}
            {item.replies && item.replies.length > 0 && (
              <div className="space-y-3 pt-4 border-t mt-4">
                {item.replies.map((r, idx) => (
                  <div key={idx} className="flex gap-3 items-start bg-muted/20 p-3 rounded-xl">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-muted-foreground">{r.createdByName}</span>
                        <span className="text-[9px] text-muted-foreground">{formatDistanceToNow(new Date(r.timestamp))} ago</span>
                      </div>
                      <p className="text-xs text-foreground/70 leading-relaxed">{r.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Input */}
            <div className="pt-2 flex gap-2">
              <Input 
                placeholder="Reply to accountant..." 
                className="h-8 text-xs bg-background"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddReply()}
              />
              <Button 
                size="sm" 
                className="h-8 w-8 p-0" 
                onClick={handleAddReply} 
                disabled={isReplying || !reply.trim()}
              >
                {isReplying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
