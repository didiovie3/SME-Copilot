'use client';

import React, { useState, useMemo, useEffect, memo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from "@/components/ui/badge";
import { 
  PlusCircle, 
  Edit, 
  MoreHorizontal, 
  Package, 
  Warehouse, 
  Folders, 
  Server, 
  Upload, 
  Lock, 
  Image as ImageIcon, 
  Archive, 
  ArchiveRestore,
  ArrowUpCircle,
  ChevronRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { InventoryItem } from '@/lib/types';
import InventoryDialog from './inventory-dialog';
import InventoryImportDialog from './inventory-import-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useUserProfile } from '@/hooks/use-user-profile';
import { useTier } from '@/hooks/use-tier';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FeedbackButton } from '@/components/feedback-button';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';
import Link from 'next/link';
import { UpgradePrompt } from '@/components/upgrade-prompt';
import { cn } from '@/lib/utils';

const InventoryRow = memo(({ 
  item, 
  onEdit, 
  onArchive, 
  isLoading, 
  isProfileComplete 
}: { 
  item: InventoryItem; 
  onEdit: (item: InventoryItem) => void; 
  onArchive: (item: InventoryItem) => void;
  isLoading: boolean;
  isProfileComplete: boolean;
}) => {
  const isGoods = item.type === 'goods';
  const needsReorder = isGoods && !item.isArchived && (item.currentStock || 0) <= (item.reorderPoint || 0);
  
  return (
    <>
      {/* Desktop Row */}
      <TableRow className={cn("hidden md:table-row", needsReorder ? 'bg-destructive/5' : '')}>
        <TableCell>
          <div className="size-10 relative rounded-md overflow-hidden bg-muted border border-border flex items-center justify-center">
            {item.imageUrl ? (
              <Image 
                src={item.imageUrl} 
                alt={item.itemName} 
                fill 
                className="object-cover"
              />
            ) : (
              <ImageIcon className="size-5 text-muted-foreground/40" />
            )}
          </div>
        </TableCell>
        <TableCell className="font-medium">
          {item.itemName}
          {item.isArchived && <Badge variant="outline" className="ml-2 text-[10px] scale-90 opacity-60">Archived</Badge>}
        </TableCell>
        <TableCell className="capitalize text-xs">{item.type}</TableCell>
        <TableCell className="text-xs">{item.category || '-'}</TableCell>
        <TableCell className={`text-center font-semibold ${needsReorder ? 'text-destructive' : ''}`}>
          {isGoods ? item.currentStock : 'N/A'}
        </TableCell>
        <TableCell className="text-center text-xs">₦{(isGoods ? item.unitCost : item.value)?.toLocaleString() ?? '0.00'}</TableCell>
        <TableCell className="text-center text-xs">{isGoods ? item.reorderPoint : 'N/A'}</TableCell>
        <TableCell className="text-right font-medium">
            ₦{(isGoods
            ? ((item.currentStock || 0) * (item.unitCost || 0))
            : (item.value || 0)
            ).toLocaleString()}
        </TableCell>
        <TableCell className="text-right">
          {item.isArchived ? (
            <Badge variant="outline" className="text-[10px]">Archived</Badge>
          ) : isGoods ? (
            needsReorder ? (
              <Badge variant="destructive" className="text-[10px]">Reorder</Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px]">In Stock</Badge>
            )
          ) : (
            <Badge className="text-[10px]">Available</Badge>
          )}
        </TableCell>
        <TableCell className="text-right">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0" disabled={isLoading || !isProfileComplete}>
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(item)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit Item</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onArchive(item)}>
                        {item.isArchived ? (
                          <>
                            <ArchiveRestore className="mr-2 h-4 w-4" />
                            <span>Restore to Active</span>
                          </>
                        ) : (
                          <>
                            <Archive className="mr-2 h-4 w-4" />
                            <span>Archive Item</span>
                          </>
                        )}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </TableCell>
      </TableRow>

      {/* Mobile Card Layout */}
      <div className={cn(
        "md:hidden p-4 relative group active:bg-muted/50 transition-colors",
        needsReorder ? "bg-destructive/5" : ""
      )}>
        <div className="flex gap-4">
          <div className="size-14 relative rounded-lg overflow-hidden bg-muted shrink-0 border">
            {item.imageUrl ? (
              <Image src={item.imageUrl} alt={item.itemName} fill className="object-cover" />
            ) : (
              <ImageIcon className="size-6 text-muted-foreground/30 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            )}
          </div>
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div className="flex justify-between items-start">
              <span className="font-bold text-sm truncate pr-4">{item.itemName}</span>
              <span className="font-black text-sm">
                ₦{(isGoods ? ((item.currentStock || 0) * (item.unitCost || 0)) : (item.value || 0)).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[8px] h-4 px-1.5 uppercase font-black">{item.category || 'General'}</Badge>
              <span className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                {isGoods ? `${item.currentStock} in stock` : 'Service Asset'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {needsReorder && <Badge variant="destructive" className="text-[8px] h-4 px-1 font-black">CRITICAL LOW</Badge>}
              {item.isArchived && <Badge variant="outline" className="text-[8px] h-4 px-1 opacity-50">ARCHIVED</Badge>}
            </div>
          </div>
          <div className="flex flex-col justify-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(item)}>
              <Edit className="h-4 w-4 text-muted-foreground" />
            </Button>
          </div>
        </div>
      </div>
    </>
  );
});

InventoryRow.displayName = 'InventoryRow';

export default function InventoryPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | undefined>(undefined);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('active');
  const [hasMounted, setHasMounted] = useState(false);

  const { profile, user, isProfileComplete, isLoading: isProfileLoading } = useUserProfile();
  const { isFree } = useTier();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const businessId = profile?.businessId;
  const ownerId = user?.uid;

  const inventoryCollectionRef = useMemoFirebase(
    () => (firestore && businessId ? collection(firestore, `businesses/${businessId}/inventory_items`) : null),
    [firestore, businessId]
  );
  const { data: inventory, isLoading: isInventoryLoading } = useCollection<InventoryItem>(inventoryCollectionRef);

  const isLoading = isProfileLoading || isInventoryLoading;

  const stats = useMemo(() => {
    if (!inventory) return { 
      totalItems: 0, totalGoods: 0, totalServices: 0, totalStockValue: 0, categoryList: ['all'], categoryCount: 0 
    };
    
    const activeInventory = inventory.filter(i => !i.isArchived);
    const goods = activeInventory.filter(item => item.type === 'goods');
    const services = activeInventory.filter(item => item.type === 'service');
    
    const totalStockValue = goods.reduce((sum, item) => sum + ((item.currentStock || 0) * (item.unitCost || 0)), 0);
    
    const uniqueCats = Array.from(new Set(inventory.map(i => i.category).filter(Boolean))).sort();
    const hasUncategorized = inventory.some(i => !i.category);
    
    const categoryList = ['all', ...uniqueCats];
    if (hasUncategorized) categoryList.push('Uncategorized');

    return { 
      totalItems: activeInventory.length,
      totalGoods: goods.length,
      totalServices: services.length,
      totalStockValue, 
      categoryList,
      categoryCount: uniqueCats.length + (hasUncategorized ? 1 : 0),
      rawCategories: uniqueCats
    };
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    if (!inventory) return [];
    
    let results = activeTab === 'active' 
      ? inventory.filter(i => !i.isArchived)
      : inventory.filter(i => !!i.isArchived);

    if (categoryFilter !== 'all') {
      results = results.filter(item => 
        categoryFilter === 'Uncategorized' ? !item.category : item.category === categoryFilter
      );
    }
    
    return results;
  }, [inventory, categoryFilter, activeTab]);

  const limitReached = isFree && stats.totalItems >= 10;

  const handleAddItem = () => {
    if (!isProfileComplete || isLoading || limitReached) return;
    setSelectedItem(undefined);
    setDialogOpen(true);
  };

  const handleEditItem = (item: InventoryItem) => {
    if (!isProfileComplete || isLoading) return;
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleToggleArchive = (item: InventoryItem) => {
    if (!firestore || !businessId || isLoading) return;
    const itemRef = doc(firestore, `businesses/${businessId}/inventory_items`, item.id);
    const newStatus = !item.isArchived;
    updateDocumentNonBlocking(itemRef, { isArchived: newStatus });
    toast({
      title: newStatus ? 'Item Archived' : 'Item Restored',
      description: `${item.itemName} has been moved.`,
    });
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium uppercase tracking-widest text-muted-foreground">Active Items</CardTitle>
            <Package className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-black flex items-center gap-2">
              {isLoading ? <Skeleton className="h-8 w-16" /> : stats.totalItems}
              {isFree && <span className="text-[10px] text-muted-foreground">/ 10</span>}
            </div>
            <p className="hidden sm:block text-[10px] uppercase font-bold tracking-tight text-muted-foreground">{stats.totalGoods} Goods / {stats.totalServices} Services</p>
          </CardContent>
        </Card>
        <Card className="border-none bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-[10px] sm:text-sm font-medium uppercase tracking-widest text-muted-foreground">Stock Value</CardTitle>
            <Warehouse className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-black truncate">
              {(isLoading || !hasMounted) ? <Skeleton className="h-8 w-32" /> : `₦${stats.totalStockValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}`}
            </div>
            <p className="hidden sm:block text-[10px] uppercase font-bold tracking-tight text-muted-foreground">Total value of goods</p>
          </CardContent>
        </Card>
        <Card className="hidden lg:flex border-none bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Services</CardTitle>
            <Server className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{isLoading ? <Skeleton className="h-8 w-16" /> : stats.totalServices}</div>
             <p className="text-[10px] uppercase font-bold tracking-tight text-muted-foreground">Active service offerings</p>
          </CardContent>
        </Card>
        <Card className="hidden lg:flex border-none bg-card/50 backdrop-blur-sm shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-widest text-muted-foreground">Categories</CardTitle>
            <Folders className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black">{isLoading ? <Skeleton className="h-8 w-16" /> : stats.categoryCount}</div>
            <p className="text-[10px] uppercase font-bold tracking-tight text-muted-foreground">Asset classifications</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none bg-card/50 backdrop-blur-sm shadow-sm overflow-hidden">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6">
          <div className="flex-1">
            <CardTitle>Inventory Hub</CardTitle>
            <CardDescription>Track and classify your business assets.</CardDescription>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Select value={categoryFilter} onValueChange={setCategoryFilter} disabled={isLoading}>
                <SelectTrigger className="w-full md:w-[180px] bg-background">
                    <SelectValue placeholder="Filter category" />
                </SelectTrigger>
                <SelectContent>
                    {stats.categoryList.map(cat => (
                        <SelectItem key={`filter-${cat}`} value={cat}>{cat === 'all' ? 'All Categories' : cat}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
            <div className="flex items-center gap-2 shrink-0">
              {!isFree && (
                <Button onClick={() => setImportDialogOpen(true)} variant="outline" size="sm" className="h-9 gap-2" disabled={isLoading || !isProfileComplete}>
                    <Upload className="h-4 w-4" />
                    <span className="hidden sm:inline">Import</span>
                </Button>
              )}
              <Button onClick={handleAddItem} size="sm" className="h-9 gap-2 shadow-lg shadow-primary/20" disabled={isLoading || !isProfileComplete || limitReached}>
                {limitReached ? <Lock className="h-4 w-4" /> : <PlusCircle className="h-4 w-4" />}
                <span className="hidden sm:inline">{limitReached ? 'Limit Reached' : 'Add Item'}</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          {limitReached && (
            <div className="mb-6 px-4 sm:px-0">
              <UpgradePrompt 
                variant="inline"
                featureName="Unlimited Inventory"
                requiredTier="pro"
                description="You've reached the 10-item limit for the Free plan."
              />
            </div>
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mx-4 sm:mx-0 mb-6 bg-background/50 border h-10">
              <TabsTrigger value="active" className="gap-2 text-xs">
                Active Items
                <Badge variant="secondary" className="h-4 px-1 py-0 text-[8px] font-black">
                  {inventory?.filter(i => !i.isArchived).length || 0}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="archived" className="gap-2 text-xs">
                Archive
                <Badge variant="secondary" className="h-4 px-1 py-0 text-[8px] font-black">
                  {inventory?.filter(i => !!i.isArchived).length || 0}
                </Badge>
              </TabsTrigger>
            </TabsList>
            
            <div className="sm:rounded-lg border-y sm:border overflow-hidden divide-y sm:divide-none">
              <Table className="hidden md:table">
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="w-[60px]">Photo</TableHead>
                    <TableHead>Asset Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="text-center">Price</TableHead>
                    <TableHead className="text-center">Threshold</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={`skeleton-${i}`}>
                        <TableCell><Skeleton className="h-10 w-10 rounded-md" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[40px] mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[60px] mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[40px] mx-auto" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-[80px] ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-5 w-[70px] ml-auto" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="h-32 text-center text-muted-foreground italic">
                        No items match your filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((item) => (
                      <InventoryRow 
                        key={item.id} 
                        item={item} 
                        onEdit={handleEditItem} 
                        onArchive={handleToggleArchive}
                        isLoading={isLoading}
                        isProfileComplete={isProfileComplete}
                      />
                    ))
                  )}
                </TableBody>
              </Table>

              {/* Mobile Card Container */}
              <div className="md:hidden divide-y bg-background">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4 flex gap-4">
                      <Skeleton className="h-14 w-14 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-3 w-2/3" />
                      </div>
                    </div>
                  ))
                ) : filteredInventory.length === 0 ? (
                  <div className="p-10 text-center text-muted-foreground italic">No items found.</div>
                ) : (
                  filteredInventory.map((item) => (
                    <InventoryRow 
                      key={item.id} 
                      item={item} 
                      onEdit={handleEditItem} 
                      onArchive={handleToggleArchive}
                      isLoading={isLoading}
                      isProfileComplete={isProfileComplete}
                    />
                  ))
                )}
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>

      {businessId && ownerId && (
        <>
          <InventoryDialog 
            businessId={businessId}
            ownerId={ownerId}
            item={selectedItem}
            open={dialogOpen}
            onOpenChange={(open) => {
              if (!open) setSelectedItem(undefined);
              setDialogOpen(open);
            }}
            categories={stats.rawCategories || []}
          />
          {!isFree && (
            <InventoryImportDialog
                businessId={businessId}
                ownerId={ownerId}
                open={importDialogOpen}
                onOpenChange={setImportDialogOpen}
            />
          )}
        </>
      )}
      <FeedbackButton />
    </div>
  );
}
