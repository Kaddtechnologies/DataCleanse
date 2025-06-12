"use client";

import React, { useState, useMemo } from 'react';
import type { DuplicatePair, CustomerRecord } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, AlertTriangle, Search, Database, Loader2, MapPin, Building2, Mail, Phone, Hash } from 'lucide-react';
import { categorizeInvalidPairs, checkPairForInvalidNames, getInvalidNameReason, isCompletelyInvalidRecord } from '@/utils/record-validation';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DeleteInvalidRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (pairIds: string[]) => void;
  invalidPairs: DuplicatePair[];
  isDeleting?: boolean;
}

interface InvalidRecordDisplayProps {
  record: CustomerRecord;
  pairId: string;
  recordLabel: string;
}

const InvalidRecordDisplay = ({ record, pairId, recordLabel }: InvalidRecordDisplayProps) => (
  <div className="bg-red-50 dark:bg-red-950/30 p-4 rounded-lg border border-red-200 dark:border-red-700">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {recordLabel} (Pair: {pairId})
        </span>
      </div>
      <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs">
        Completely Invalid
      </Badge>
    </div>
    
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
        <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-slate-600 dark:text-slate-400">Location:</span>
        <span className="text-red-600">
          {[record.city, record.country].filter(Boolean).join(', ') || '[empty]'}
        </span>
      </div>
      
      {record.email && (
        <div className="flex items-center space-x-2">
          <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-slate-600 dark:text-slate-400">Email:</span>
          <span className="text-slate-800 dark:text-slate-200">{record.email}</span>
        </div>
      )}
      
      {record.phone && (
        <div className="flex items-center space-x-2">
          <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <span className="text-slate-600 dark:text-slate-400">Phone:</span>
          <span className="text-slate-800 dark:text-slate-200">{record.phone}</span>
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <Hash className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <span className="text-slate-600 dark:text-slate-400">Row:</span>
        <span className="text-slate-800 dark:text-slate-200">{record.rowNumber || 'N/A'}</span>
      </div>
      
      <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded border border-red-200 dark:border-red-700">
        <div className="text-red-700 dark:text-red-300 text-xs font-medium">
          Issues: {getInvalidNameReason(record)}
          {!record.address && ', Missing address'}
          {!record.city && ', Missing city'}
        </div>
      </div>
    </div>
  </div>
);

export function DeleteInvalidRecordsModal({
  isOpen,
  onClose,
  onConfirmDelete,
  invalidPairs,
  isDeleting = false
}: DeleteInvalidRecordsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  const categorizedData = useMemo(() => {
    return categorizeInvalidPairs(invalidPairs);
  }, [invalidPairs]);
  
  // Only show completely invalid pairs in this modal
  const completelyInvalidPairs = categorizedData.completelyInvalidPairs;
  
  // Extract individual completely invalid records
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
  
  const handleConfirmDelete = () => {
    const pairIds = completelyInvalidPairs.map(pair => pair.id);
    onConfirmDelete(pairIds);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} modal={true}>
      <DialogContent className="max-w-4xl h-[85vh] bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 p-0 overflow-hidden flex flex-col">
        {/* Executive Warning Header */}
        <div className="relative bg-gradient-to-r from-red-600 via-red-500 to-red-600 dark:from-red-700 dark:via-red-600 dark:to-red-700 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-red-900/20 via-red-800/10 to-red-900/20" />
          <div className="relative p-8">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-4 text-white text-2xl font-light tracking-wide">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-light">Remove Invalid Records</div>
                  <div className="text-sm text-white/80 font-light mt-1">Records with both invalid names and addresses</div>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>
        </div>

        <div className="p-8 space-y-6 flex-1 overflow-auto">
          {/* Executive Summary */}
          <div className="bg-gradient-to-r from-red-50 to-red-25 dark:from-red-950/30 dark:to-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">Completely Invalid Records</h3>
                <div className="space-y-2 text-red-700 dark:text-red-300">
                  <p className="leading-relaxed">
                    Found <span className="font-semibold">{individualInvalidRecords.length} individual records</span> from 
                    <span className="font-semibold"> {completelyInvalidPairs.length} pairs</span> that have both invalid names and addresses.
                  </p>
                  <p className="text-sm">
                    These records cannot be used for duplicate detection and should be removed from analysis.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {completelyInvalidPairs.length > 0 && (
            <>
              {/* Search Interface */}
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

              {/* Invalid Records List */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20 p-6 border-b border-slate-200 dark:border-slate-700">
                  <h4 className="font-medium text-slate-800 dark:text-slate-200 tracking-wide">
                    Invalid Records ({filteredInvalidRecords.length} of {individualInvalidRecords.length} shown)
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Records with both missing/invalid names and addresses
                  </p>
                </div>
                
                <div className="p-6">
                  <ScrollArea className="h-64">
                    <div className="space-y-4 pr-4">
                      {filteredInvalidRecords.length === 0 ? (
                        <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                          {searchTerm ? 'No records found matching your search.' : 'No invalid records to display.'}
                        </div>
                      ) : (
                        filteredInvalidRecords.map(({ record, pairId, recordLabel }, index) => (
                          <InvalidRecordDisplay
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
            </>
          )}
        </div>

        {/* Executive Action Panel */}
        <div className="p-8 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-shrink-0">
          <div className="flex gap-4">
            <button
              onClick={onClose}
              disabled={isDeleting}
              className="px-6 py-3 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium tracking-wide transition-all duration-300"
            >
              Cancel Operation
            </button>
            
            <button
              onClick={handleConfirmDelete}
              disabled={isDeleting || completelyInvalidPairs.length === 0}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center space-x-3"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Removal...</span>
                </>
              ) : (
                <>
                  <Database className="w-5 h-5" />
                  <span>Remove {completelyInvalidPairs.length} Pair{completelyInvalidPairs.length !== 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}