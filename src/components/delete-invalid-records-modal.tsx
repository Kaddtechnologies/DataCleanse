"use client";

import React from 'react';
import type { DuplicatePair } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Trash2, AlertTriangle } from 'lucide-react';
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center text-red-600">
            <Trash2 className="w-5 h-5 mr-2" />
            Delete Invalid Name Records
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>Warning:</strong> This action will permanently delete {invalidPairs.length} duplicate pair{invalidPairs.length !== 1 ? 's' : ''} 
              containing {totalRecordsAffected} record{totalRecordsAffected !== 1 ? 's' : ''} with invalid names. 
              This action cannot be undone.
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Records to be deleted:</h4>
            <p className="text-sm text-muted-foreground mb-3">
              Only pairs containing records with "nan", empty, or invalid names will be deleted.
            </p>
            
            <ScrollArea className="max-h-60">
              <div className="space-y-2">
                {invalidPairs.map((pair) => {
                  const { record1Invalid, record2Invalid } = checkPairForInvalidNames(pair);
                  
                  return (
                    <div key={pair.id} className="border rounded p-3 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Pair ID: {pair.id}</span>
                        <Badge variant="destructive" className="text-xs">
                          Invalid Name{(record1Invalid && record2Invalid) ? 's' : ''}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className={record1Invalid ? 'bg-red-100 p-2 rounded' : 'p-2'}>
                          <div className="font-medium">Record 1:</div>
                          <div className="text-muted-foreground">
                            Name: {pair.record1.name || '[empty]'}
                          </div>
                          <div className="text-muted-foreground">
                            Row: {pair.record1.rowNumber || 'N/A'}
                          </div>
                          {record1Invalid && (
                            <div className="text-red-600 mt-1">
                              ⚠ {getInvalidNameReason(pair.record1)}
                            </div>
                          )}
                        </div>
                        
                        <div className={record2Invalid ? 'bg-red-100 p-2 rounded' : 'p-2'}>
                          <div className="font-medium">Record 2:</div>
                          <div className="text-muted-foreground">
                            Name: {pair.record2.name || '[empty]'}
                          </div>
                          <div className="text-muted-foreground">
                            Row: {pair.record2.rowNumber || 'N/A'}
                          </div>
                          {record2Invalid && (
                            <div className="text-red-600 mt-1">
                              ⚠ {getInvalidNameReason(pair.record2)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2 text-blue-800">What happens next:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
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
            className="min-w-32"
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