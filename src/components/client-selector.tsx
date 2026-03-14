
'use client';

import React, { useState, useMemo } from 'react';
import { 
  Check, 
  ChevronsUpDown, 
  PlusCircle, 
  Search,
  User,
  Building2,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
import type { Client } from '@/lib/types';
import ClientDialog from '@/app/(authed)/clients/client-dialog';

interface ClientSelectorProps {
  businessId: string;
  ownerId: string;
  value?: string;
  onChange: (clientId: string) => void;
  className?: string;
}

export function ClientSelector({ businessId, ownerId, value, onChange, className }: ClientSelectorProps) {
  const [open, setOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const firestore = useFirestore();

  const clientsRef = useMemoFirebase(
    () => (firestore ? collection(firestore, `businesses/${businessId}/clients`) : null),
    [firestore, businessId]
  );
  const { data: clients, isLoading } = useCollection<Client>(clientsRef);

  const selectedClient = useMemo(() => 
    clients?.find((c) => c.id === value), 
    [clients, value]
  );

  const handleSelect = (clientId: string) => {
    onChange(clientId);
    setOpen(false);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between bg-background", className)}
            disabled={isLoading}
          >
            {selectedClient ? (
              <div className="flex items-center gap-2 truncate">
                {selectedClient.type === 'business' ? <Building2 className="h-3 w-3" /> : <User className="h-3 w-3" />}
                <span className="truncate">{selectedClient.name}</span>
              </div>
            ) : (
              "Select or search client..."
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search name or phone..." />
            <CommandList>
              <CommandEmpty className="p-4 flex flex-col items-center gap-3">
                <p className="text-xs text-muted-foreground">No client found.</p>
                <Button size="sm" className="w-full gap-2" onClick={() => setIsDialogOpen(true)}>
                  <PlusCircle className="h-3 w-3" />
                  Create New Client
                </Button>
              </CommandEmpty>
              <CommandGroup heading="Recent Clients">
                {clients?.map((client) => (
                  <CommandItem
                    key={client.id}
                    value={`${client.name} ${client.phone} ${client.businessName || ''}`}
                    onSelect={() => handleSelect(client.id)}
                    className="flex flex-col items-start gap-0.5 py-2"
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {client.type === 'business' ? <Building2 className="h-3 w-3 text-muted-foreground" /> : <User className="h-3 w-3 text-muted-foreground" />}
                        <span className="font-bold text-sm">{client.name}</span>
                      </div>
                      {value === client.id && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Phone className="h-2.5 w-2.5" />
                      <span>{client.phone}</span>
                      {client.businessName && (
                        <>
                          <span className="mx-1">•</span>
                          <span>{client.businessName}</span>
                        </>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
            <div className="p-2 border-t mt-auto">
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start gap-2 text-primary"
                onClick={() => {
                  setOpen(false);
                  setIsDialogOpen(true);
                }}
              >
                <PlusCircle className="h-4 w-4" />
                Add New Client
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>

      <ClientDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        businessId={businessId}
        ownerId={ownerId}
        onSuccess={(id) => handleSelect(id)}
      />
    </>
  );
}
