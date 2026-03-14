'use client';

import { useState, useMemo, useEffect, Suspense } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { Badge } from '@/components/ui/badge';
import { useCollection, useFirestore, useMemoFirebase, useDoc } from '@/firebase';
import { collection, doc, query, orderBy, where } from 'firebase/firestore';
import type { Transaction, Business } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTier } from '@/hooks/use-tier';
import { format, subDays } from 'date-fns';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Search, Filter, History, CalendarClock, Zap, FileText, PlusCircle, Flag, ChevronRight } from 'lucide-react';
import ReceiptDialog from '@/components/ui/receipt-dialog';
import { FeedbackButton } from '@/components/feedback-button';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { cn } from '@/lib/utils';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/constants';
import { RecurringManagement } from './recurring-management';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

function TransactionsContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [activeTab, setActiveTab] = useState('ledger');
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const { profile, isLoading: isProfileLoading } = useUserProfile();
  const { isFree, isProOrAbove } = useTier();
  const firestore = useFirestore();
  
  const businessId = profile?.businessId;

  const businessRef = useMemoFirebase(
    () => (firestore && businessId ? doc(firestore, 'businesses', businessId) : null),
    [firestore, businessId]
  );
  const { data: business, isLoading: businessLoading } = useDoc<Business>(businessRef);
  
  const transactionsRef = useMemoFirebase(() => {
    if (!firestore || !businessId) return null;
    
    let q = query(
      collection(firestore, `businesses/${businessId}/transactions`),
      orderBy('timestamp', 'desc')
    );

    if (filterType !== 'all') {
      q = query(q, where('type', '==', filterType));
    }

    return q;
  }, [firestore, businessId, filterType]);

  const { data: transactions, isLoading: transactionsLoading } = useCollection<Transaction>(transactionsRef);

  const isLoading = isProfileLoading || transactionsLoading || businessLoading;

  const processedTransactions = useMemo(() => {
    if (!transactions) return [];

    let processed = [...transactions];

    if (isFree) {
      const thirtyDaysAgo = subDays(new Date(), 30);
      processed = processed.filter(t => new Date(t.timestamp) >= thirtyDaysAgo);
    }

    if (filterCategory !== 'all') {
      processed = processed.filter(t => t.category === filterCategory || t.categoryName === filterCategory);
    }

    if (searchQuery) {
      const lowercasedQuery = searchQuery.toLowerCase();
      processed = processed.filter(t =>
        t.category?.toLowerCase().includes(lowercasedQuery) ||
        t.categoryName?.toLowerCase().includes(lowercasedQuery) ||
        t.description?.toLowerCase().includes(lowercasedQuery) ||
        t.clientName?.toLowerCase().includes(lowercasedQuery) ||
        t.clientPhone?.toLowerCase().includes(lowercasedQuery) ||
        (t.items && t.items.some(item => item.itemName.toLowerCase().includes(lowercasedQuery)))
      );
    }

    processed.sort((a, b) => {
      switch (sortBy) {
        case 'date-asc':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'amount-desc':
          return b.amount - a.amount;
        case 'amount-asc':
          return a.amount - b.amount;
        case 'date-desc':
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });

    return processed;
  }, [transactions, filterCategory, searchQuery, sortBy, isFree]);

  const handleRowClick = (transaction: Transaction) => {
    if (isLoading) return;
    setSelectedTransaction(transaction);
  };

  const renderLoadingRows = (count: number) =>
    Array.from({ length: count }).map((_, i) => (
      <TableRow key={`loading-${i}`}>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-20" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
        <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
      </TableRow>
    ));

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center px-1">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Ledger</h1>
          <p className="text-xs text-muted-foreground">Showing {processedTransactions.length} transactions</p>
        </div>
        {isProOrAbove && (
          <Button asChild variant="outline" className="hidden md:flex gap-2 shadow-sm">
            <Link href="/invoices">
              <FileText className="h-4 w-4" />
              Manage Invoices
            </Link>
          </Button>
        )}
      </div>

      {isFree && (
        <UpgradePrompt 
          variant="inline"
          featureName="Full Financial History"
          requiredTier="pro"
          description="Free accounts only display transactions from the last 30 days. Upgrade to unlock your complete business history."
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px] mb-8 bg-background border h-12">
          <TabsTrigger value="ledger" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Financial Ledger</span>
            <span className="sm:hidden">Ledger</span>
          </TabsTrigger>
          <TabsTrigger value="recurring" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            <span className="hidden sm:inline">Recurring Templates</span>
            <span className="sm:hidden">Automations</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ledger" className="space-y-6 m-0 animate-in fade-in duration-500">
          <Card className="border-none bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                {isFree ? 'Last 30 days of recorded transactions.' : 'A complete log of all your recorded transactions.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              <div className="px-4 sm:px-0 flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="relative w-full sm:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search items or clients..."
                      className="pl-10 w-full bg-background"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)} disabled={isLoading}>
                    <SelectTrigger className="w-full sm:w-[180px] bg-background">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date-desc">Newest first</SelectItem>
                      <SelectItem value="date-asc">Oldest first</SelectItem>
                      <SelectItem value="amount-desc">Amount (High-Low)</SelectItem>
                      <SelectItem value="amount-asc">Amount (Low-High)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select value={filterType} onValueChange={(value) => {
                      setFilterType(value as any);
                      setFilterCategory('all');
                    }} disabled={isLoading}>
                      <SelectTrigger className="w-full sm:w-[150px] bg-background">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Select value={filterCategory} onValueChange={setFilterCategory} disabled={isLoading}>
                    <SelectTrigger className="w-full sm:w-[250px] bg-background">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      
                      {filterType !== 'expense' && (
                        <SelectGroup>
                          <SelectLabel>Income</SelectLabel>
                          {INCOME_CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectGroup>
                      )}

                      {filterType !== 'income' && EXPENSE_CATEGORIES.map((group) => (
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
                </div>
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block rounded-lg border overflow-hidden relative mx-4 sm:mx-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? renderLoadingRows(10) :
                    processedTransactions.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No transactions found.
                            </TableCell>
                        </TableRow>
                    ) :
                    processedTransactions.map(t => {
                      const itemsDisplay = t.items && t.items.length > 0
                          ? t.items.map(item => `${item.itemName} (x${item.quantity})`).join(', ')
                          : t.clientName || '-';
                      return (
                          <TableRow key={t.id} onClick={() => handleRowClick(t)} className={cn("cursor-pointer hover:bg-muted/50 transition-colors group", t.flagged && "bg-orange-500/5")}>
                          <TableCell className="text-xs">{format(new Date(t.timestamp), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant={t.type === 'income' ? 'default' : 'secondary'}
                                  className={t.type === 'income' ? 'bg-accent text-accent-foreground' : ''}
                                >
                                  {t.type}
                                </Badge>
                                {t.isRecurring && (
                                  <Badge variant="outline" className="text-[10px] gap-1 px-1 border-primary/20 bg-primary/5 text-primary">
                                    <Zap className="h-2.5 w-2.5 fill-primary" /> Auto
                                  </Badge>
                                )}
                              </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-xs">{t.categoryName || t.category}</span>
                              {t.categoryGroup && <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">{t.categoryGroup}</span>}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs">
                              {itemsDisplay}
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                              {t.description || '-'}
                          </TableCell>
                          <TableCell
                              className={`text-right font-bold whitespace-nowrap ${
                              t.type === 'income' ? 'text-accent' : 'text-destructive'
                              }`}
                          >
                              {t.type === 'income' ? '+' : '-'}₦{t.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </TableCell>
                          </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4 space-y-3">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <Skeleton className="h-6 w-full" />
                    </div>
                  ))
                ) : processedTransactions.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground italic">No transactions found.</div>
                ) : (
                  processedTransactions.map(t => (
                    <div 
                      key={t.id} 
                      onClick={() => handleRowClick(t)}
                      className={cn(
                        "p-4 active:bg-muted/50 transition-colors relative",
                        t.flagged && "bg-orange-500/5"
                      )}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {format(new Date(t.timestamp), 'MMM dd, yyyy')}
                          </span>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={t.type === 'income' ? 'default' : 'secondary'}
                              className={cn("text-[9px] h-5 px-1.5 uppercase font-black", t.type === 'income' ? 'bg-accent' : '')}
                            >
                              {t.type}
                            </Badge>
                            {t.isRecurring && <Zap className="h-3 w-3 text-primary fill-primary" />}
                            {t.flagged && <Flag className="h-3 w-3 text-orange-600 fill-orange-600" />}
                          </div>
                        </div>
                        <div className={cn(
                          "text-base font-black tabular-nums",
                          t.type === 'income' ? 'text-accent' : 'text-destructive'
                        )}>
                          {t.type === 'income' ? '+' : '-'}₦{t.amount.toLocaleString()}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">{t.categoryName || t.category}</span>
                          <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                            {t.items && t.items.length > 0 
                              ? t.items.map(i => i.itemName).join(', ')
                              : t.description || t.clientName || 'No details'}
                          </span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-30" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recurring" className="m-0 animate-in fade-in duration-500">
          <Card className="border-none bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
            <CardHeader className="bg-primary/5 border-b border-primary/10">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CalendarClock className="h-5 w-5 text-primary" />
                    Recurring Automations
                  </CardTitle>
                  <CardDescription>Automated monthly, weekly or quarterly overhead logging.</CardDescription>
                </div>
                {!isProOrAbove && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10">Pro Feature</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {!isProOrAbove ? (
                <UpgradePrompt 
                  variant="overlay"
                  featureName="Recurring Automation"
                  requiredTier="pro"
                  description="Automate your Rent, Diesel, and Staff Salary logs to save 5+ hours of bookkeeping monthly."
                />
              ) : businessId ? (
                <RecurringManagement businessId={businessId} />
              ) : (
                <Skeleton className="h-[200px] w-full" />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ReceiptDialog
        open={!!selectedTransaction}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setSelectedTransaction(null);
          }
        }}
        transaction={selectedTransaction}
        business={business}
      />
      <FeedbackButton />
    </div>
  );
}

export default function AllTransactionsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center"><Skeleton className="h-10 w-full" /></div>}>
      <TransactionsContent />
    </Suspense>
  );
}