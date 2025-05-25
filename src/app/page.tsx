
"use client";

import React, { useState, useEffect } from 'react';
import type { DuplicatePair, CustomerRecord } from '@/types';
import { AppHeader } from '@/components/layout/header';
import { FileUpload } from '@/components/file-upload';
import { InteractiveDataGrid } from '@/components/interactive-data-grid';
import { CardReviewModal } from '@/components/card-review-modal';
import { DataExportActions } from '@/components/data-export-actions';
import { AiAnalysisNotification } from '@/components/ai-analysis-display';
import { useToast } from "@/hooks/use-toast";
import { Loader2, BrainCircuit, CheckCircle, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { analyzeDuplicateConfidence, type AnalyzeDuplicateConfidenceOutput } from '@/ai/flows/analyze-duplicate-confidence';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


const transformRecordForAI = (record: CustomerRecord): Record<string, string> => {
  const stringRecord: Record<string, string> = {};
  for (const key in record) {
    if (Object.prototype.hasOwnProperty.call(record, key) && record[key] !== null && record[key] !== undefined) {
      stringRecord[key] = String(record[key]);
    }
  }
  return stringRecord;
};

export default function HomePage() {
  const [duplicateData, setDuplicateData] = useState<DuplicatePair[]>([]);
  const [selectedPairForReview, setSelectedPairForReview] = useState<DuplicatePair | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { toast } = useToast();
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [isBulkMerging, setIsBulkMerging] = useState(false);
  const [showMergeConfirmation, setShowMergeConfirmation] = useState(false);
  const [pairsToMerge, setPairsToMerge] = useState<DuplicatePair[]>([]);

  const fetchAiAnalysisForPair = async (pairInput: Omit<DuplicatePair, 'status' | 'aiConfidence' | 'aiReasoning'>): Promise<Partial<DuplicatePair>> => {
    // Decide if AI analysis should run (e.g., based on score or if not already analyzed)
    // For this version, we'll run it if aiConfidence is not 'Error' or if it's a borderline case
    // The original logic to run only for borderline for demo can be kept or adjusted.
    // if (pairInput.similarityScore < 0.9 && pairInput.similarityScore > 0.6) { // Original condition
    try {
      const aiResult = await analyzeDuplicateConfidence({
        record1: transformRecordForAI(pairInput.record1),
        record2: transformRecordForAI(pairInput.record2),
        fuzzyScore: pairInput.similarityScore,
      });
      return { aiConfidence: aiResult.confidenceLevel, aiReasoning: aiResult.reasoning };
    } catch (error) {
      console.error(`AI analysis failed for pair ${pairInput.id}:`, error);
      // Return an error state for this specific pair
      return { aiConfidence: 'Error', aiReasoning: 'AI analysis failed to retrieve a result.' };
    }
    // }
    // return {}; // Return empty if no AI analysis was run
  };

  const handleFileProcessed = async (apiResponse: any) => {
    setIsLoadingData(true);
    setSelectedRowIds(new Set()); // Clear selection on new file

    try {
      // Check if duplicates array exists and has items
      if (!apiResponse.results.duplicates || apiResponse.results.duplicates.length === 0) {
        // Clear the data and return early
        setDuplicateData([]);
        return;
      }
      
      // Transform the API response into the format expected by the data grid
      const duplicateGroups = apiResponse.results.duplicates.map((group: any) => {
        const masterRecord = {
          name: group.MasterName,
          address: group.MasterAddress,
          id: group.master_uid,
          tpi: group.MasterTPI,
          rowNumber: group.MasterRow,
          city: group.MasterCity,
          country: group.MasterCountry,
          // Master record doesn't have individual scores
          overall_score: group.AvgSimilarity,
          isLowConfidence: group.IsLowConfidenceGroup
        };

        return group.Duplicates.map((duplicate: any) => ({
          id: duplicate.uid,
          record1: masterRecord,
          record2: {
            name: duplicate.Name,
            address: duplicate.Address,
            id: duplicate.uid,
            tpi: duplicate.TPI,
            rowNumber: duplicate.Row,
            city: duplicate.City,
            country: duplicate.Country,
            
            // Similarity scores
            name_score: duplicate.Name_score,
            addr_score: duplicate.Addr_score,
            city_score: duplicate.City_score,
            country_score: duplicate.Country_score,
            tpi_score: duplicate.TPI_score,
            overall_score: duplicate.Overall_score,
            
            // Match method information
            blockType: duplicate.BlockType,
            matchMethod: duplicate.MatchMethod,
            bestNameMatchMethod: duplicate.BestNameMatchMethod,
            bestAddrMatchMethod: duplicate.BestAddrMatchMethod,
            
            // Confidence information
            isLowConfidence: duplicate.IsLowConfidence,
            llm_conf: duplicate.LLM_conf
          },
          similarityScore: duplicate.Overall_score / 100,
          aiConfidence: duplicate.IsLowConfidence ? 'low' : group.AvgSimilarity >= 98 ? 'high' : 'medium',
          status: 'pending',
        }));
      }).flat();

      setDuplicateData(duplicateGroups);
      
      // Only show toast for successful deduplication with actual results
      if (duplicateGroups.length > 0) {
        toast({
          title: "Deduplication Complete",
          description: `Found ${apiResponse.results.stats.total_potential_duplicate_records} potential duplicates in ${apiResponse.results.stats.total_master_records_with_duplicates} groups.`,
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error processing API response:', error);
      toast({
        title: "Error",
        description: "Failed to process deduplication results.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleReviewPair = (pair: DuplicatePair) => {
    setSelectedPairForReview(pair);
  };

  const handleCloseModal = () => {
    setSelectedPairForReview(null);
  };

  const handleResolvePair = (pairId: string, resolution: 'merged' | 'not_duplicate' | 'skipped' | 'duplicate') => {
    setDuplicateData(prevData =>
      prevData.map(p => p.id === pairId ? { ...p, status: resolution } : p)
    );
    setSelectedPairForReview(null);
    toast({ title: "Pair Resolved", description: `Record pair ${pairId} marked as ${resolution.replace('_', ' ')}.`, variant: "default" });
  };
  
  const handleExport = (format: 'csv' | 'excel') => {
    console.log(`Exporting data to ${format}...`, duplicateData);
    toast({title: "Export Initiated (Mock)", description: `Data will be prepared for ${format.toUpperCase()} download.`});
  };

  const handleToggleRowSelection = (pairId: string) => {
    setSelectedRowIds(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(pairId)) {
        newSelected.delete(pairId);
      } else {
        newSelected.add(pairId);
      }
      return newSelected;
    });
  };

  const handleToggleSelectAll = () => {
    if (duplicateData.length === 0) return;
    if (selectedRowIds.size === duplicateData.length) {
      setSelectedRowIds(new Set());
    } else {
      setSelectedRowIds(new Set(duplicateData.map(pair => pair.id)));
    }
  };

  const handleBulkAiAnalyze = async () => {
    if (selectedRowIds.size === 0) {
      toast({ title: "No Rows Selected", description: "Please select rows to analyze.", variant: "destructive" });
      return;
    }

    setIsBulkProcessing(true);
    toast({ title: "Bulk AI Analysis Started", description: `Processing ${selectedRowIds.size} selected pair(s).` });

    // Create a temporary array for updates to avoid multiple state updates in a loop
    let updatedData = [...duplicateData];
    let successCount = 0;
    let errorCount = 0;

    for (const pairId of selectedRowIds) {
      const pairIndex = updatedData.findIndex(p => p.id === pairId);
      if (pairIndex !== -1) {
        const pairToAnalyze = updatedData[pairIndex];
        // Destructure to match fetchAiAnalysisForPair's expected input
        const { id, record1, record2, similarityScore } = pairToAnalyze;
        const aiData = await fetchAiAnalysisForPair({ id, record1, record2, similarityScore });
        
        if (aiData.aiConfidence && aiData.aiConfidence !== 'Error') {
          successCount++;
        } else if (aiData.aiConfidence === 'Error') {
          errorCount++;
        }
        updatedData[pairIndex] = { ...updatedData[pairIndex], ...aiData };
      }
    }

    setDuplicateData(updatedData);
    setIsBulkProcessing(false);
    setSelectedRowIds(new Set()); 
    
    let summaryMessage = `Bulk analysis complete. ${successCount} pair(s) successfully analyzed.`;
    if (errorCount > 0) {
      summaryMessage += ` ${errorCount} pair(s) encountered errors.`;
    }
    toast({ 
      title: "Bulk AI Analysis Finished", 
      description: summaryMessage,
      variant: errorCount > 0 ? "destructive" : "default"
    });
  };

  const handleBulkMerge = () => {
    // Only consider pending pairs with both high AI confidence AND high similarity score
    const eligiblePairs = duplicateData.filter(pair => {
      // Only consider pending pairs
      if (pair.status !== 'pending') return false;
      
      // Both conditions must be true for high confidence
      return (pair.aiConfidence === 'high' && pair.similarityScore >= 0.98);
    });

    if (eligiblePairs.length === 0) {
      toast({
        title: "No Eligible Pairs",
        description: "No pending pairs with high confidence found. Only pairs with both high AI confidence and ≥98% similarity score are eligible for automatic merging.",
        variant: "destructive"
      });
      return;
    }

    // Store pairs to merge and show confirmation dialog
    setPairsToMerge(eligiblePairs);
    setShowMergeConfirmation(true);
  };

  const confirmBulkMerge = async () => {
    setIsBulkMerging(true);
    setShowMergeConfirmation(false);
    
    // Create a temporary array for updates
    let updatedData = [...duplicateData];
    let mergeCount = 0;

    // Process each pair
    for (const pair of pairsToMerge) {
      const pairIndex = updatedData.findIndex(p => p.id === pair.id);
      if (pairIndex !== -1) {
        updatedData[pairIndex] = { ...updatedData[pairIndex], status: 'merged' };
        mergeCount++;
      }
    }

    // Update state
    setDuplicateData(updatedData);
    setIsBulkMerging(false);
    setPairsToMerge([]);
    
    toast({
      title: "Bulk Merge Complete",
      description: `Successfully merged ${mergeCount} high confidence pairs.`,
      variant: "default"
    });
  };

  const cancelBulkMerge = () => {
    setShowMergeConfirmation(false);
    setPairsToMerge([]);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader />
      <main className="container mx-auto p-4 md:p-8 space-y-8 flex-grow">
        <section aria-labelledby="file-upload-heading">
          <h2 id="file-upload-heading" className="sr-only">File Upload</h2>
          <FileUpload onFileProcessed={handleFileProcessed} />
        </section>

        {isLoadingData && (
          <div className="flex flex-col items-center justify-center text-center p-10 bg-card rounded-lg shadow-md">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-xl font-semibold text-primary">Analyzing Data...</p>
            <p className="text-muted-foreground">Please wait while we process your file and identify duplicates.</p>
          </div>
        )}

        {!isLoadingData && duplicateData.length > 0 && (
          <>
            <Card className="mb-6 shadow-md">
              <CardHeader>
                <CardTitle className="text-xl">Bulk Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* AI Analysis Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">AI Analysis</h3>
                    <div className="flex flex-wrap items-center gap-4">
                      <Button
                        onClick={handleBulkAiAnalyze}
                        disabled={selectedRowIds.size === 0 || isBulkProcessing}
                        variant="outline"
                      >
                        {isBulkProcessing ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <BrainCircuit className="mr-2 h-4 w-4" />
                        )}
                        {isBulkProcessing ? `Analyzing ${selectedRowIds.size} selected...` : `Analyze Selected (${selectedRowIds.size})`}
                      </Button>
                      {selectedRowIds.size > 0 && !isBulkProcessing && (
                        <p className="text-sm text-muted-foreground">
                          {selectedRowIds.size} {selectedRowIds.size === 1 ? 'pair' : 'pairs'} ready for AI analysis.
                        </p>
                      )}
                      {selectedRowIds.size === 0 && !isBulkProcessing && (
                        <p className="text-sm text-muted-foreground">
                          Select rows in the table below to begin.
                        </p>
                      )}
                    </div>
                    <div className="mt-2">
                      <AiAnalysisNotification />
                    </div>
                  </div>

                  {/* Merge Actions Section */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">Auto-Merge High Confidence</h3>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={handleBulkMerge}
                        disabled={isBulkMerging}
                      >
                        {isBulkMerging ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <CheckCircle className="mr-1 h-3 w-3" />}
                        Merge High Confidence Pairs
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Automatically merge duplicate entries with both high AI confidence and ≥98% similarity score.
                      All other confidence levels require manual review.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <section aria-labelledby="duplicate-grid-heading">
              <h2 id="duplicate-grid-heading" className="sr-only">Duplicate Records Grid</h2>
              <InteractiveDataGrid
                data={duplicateData}
                onReviewPair={handleReviewPair}
                onUpdatePairStatus={handleResolvePair}
                selectedRowIds={selectedRowIds}
                onToggleRowSelection={handleToggleRowSelection}
                onToggleSelectAll={handleToggleSelectAll}
              />
             
            </section>
            <section aria-labelledby="export-actions-heading" className="mt-8">
              <h2 id="export-actions-heading" className="sr-only">Export Actions</h2>
              <DataExportActions onExport={handleExport} hasData={duplicateData.length > 0} />
            </section>
          </>
        )}
        
        {!isLoadingData && duplicateData.length === 0 && (
           <div className="text-center py-10">
             <p className="text-muted-foreground text-lg">Upload a file to begin the deduplication process.</p>
           </div>
        )}

      </main>
      {selectedPairForReview && (
        <CardReviewModal
          pair={selectedPairForReview}
          isOpen={!!selectedPairForReview}
          onClose={handleCloseModal}
          onResolve={handleResolvePair}
        />
      )}
      
      {/* Confirmation Dialog for Bulk Merge */}
      <Dialog open={showMergeConfirmation} onOpenChange={setShowMergeConfirmation}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Merge</DialogTitle>
            <DialogDescription>
              You are about to merge {pairsToMerge.length} high confidence duplicate pairs.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-3">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <p className="text-sm text-muted-foreground">
              Only pairs with both high AI confidence and ≥98% similarity score will be merged.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={cancelBulkMerge}>Cancel</Button>
            <Button
              variant="default"
              className="bg-green-500 hover:bg-green-600"
              onClick={confirmBulkMerge}
            >
              Confirm Merge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
       <footer className="py-6 text-center text-sm text-muted-foreground border-t">
         © {new Date().getFullYear()} DataCleanse. All rights reserved.
       </footer>
     </div>
  );
}

    