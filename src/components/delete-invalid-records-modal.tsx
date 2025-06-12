"use client";

import React, { useState, useMemo, useCallback } from 'react';
import type { DuplicatePair, CustomerRecord } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Trash2, AlertTriangle, Search, Database, Loader2, MapPin, Building2, Mail, Phone, Hash, ChevronDown, ChevronRight, Users, Archive, CheckCircle2, XCircle, ArrowLeftRight } from 'lucide-react';
import { performComprehensiveValidation, checkPairForInvalidNames, getInvalidNameReason, isCompletelyInvalidRecord, isInvalidNameRecord, hasValidAddressInfo } from '@/utils/record-validation';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DeleteInvalidRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (pairIds: string[]) => void;
  invalidPairs: DuplicatePair[];
  isDeleting?: boolean;
  onMovePair?: (pairId: string, targetCategory: 'valid' | 'invalid_duplicates' | 'completely_invalid') => void;
  onRefreshGrid?: () => void;
}

// Component for displaying individual record details
interface RecordDisplayProps {
  record: CustomerRecord;
  recordLabel: string;
  isInvalid?: boolean;
}

const RecordDisplay = ({ record, recordLabel, isInvalid = false }: RecordDisplayProps) => (
  <div className={`p-4 rounded-lg border ${isInvalid ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-700' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
        {recordLabel}
      </span>
      {isInvalid && (
        <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs">
          Invalid
        </Badge>
      )}
    </div>
    
    <div className="space-y-2 text-sm">
      <div className="flex items-center space-x-2">
        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-slate-600 dark:text-slate-400">Name:</span>
        <span className={`font-medium ${isInvalidNameRecord(record) ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>
          {record.name || '[empty]'}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-slate-600 dark:text-slate-400">Address:</span>
        <span className={`${!hasValidAddressInfo(record) ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>
          {record.address || '[empty]'}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-slate-600 dark:text-slate-400">Location:</span>
        <span className={`${!record.city && !record.country ? 'text-red-600' : 'text-slate-800 dark:text-slate-200'}`}>
          {[record.city, record.country].filter(Boolean).join(', ') || '[empty]'}
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-slate-600 dark:text-slate-400">Row:</span>
        <span className="text-slate-800 dark:text-slate-200">{record.rowNumber || 'N/A'}</span>
      </div>
      
      {isInvalid && (
        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-700">
          <div className="text-red-700 dark:text-red-300 text-xs font-medium">
            Issues: {isInvalidNameRecord(record) && getInvalidNameReason(record)}
            {!hasValidAddressInfo(record) && (isInvalidNameRecord(record) ? ', Invalid address' : 'Invalid address')}
          </div>
        </div>
      )}
    </div>
  </div>
);

// Component for displaying invalid duplicate pairs with side-by-side comparison
interface InvalidDuplicatePairDisplayProps {
  pair: DuplicatePair;
  onMovePair?: (pairId: string, targetCategory: 'valid' | 'completely_invalid') => void;
}

const InvalidDuplicatePairDisplay = ({ pair, onMovePair }: InvalidDuplicatePairDisplayProps) => {
  const getValidationFailures = () => {
    const failures: string[] = [];
    const record1Invalid = isInvalidNameRecord(pair.record1);
    const record2Invalid = isInvalidNameRecord(pair.record2);
    const record1AddressInvalid = !hasValidAddressInfo(pair.record1);
    const record2AddressInvalid = !hasValidAddressInfo(pair.record2);
    
    if (record1Invalid) failures.push('Record 1: Invalid name');
    if (record2Invalid) failures.push('Record 2: Invalid name');
    if (record1AddressInvalid) failures.push('Record 1: Invalid address');
    if (record2AddressInvalid) failures.push('Record 2: Invalid address');
    
    return failures;
  };
  
  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value={pair.id} className="border-amber-200 dark:border-amber-700">
        <AccordionTrigger className="hover:no-underline">
          <div className="flex items-center justify-between w-full p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors">
            <div className="flex items-center space-x-3">
              <Users className="w-4 h-4 text-amber-600" />
              <div className="text-left">
                <div className="font-medium text-amber-800 dark:text-amber-200">
                  Pair {pair.id} - Matching Addresses
                </div>
                <div className="text-sm text-amber-600 dark:text-amber-400">
                  {getValidationFailures().join(', ')}
                </div>
              </div>
            </div>
            <Badge className="bg-amber-500 text-white text-xs">
              Invalid Duplicate
            </Badge>
          </div>
        </AccordionTrigger>
        
        <AccordionContent>
          <div className="mt-2 p-4 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 rounded-lg">
            {/* Side-by-side record comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <RecordDisplay
                record={pair.record1}
                recordLabel="Record 1"
                isInvalid={isInvalidNameRecord(pair.record1) || !hasValidAddressInfo(pair.record1)}
              />
              <RecordDisplay
                record={pair.record2}
                recordLabel="Record 2"
                isInvalid={isInvalidNameRecord(pair.record2) || !hasValidAddressInfo(pair.record2)}
              />
            </div>
            
            {/* Action buttons */}
            {onMovePair && (
              <div className="flex gap-2 pt-3 border-t border-amber-200 dark:border-amber-700">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMovePair(pair.id, 'valid')}
                  className="text-green-600 border-green-300 hover:bg-green-50"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Keep as Valid
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onMovePair(pair.id, 'completely_invalid')}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Mark Invalid
                </Button>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
};

// Component for completely invalid records card display
interface CompletelyInvalidRecordCardProps {
  record: CustomerRecord;
  pairId: string;
  recordLabel: string;
}

const CompletelyInvalidRecordCard = ({ record, pairId, recordLabel }: CompletelyInvalidRecordCardProps) => (
  <Card className="border-red-200 dark:border-red-700">
    <CardHeader className="pb-3 bg-gradient-to-r from-red-50 to-red-25 dark:from-red-950/30 dark:to-red-900/20">
      <CardTitle className="text-sm text-red-800 dark:text-red-200 flex items-center justify-between">
        <span>{recordLabel} (Pair: {pairId})</span>
        <Badge className="bg-red-500 text-white text-xs">
          Invalid
        </Badge>
      </CardTitle>
    </CardHeader>
    <CardContent className="pt-3 bg-white dark:bg-slate-800">
      <div className="space-y-2 text-sm">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-slate-600 dark:text-slate-400">Name:</span>
          <span className="font-medium text-red-600">
            {record.name || '[empty]'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-slate-600 dark:text-slate-400">Address:</span>
          <span className="text-red-600">
            {record.address || '[empty]'}
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-slate-600 dark:text-slate-400">Row:</span>
          <span className="text-slate-800 dark:text-slate-200">{record.rowNumber || 'N/A'}</span>
        </div>
        
        <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-700">
          <div className="text-red-700 dark:text-red-300 text-xs font-medium">
            Issues: {getInvalidNameReason(record)}, Invalid address
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export function DeleteInvalidRecordsModal({
  isOpen,
  onClose,
  onConfirmDelete,
  invalidPairs,
  isDeleting = false,
  onMovePair,
  onRefreshGrid
}: DeleteInvalidRecordsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPanel, setSelectedPanel] = useState<'duplicates' | 'invalid'>('duplicates');
  const [selectedPairs, setSelectedPairs] = useState<Set<string>>(new Set());
  
  const categorizedData = useMemo(() => {
    return performComprehensiveValidation(invalidPairs);
  }, [invalidPairs]);
  
  const { invalidDuplicatePairs, completelyInvalidPairs, statistics } = categorizedData;
  
  // Extract individual completely invalid records for Panel 2
  const individualInvalidRecords = useMemo(() => {
    const records: Array<{ record: CustomerRecord; pairId: string; recordLabel: string }> = [];
    
    completelyInvalidPairs.forEach(pair => {
      const record1Invalid = isCompletelyInvalidRecord(pair.record1);
      const record2Invalid = isCompletelyInvalidRecord(pair.record2);
      
      if (record1Invalid) {
        records.push({
          record: pair.record1,
          pairId: pair.id,
          recordLabel: 'Record 1'
        });
      }
      
      if (record2Invalid) {
        records.push({
          record: pair.record2,
          pairId: pair.id,
          recordLabel: 'Record 2'
        });
      }
    });
    
    return records;
  }, [completelyInvalidPairs]);
  
  const filteredInvalidRecords = useMemo(() => {
    if (!searchTerm.trim()) {
      return individualInvalidRecords;
    }
    
    const searchValue = searchTerm.toLowerCase().trim();
    
    return individualInvalidRecords.filter(({ record }) => {
      const recordRow = record.rowNumber?.toString().toLowerCase() || '';
      return recordRow.includes(searchValue);
    });
  }, [individualInvalidRecords, searchTerm]);
  
  const handleConfirmBulkDelete = useCallback(() => {
    const pairIds = completelyInvalidPairs.map(pair => pair.id);
    onConfirmDelete(pairIds);
  }, [completelyInvalidPairs, onConfirmDelete]);
  
  const handleMovePair = useCallback((pairId: string, targetCategory: 'valid' | 'completely_invalid') => {
    if (onMovePair) {
      onMovePair(pairId, targetCategory);
      if (onRefreshGrid) {
        onRefreshGrid();
      }
    }
  }, [onMovePair, onRefreshGrid]);
  
  const togglePairSelection = useCallback((pairId: string) => {
    setSelectedPairs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pairId)) {
        newSet.delete(pairId);
      } else {
        newSet.add(pairId);
      }
      return newSet;
    });
  }, []);
  
  const handleBulkAction = useCallback((action: 'valid' | 'completely_invalid') => {
    if (onMovePair && selectedPairs.size > 0) {
      Array.from(selectedPairs).forEach(pairId => {
        onMovePair(pairId, action);
      });
      setSelectedPairs(new Set());
      if (onRefreshGrid) {
        onRefreshGrid();
      }
    }
  }, [onMovePair, selectedPairs, onRefreshGrid]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} modal={true}>
      <DialogContent className="max-w-7xl h-[90vh] bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 p-0 overflow-hidden flex flex-col">
        {/* Executive Header */}
        <div className="relative bg-gradient-to-r from-red-600 via-red-500 to-red-600 dark:from-red-700 dark:via-red-600 dark:to-red-700 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 via-red-800/10 to-red-900/20" />
          <div className="relative p-6">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-4 text-white text-xl font-light tracking-wide">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xl font-light">Data Validation & Cleanup</div>
                  <div className="text-sm text-white/80 font-light mt-1">
                    Multi-stage record categorization and cleanup management
                  </div>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>
        </div>

        {/* Statistics Summary */}
        <div className="p-6 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-700 border-b border-slate-200 dark:border-slate-600 flex-shrink-0">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-semibold text-green-600">{statistics.totalValid}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Valid Pairs</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-amber-600">{statistics.totalInvalidDuplicates}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Invalid Duplicates</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold text-red-600">{statistics.totalCompletelyInvalid}</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">Invalid Records</div>
            </div>
          </div>
        </div>

        {/* Panel Selector */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-600 flex-shrink-0">
          <div className="flex gap-2">
            <Button
              variant={selectedPanel === 'duplicates' ? 'default' : 'outline'}
              onClick={() => setSelectedPanel('duplicates')}
              className="flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              Invalid Duplicates ({invalidDuplicatePairs.length})
            </Button>
            <Button
              variant={selectedPanel === 'invalid' ? 'default' : 'outline'}
              onClick={() => setSelectedPanel('invalid')}
              className="flex items-center gap-2"
            >
              <Archive className="w-4 h-4" />
              Invalid Records ({completelyInvalidPairs.length})
            </Button>
          </div>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-hidden">
          {selectedPanel === 'duplicates' ? (
            /* Panel 1: Invalid Duplicates */
            <div className="h-full flex flex-col">
              <div className="p-6 bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-700 flex-shrink-0">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-amber-800 dark:text-amber-200 mb-2">
                      Invalid Duplicate Pairs
                    </h3>
                    <p className="text-amber-700 dark:text-amber-300 leading-relaxed">
                      Found <span className="font-semibold">{invalidDuplicatePairs.length} pairs</span> with matching addresses but invalid names. 
                      Review each pair and decide whether to keep as valid or mark as invalid.
                    </p>
                  </div>
                </div>
                
                {selectedPairs.size > 0 && (
                  <div className="mt-4 flex gap-2">
                    <Button
                      onClick={() => handleBulkAction('valid')}
                      className="text-green-600 border-green-300 hover:bg-green-50"
                      variant="outline"
                      size="sm"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Keep {selectedPairs.size} as Valid
                    </Button>
                    <Button
                      onClick={() => handleBulkAction('completely_invalid')}
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      variant="outline"
                      size="sm"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Mark {selectedPairs.size} as Invalid
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="flex-1 overflow-auto p-6">
                <ScrollArea className="h-full">
                  <div className="space-y-4 pr-4">
                    {invalidDuplicatePairs.length === 0 ? (
                      <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                        No invalid duplicate pairs found.
                      </div>
                    ) : (
                      invalidDuplicatePairs.map(pair => (
                        <InvalidDuplicatePairDisplay
                          key={pair.id}
                          pair={pair}
                          onMovePair={handleMovePair}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          ) : (
            /* Panel 2: Invalid Records */
            <div className="h-full flex flex-col">
              <div className="p-6 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-700 flex-shrink-0">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
                      Completely Invalid Records
                    </h3>
                    <p className="text-red-700 dark:text-red-300 leading-relaxed">
                      Found <span className="font-semibold">{individualInvalidRecords.length} individual records</span> from 
                      <span className="font-semibold"> {completelyInvalidPairs.length} pairs</span> that have both invalid names and addresses.
                    </p>
                  </div>
                </div>
              </div>

              {/* Search Interface */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-600 flex-shrink-0">
                <div className="relative">
                  <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
                    <Search className="w-5 h-5 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by row number..."
                    value={searchTerm}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (/^\d*$/.test(value)) {
                        setSearchTerm(value);
                      }
                    }}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                    inputMode="numeric"
                  />
                </div>
              </div>
              
              <div className="flex-1 overflow-auto p-6">
                <ScrollArea className="h-full">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pr-4">
                    {filteredInvalidRecords.length === 0 ? (
                      <div className="col-span-full text-center py-8 text-slate-600 dark:text-slate-400">
                        {searchTerm ? 'No records found matching your search.' : 'No invalid records to display.'}
                      </div>
                    ) : (
                      filteredInvalidRecords.map(({ record, pairId, recordLabel }, index) => (
                        <CompletelyInvalidRecordCard
                          key={`${pairId}-${recordLabel}-${index}`}
                          record={record}
                          pairId={pairId}
                          recordLabel={recordLabel}
                        />
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </div>

        {/* Action Panel */}
        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
          <div className="flex gap-4">
            <Button
              onClick={onClose}
              disabled={isDeleting}
              variant="outline"
            >
              Close
            </Button>
            
            {selectedPanel === 'invalid' && completelyInvalidPairs.length > 0 && (
              <Button
                onClick={handleConfirmBulkDelete}
                disabled={isDeleting || completelyInvalidPairs.length === 0}
                className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete {completelyInvalidPairs.length} Invalid Pairs
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}