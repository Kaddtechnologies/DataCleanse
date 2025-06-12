"use client";

import React, { useState, useMemo } from 'react';
import type { DuplicatePair } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, AlertTriangle, Search, Database, Loader2, TrendingUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { checkPairForInvalidNames } from '@/utils/record-validation';

interface MergeHighConfidencePairsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmMerge: () => void;
  highConfidencePairs: DuplicatePair[];
  isMerging?: boolean;
}

export function MergeHighConfidencePairsModal({
  isOpen,
  onClose,
  onConfirmMerge,
  highConfidencePairs,
  isMerging = false
}: MergeHighConfidencePairsModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  
  // CRITICAL SAFETY CHECK: Filter out any pairs with invalid names that shouldn't be here
  const validPairsOnly = useMemo(() => {
    const filtered = highConfidencePairs.filter(pair => {
      const { record1Invalid, record2Invalid } = checkPairForInvalidNames(pair);
      return !record1Invalid && !record2Invalid;
    });
    
    // Log warning if invalid pairs were found in high confidence list
    if (filtered.length !== highConfidencePairs.length) {
      console.warn(`Filtered out ${highConfidencePairs.length - filtered.length} pairs with invalid names from merge list`);
    }
    
    return filtered;
  }, [highConfidencePairs]);
  
  const filteredPairs = useMemo(() => {
    if (!searchTerm.trim()) {
      return validPairsOnly;
    }
    
    const searchValue = searchTerm.toLowerCase().trim();
    
    return validPairsOnly.filter(pair => {
      const record1Name = pair.record1.name?.toLowerCase() || '';
      const record2Name = pair.record2.name?.toLowerCase() || '';
      const record1Row = pair.record1.rowNumber?.toString().toLowerCase() || '';
      const record2Row = pair.record2.rowNumber?.toString().toLowerCase() || '';
      
      return record1Name.includes(searchValue) || 
             record2Name.includes(searchValue) ||
             record1Row.includes(searchValue) || 
             record2Row.includes(searchValue);
    });
  }, [validPairsOnly, searchTerm]);
  
  const handleConfirmMerge = () => {
    // Final safety check before merge
    const hasInvalidPairs = validPairsOnly.some(pair => {
      const { record1Invalid, record2Invalid } = checkPairForInvalidNames(pair);
      return record1Invalid || record2Invalid;
    });
    
    if (hasInvalidPairs) {
      console.error('CRITICAL: Attempted to merge pairs with invalid names - operation blocked');
      return;
    }
    
    onConfirmMerge();
  };

  const averageSimilarityScore = validPairsOnly.length > 0 
    ? (validPairsOnly.reduce((sum, pair) => sum + (pair.similarityScore * 100), 0) / validPairsOnly.length).toFixed(1)
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} modal={true}>
      <DialogContent className="max-w-6xl h-[85vh] bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-slate-200 dark:border-slate-700 p-0 overflow-hidden flex flex-col">
        {/* Executive Success Header */}
        <div className="relative bg-green flex-shrink-0">
          <div className="absolute inset-0 bg-gradient-to-r from-green-900/20 via-green-800/10 to-green-900/20" />
          <div className="relative p-8">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-4 text-white text-2xl font-light tracking-wide">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-2xl font-light">High Confidence Merge Preview</div>
                  <div className="text-sm text-white/80 font-light mt-1">Review records before automatic merge</div>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>
        </div>

        <div className="p-8 space-y-6 flex-1 overflow-auto">
          {/* Executive Summary */}
          <div className="bg-gradient-to-r from-green-50 to-green-50 dark:from-green-950/30 dark:to-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-green-800 dark:text-green-200 mb-2">Merge Operation Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-green-700 dark:text-green-300">
                  <div>
                    <div className="text-2xl font-semibold">{validPairsOnly.length}</div>
                    <div className="text-sm">Pairs to Merge</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{averageSimilarityScore}%</div>
                    <div className="text-sm">Avg. Similarity</div>
                  </div>
                  <div>
                    <div className="text-2xl font-semibold">{validPairsOnly.length * 2}</div>
                    <div className="text-sm">Records Affected</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Confidence Criteria */}
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h4 className="font-medium text-blue-800 dark:text-blue-200">Merge Criteria</h4>
            </div>
            <p className="text-blue-700 dark:text-blue-300 text-sm">
              Only pairs meeting <strong>both criteria</strong> are included: High AI confidence assessment AND ≥98% similarity score.
            </p>
          </div>

          {/* Warning if invalid pairs were filtered out */}
          {validPairsOnly.length !== highConfidencePairs.length && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h4 className="font-medium text-amber-800 dark:text-amber-200">Safety Filter Applied</h4>
              </div>
              <p className="text-amber-700 dark:text-amber-300 text-sm">
                <strong>{highConfidencePairs.length - validPairsOnly.length} pairs with invalid names</strong> were automatically excluded from merge operations for data safety.
              </p>
            </div>
          )}

          {/* Data Preview Section */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-700 dark:to-slate-800 p-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-slate-800 dark:text-slate-200 tracking-wide">Pairs Ready for Merge</h4>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {filteredPairs.length} of {validPairsOnly.length} pairs shown
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
                  placeholder="Search by name or row number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                />
              </div>
              
              <ScrollArea className="h-96">
                <div className="space-y-4 pr-4">
                  {filteredPairs.length === 0 ? (
                    <div className="text-center py-8 text-slate-600 dark:text-slate-400">
                      {searchTerm ? 'No pairs found matching your search.' : 'No high confidence pairs to display.'}
                    </div>
                  ) : (
                    filteredPairs.map((pair) => {
                      return (
                        <div key={pair.id} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6 border border-slate-200 dark:border-slate-600">
                          <div className="flex items-center justify-between mb-4">
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Pair ID: {pair.id}</span>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green text-white text-xs">
                                {(pair.similarityScore * 100).toFixed(1)}% Match
                              </Badge>
                              <Badge className="bg-primary-gradient text-white text-xs">
                                {pair.aiConfidence?.toLocaleUpperCase()} AI Confidence
                              </Badge>
                            </div>
                          </div>
                          
                          {/* Table format for the two records */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-600">
                                  <th className="text-left py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Field</th>
                                  <th className="text-left py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Master Record</th>
                                  <th className="text-left py-2 px-3 font-medium text-slate-700 dark:text-slate-300">Duplicate Record</th>
                                </tr>
                              </thead>
                              <tbody className="text-slate-600 dark:text-slate-400">
                                <tr className="border-b border-slate-100 dark:border-slate-600">
                                  <td className="py-2 px-3 font-medium">Name</td>
                                  <td className="py-2 px-3">{pair.record1.name || '[empty]'}</td>
                                  <td className="py-2 px-3">{pair.record2.name || '[empty]'}</td>
                                </tr>
                                <tr className="border-b border-slate-100 dark:border-slate-600">
                                  <td className="py-2 px-3 font-medium">Address</td>
                                  <td className="py-2 px-3">{pair.record1.address || '[empty]'}</td>
                                  <td className="py-2 px-3">{pair.record2.address || '[empty]'}</td>
                                </tr>
                                <tr className="border-b border-slate-100 dark:border-slate-600">
                                  <td className="py-2 px-3 font-medium">City</td>
                                  <td className="py-2 px-3">{pair.record1.city || '[empty]'}</td>
                                  <td className="py-2 px-3">{pair.record2.city || '[empty]'}</td>
                                </tr>
                                <tr className="border-b border-slate-100 dark:border-slate-600">
                                  <td className="py-2 px-3 font-medium">Country</td>
                                  <td className="py-2 px-3">{pair.record1.country || '[empty]'}</td>
                                  <td className="py-2 px-3">{pair.record2.country || '[empty]'}</td>
                                </tr>
                                <tr className="border-b border-slate-100 dark:border-slate-600">
                                  <td className="py-2 px-3 font-medium">TPI</td>
                                  <td className="py-2 px-3">{pair.record1.tpi || '[empty]'}</td>
                                  <td className="py-2 px-3">{pair.record2.tpi || '[empty]'}</td>
                                </tr>
                                <tr>
                                  <td className="py-2 px-3 font-medium">Row Number</td>
                                  <td className="py-2 px-3">{pair.record1.rowNumber || 'N/A'}</td>
                                  <td className="py-2 px-3">{pair.record2.rowNumber || 'N/A'}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Additional similarity scores if available */}
                          {pair.record2.name_score && (
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600">
                              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Detailed Similarity Scores:</div>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
                                <div className="bg-white dark:bg-slate-800 p-2 rounded border">
                                  <div className="font-medium">Name</div>
                                  <div className="text-green-600">{pair.record2.name_score?.toFixed(1)}%</div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-2 rounded border">
                                  <div className="font-medium">Address</div>
                                  <div className="text-green-600">{pair.record2.addr_score?.toFixed(1)}%</div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-2 rounded border">
                                  <div className="font-medium">City</div>
                                  <div className="text-green-600">{pair.record2.city_score?.toFixed(1)}%</div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-2 rounded border">
                                  <div className="font-medium">Country</div>
                                  <div className="text-green-600">{pair.record2.country_score?.toFixed(1)}%</div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-2 rounded border">
                                  <div className="font-medium">TPI</div>
                                  <div className="text-green-600">{pair.record2.tpi_score?.toFixed(1)}%</div>
                                </div>
                              </div>
                            </div>
                          )}
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
              disabled={isMerging}
              className="px-6 py-3 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium tracking-wide transition-all duration-300"
            >
              Cancel Operation
            </button>
            
            <button
              onClick={handleConfirmMerge}
              disabled={isMerging || validPairsOnly.length === 0}
              className="flex-1 px-6 py-3 rounded-xl bg-green hover:opacity-90 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold tracking-wide transition-all duration-300 shadow-lg hover:shadow-xl disabled:shadow-none flex items-center justify-center space-x-3"
            >
              {isMerging ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Processing Merge...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  <span>Confirm Merge of {validPairsOnly.length} Pair{validPairsOnly.length !== 1 ? 's' : ''}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}