"use client";

import React, { useState, useMemo } from 'react';
import type { DuplicatePair } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Trash2, AlertTriangle, Search, Database, Loader2 } from 'lucide-react';
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
    <Dialog open={isOpen} onOpenChange={() => {}} modal={true}>
      <DialogContent className="max-w-4xl h-[85vh] bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 p-0 overflow-hidden flex flex-col">
        {/* Executive Warning Header */}
        <div className="relative bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 dark:from-amber-700 dark:via-amber-600 dark:to-amber-700 flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-900/20 via-amber-800/10 to-amber-900/20" />
          <div className="relative p-8">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-4 text-white text-2xl font-light tracking-wide">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-light">Data Quality Management</div>
                  <div className="text-sm text-white/80 font-light mt-1">Remove invalid records from analysis</div>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>
        </div>

        <div className="p-8 space-y-6 flex-1 overflow-auto">
          {/* Executive Summary */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-amber-800 dark:text-amber-200 mb-2">Quality Control Action</h3>
                <p className="text-amber-700 dark:text-amber-300 leading-relaxed">
                  Remove <span className="font-semibold">{invalidPairs.length} duplicate pairs</span> containing 
                  <span className="font-semibold"> {totalRecordsAffected} records</span> with data quality issues from the current analysis session.
                </p>
              </div>
            </div>
          </div>

          {/* Data Preview Section */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-800 dark:text-slate-200 tracking-wide">Records for Removal</h4>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {filteredPairs.length} of {invalidPairs.length} pairs shown
                </div>
              </div>
            </div>

            <div className="p-6">
              {/* Search Interface */}
              <div className="relative mb-4">
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
              
              <ScrollArea className="h-64">
                <div className="space-y-3 pr-4">
                  {filteredPairs.length === 0 ? (
                    <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                      {searchTerm ? 'No pairs found matching your search.' : 'No invalid pairs to display.'}
                    </div>
                  ) : (
                    filteredPairs.map((pair) => {
                      const { record1Invalid, record2Invalid } = checkPairForInvalidNames(pair);
                      
                      return (
                        <div key={pair.id} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Pair ID: {pair.id}</span>
                            <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                              Quality Issue{(record1Invalid && record2Invalid) ? 's' : ''}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className={record1Invalid ? 'bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-700' : 'p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600'}>
                              <div className="font-medium text-slate-800 dark:text-slate-200 mb-1">Record 1</div>
                              <div className="text-slate-600 dark:text-slate-400">
                                Name: {pair.record1.name || '[empty]'}
                              </div>
                              <div className="text-slate-600 dark:text-slate-400">
                                Row: {pair.record1.rowNumber || 'N/A'}
                              </div>
                              {record1Invalid && (
                                <div className="text-amber-700 dark:text-amber-300 mt-2 text-xs font-medium">
                                  Issue: {getInvalidNameReason(pair.record1)}
                                </div>
                              )}
                            </div>
                            
                            <div className={record2Invalid ? 'bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-700' : 'p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-600'}>
                              <div className="font-medium text-slate-800 dark:text-slate-200 mb-1">Record 2</div>
                              <div className="text-slate-600 dark:text-slate-400">
                                Name: {pair.record2.name || '[empty]'}
                              </div>
                              <div className="text-slate-600 dark:text-slate-400">
                                Row: {pair.record2.rowNumber || 'N/A'}
                              </div>
                              {record2Invalid && (
                                <div className="text-amber-700 dark:text-amber-300 mt-2 text-xs font-medium">
                                  Issue: {getInvalidNameReason(pair.record2)}
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
          </div>
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
              disabled={isDeleting || invalidPairs.length === 0}
              className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center space-x-3"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Removal...</span>
                </>
              ) : (
                <>
                  <Database className="w-5 h-5" />
                  <span>Remove {invalidPairs.length} Record{invalidPairs.length !== 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}