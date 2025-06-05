"use client";

import React, { useState, useMemo } from 'react';
import type { DuplicatePair } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, AlertTriangle, Search } from 'lucide-react';
import { checkPairForInvalidNames, getInvalidNameReason } from '@/utils/record-validation';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DeleteInvalidRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (pairIds: string[]) => void;
  invalidPairs: DuplicatePair[];
  isDeleting?: boolean;
}

export function DeleteInvalidRecordsModal({
  isOpen,
  onClose,
  onConfirmDelete,
  invalidPairs,
  isDeleting = false
}: DeleteInvalidRecordsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const filteredPairs = useMemo(() => {
    if (!searchTerm.trim()) {
      return invalidPairs;
    }
    
    const searchValue = searchTerm.toLowerCase().trim();
    
    return invalidPairs.filter(pair => {
      const record1Row = pair.record1.rowNumber?.toString().toLowerCase() || '';
      const record2Row = pair.record2.rowNumber?.toString().toLowerCase() || '';
      
      return record1Row.includes(searchValue) || record2Row.includes(searchValue);
    });
  }, [invalidPairs, searchTerm]);
  
  const handleConfirmDelete = () => {
    const pairIds = invalidPairs.map(pair => pair.id);
    onConfirmDelete(pairIds);
  };

  const totalRecordsAffected = invalidPairs.reduce((count, pair) => {
    const { record1Invalid, record2Invalid } = checkPairForInvalidNames(pair);
    return count + (record1Invalid ? 1 : 0) + (record2Invalid ? 1 : 0);
  }, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-background border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600 dark:text-red-400">
            <Trash2 className="w-5 h-5 mr-2" />
            Delete Invalid Name Records
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <AlertDescription className="text-red-800 dark:text-red-200 font-medium">
              <strong>Warning:</strong> This action will permanently delete {invalidPairs.length} duplicate pair{invalidPairs.length !== 1 ? 's ' : ' '} 
              containing {totalRecordsAffected} record{totalRecordsAffected !== 1 ? 's' : ''} with invalid names. 
              This action cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="bg-muted/50 dark:bg-muted/20 p-4 rounded-lg border border-border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-foreground">Records to be deleted:</h4>
              <div className="text-sm text-foreground/70">
                {filteredPairs.length} of {invalidPairs.length} pairs shown
              </div>
            </div>
            <p className="text-sm text-foreground/70 mb-3">
              Only pairs containing records with "nan", empty, or invalid names will be deleted.
            </p>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-foreground/50" />
              <Input
                placeholder="Search by row number..."
                value={searchTerm}
                onChange={(e) => {
                  const value = e.target.value;
                  // Only allow numeric characters
                  if (/^\d*$/.test(value)) {
                    setSearchTerm(value);
                  }
                }}
                className="pl-10 bg-background border-input text-foreground placeholder:text-foreground/50"
                inputMode="numeric"
              />
            </div>
            
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-4">
                {filteredPairs.length === 0 ? (
                  <div className="text-center py-8 text-foreground/70">
                    {searchTerm ? 'No pairs found matching your search.' : 'No invalid pairs to display.'}
                  </div>
                ) : (
                  filteredPairs.map((pair) => {
                    const { record1Invalid, record2Invalid } = checkPairForInvalidNames(pair);
                    
                    return (
                      <div key={pair.id} className="border border-border rounded p-3 bg-card">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-foreground">Pair ID: {pair.id}</span>
                          <Badge variant="destructive" className="text-xs">
                            Invalid Name{(record1Invalid && record2Invalid) ? 's' : ''}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className={record1Invalid ? 'bg-red-100 dark:bg-red-950/40 p-2 rounded border border-red-200 dark:border-red-800' : 'p-2 bg-muted/30 rounded border border-border'}>
                            <div className="font-medium text-foreground">Record 1:</div>
                            <div className="text-foreground/70">
                              Name: {pair.record1.name || '[empty]'}
                            </div>
                            <div className="text-foreground/70">
                              Row: {pair.record1.rowNumber || 'N/A'}
                            </div>
                            {record1Invalid && (
                              <div className="text-red-600 dark:text-red-400 mt-1 font-medium">
                                ⚠ {getInvalidNameReason(pair.record1)}
                              </div>
                            )}
                          </div>
                          
                          <div className={record2Invalid ? 'bg-red-100 dark:bg-red-950/40 p-2 rounded border border-red-200 dark:border-red-800' : 'p-2 bg-muted/30 rounded border border-border'}>
                            <div className="font-medium text-foreground">Record 2:</div>
                            <div className="text-foreground/70">
                              Name: {pair.record2.name || '[empty]'}
                            </div>
                            <div className="text-foreground/70">
                              Row: {pair.record2.rowNumber || 'N/A'}
                            </div>
                            {record2Invalid && (
                              <div className="text-red-600 dark:text-red-400 mt-1 font-medium">
                                ⚠ {getInvalidNameReason(pair.record2)}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">What happens next:</h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Selected duplicate pairs will be removed from the review queue</li>
              <li>• Records with invalid names will no longer appear in the duplicate detection results</li>
              <li>• This action only affects the current session - original data files are not modified</li>
              <li>• You can re-upload corrected data if needed</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleConfirmDelete}
            disabled={isDeleting || invalidPairs.length === 0}
            className="min-w-32 bg-red hover:bg-red-700 text-white"
          >
            {isDeleting ? (
              <>
                <AlertTriangle className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete {invalidPairs.length} Pair{invalidPairs.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}