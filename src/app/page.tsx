"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { DuplicatePair, CustomerRecord } from '@/types';
import { AppHeader } from '@/components/layout/header';
import { FileUpload } from '@/components/file-upload';
import { InteractiveDataGrid } from '@/components/interactive-data-grid';
import { CardReviewModal } from '@/components/card-review-modal';
import { DataExportActions } from '@/components/data-export-actions';
import { SessionManager } from '@/components/session-manager';
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, AlertTriangle, FileText, Trash2 } from 'lucide-react';
import { separateValidAndInvalidPairs } from '@/utils/record-validation';
import { DeleteInvalidRecordsModal } from '@/components/delete-invalid-records-modal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { exportDecisionAwareHtml } from '@/utils/decision-aware-html-export';
import { type AnalyzeDuplicateConfidenceOutput } from '@/ai/flows/analyze-duplicate-confidence';


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
  const [isBulkMerging, setIsBulkMerging] = useState(false);
  const [showMergeConfirmation, setShowMergeConfirmation] = useState(false);
  const [pairsToMerge, setPairsToMerge] = useState<DuplicatePair[]>([]);
  const [hasBulkMergedThisSession, setHasBulkMergedThisSession] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Session management state
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionMetadata, setSessionMetadata] = useState<Record<string, any> | null>(null);
  
  // Invalid records state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAiAnalysisForPair = async (pairInput: Omit<DuplicatePair, 'status' | 'aiConfidence' | 'aiReasoning'>): Promise<Partial<DuplicatePair>> => {
    // Decide if AI analysis should run (e.g., based on score or if not already analyzed)
    // For this version, we'll run it if aiConfidence is not 'Error' or if it's a borderline case
    // The original logic to run only for borderline for demo can be kept or adjusted.
    // if (pairInput.similarityScore < 0.9 && pairInput.similarityScore > 0.6) { // Original condition
    try {
      const response = await fetch('/api/analyze-confidence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record1: transformRecordForAI(pairInput.record1),
          record2: transformRecordForAI(pairInput.record2),
          fuzzyScore: pairInput.similarityScore,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const aiResult = await response.json();
      return { aiConfidence: aiResult.confidenceLevel, aiReasoning: aiResult.why };
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
    
    // Store session information from response
    if (apiResponse.sessionId) {
      setCurrentSessionId(apiResponse.sessionId);
    }
    setHasBulkMergedThisSession(false); // Reset bulk merge flag for new upload

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

  // Session management handlers
  const handleSessionLoad = (sessionData: any) => {
    try {
      setCurrentSessionId(sessionData.session.id);
      setSessionMetadata(sessionData.session);
      setDuplicateData(sessionData.duplicate_pairs || []);
      
      toast({
        title: "Session Restored",
        description: `Loaded ${sessionData.duplicate_pairs?.length || 0} duplicate pairs from "${sessionData.session.session_name}"`
      });
    } catch (error) {
      console.error('Error loading session:', error);
      toast({
        title: "Error Loading Session",
        description: "Failed to restore session data",
        variant: "destructive"
      });
    }
  };

  const handleReviewPair = (pair: DuplicatePair) => {
    setSelectedPairForReview(pair);
  };

  const handleCloseModal = () => {
    setSelectedPairForReview(null);
  };

  const handleResolvePair = (pairId: string, recordName: string, resolution: 'merged' | 'not_duplicate' | 'skipped' | 'duplicate') => {
    setDuplicateData(prevData =>
      prevData.map(p => p.id === pairId ? { ...p, status: resolution } : p)
    );
    setSelectedPairForReview(null);
    toast({ title: "Pair Resolved", description: `Record pair ${recordName} marked as ${resolution.replace('_', ' ')}.`, variant: "default" });
  };

  // Wrapper function for InteractiveDataGrid that only takes pairId and status
  const handleUpdatePairStatus = (pairId: string, status: 'merged' | 'not_duplicate' | 'skipped' | 'duplicate') => {
    const pair = duplicateData.find(p => p.id === pairId);
    const recordName = pair?.record1.name || 'Unknown';
    handleResolvePair(pairId, recordName, status);
  };
  
  const handleExport = (format: 'csv' | 'excel') => {
    console.log(`Exporting data to ${format}...`, duplicateData);
    toast({title: "Export Initiated", description: `Data will be prepared for ${format.toUpperCase()} download.`});
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
    setHasBulkMergedThisSession(true); // Mark that bulk merge has been performed
    
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

  const handleExportDecisionReport = async () => {
    if (!duplicateData || duplicateData.length === 0 || isExporting) return;
    
    setIsExporting(true);
    
    try {
      // Export all data for decision report
      await exportDecisionAwareHtml(
        duplicateData, // All data
        duplicateData, // Use all data since we're not filtering from this level
        {
          globalFilter: '',
          statusFilter: 'all',
          confidenceFilter: 'all',
          showInstructions: true
        }
      );
      
      setIsExporting(false);
    } catch (error) {
      console.error("Error exporting decision report:", error);
      setIsExporting(false);
    }
  };

  // Enhanced AI analysis function wrapper for the modal
  const handleAnalyzeConfidence = async (record1: Record<string, string>, record2: Record<string, string>, fuzzyScore: number) => {
    try {
      const response = await fetch('/api/analyze-confidence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          record1,
          record2,
          fuzzyScore,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("AI analysis error:", error);
      throw error;
    }
  };

  // Handle enhanced analysis results and update the duplicate data
  const handleEnhancedAnalysisComplete = (pairId: string, enhancedResults: {
    enhancedConfidence: string;
    enhancedScore: number;
    originalScore: number;
    scoreChangeReason: string;
    lastAnalyzed: string;
  }) => {
    setDuplicateData(prevData => 
      prevData.map(pair => 
        pair.id === pairId 
          ? {
              ...pair,
              enhancedConfidence: enhancedResults.enhancedConfidence,
              enhancedScore: enhancedResults.enhancedScore,
              originalScore: enhancedResults.originalScore,
              scoreChangeReason: enhancedResults.scoreChangeReason,
              lastAnalyzed: enhancedResults.lastAnalyzed
            }
          : pair
      )
    );
  };

  // Handle caching AI analysis results
  const handleCacheAnalysis = (pairId: string, analysis: any) => {
    setDuplicateData(prevData =>
      prevData.map(pair => 
        pair.id === pairId 
          ? { ...pair, cachedAiAnalysis: analysis }
          : pair
      )
    );
  };

  // Separate valid and invalid pairs
  const { validPairs, invalidPairs } = useMemo(() => 
    separateValidAndInvalidPairs(duplicateData || []), [duplicateData]
  );

  // Handle deleting invalid records from modal
  const handleDeleteInvalidRecordsFromModal = async (pairIds: string[]) => {
    if (!pairIds || pairIds.length === 0) return;
    
    setIsDeleting(true);
    try {
      await handleDeleteInvalidRecords(pairIds);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting invalid records:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle deleting invalid records
  const handleDeleteInvalidRecords = async (pairIds: string[]) => {
    try {
      const deletedCount = pairIds.length;
      
      // Remove the invalid pairs from the data
      setDuplicateData(prevData => 
        prevData.filter(pair => !pairIds.includes(pair.id))
      );
      
      // Clear any selected rows that were deleted
      setSelectedRowIds(prevSelected => {
        const newSelected = new Set(prevSelected);
        pairIds.forEach(id => newSelected.delete(id));
        return newSelected;
      });
      
      // Show success toast
      toast({
        title: "Invalid Records Deleted",
        description: `Successfully removed ${deletedCount} duplicate pair${deletedCount !== 1 ? 's' : ''} with invalid names.`,
        variant: "default"
      });
      
    } catch (error) {
      console.error('Error deleting invalid records:', error);
      toast({
        title: "Error",
        description: "Failed to delete invalid records. Please try again.",
        variant: "destructive"
      });
      throw error; // Re-throw to let the modal handle the error state
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader onLoadPreviousSession={() => setShowSessionManager(true)} />
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
            <Card className="mb-6 shadow-lg border-2">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  Bulk Actions
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Perform actions on multiple records or generate reports from your duplicate analysis.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Merge Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm mb-1">Automatic Merge</h3>
                    <p className="text-xs text-muted-foreground">
                      Automatically merge duplicate entries with both high AI confidence and ≥98% similarity score.
                    </p>
                    {hasBulkMergedThisSession && (
                      <div className="flex items-center gap-1 mt-2">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">Bulk merge completed for this upload</span>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-green hover:bg-green-700 text-white shadow-sm px-4 py-2 font-medium"
                    onClick={handleBulkMerge}
                    disabled={isBulkMerging || hasBulkMergedThisSession}
                  >
                    {isBulkMerging ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Merging...
                      </>
                    ) : hasBulkMergedThisSession ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Merge Complete
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Merge High Confidence Pairs
                      </>
                    )}
                  </Button>
                </div>

                {/* Export Section */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-muted/30 rounded-lg border">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm mb-1">Decision Report</h3>
                    <p className="text-xs text-muted-foreground">
                      Generate a comprehensive HTML report showing all decisions made during the deduplication process.
                    </p>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    className="bg-blue hover:bg-blue-700 text-white shadow-sm px-4 py-2 font-medium"
                    onClick={handleExportDecisionReport}
                    disabled={!duplicateData || duplicateData.length === 0 || isExporting}
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Report...
                      </>
                    ) : (
                      <>
                        <FileText className="mr-2 h-4 w-4" />
                        Export Decision Report
                      </>
                    )}
                  </Button>
                </div>

                {/* Invalid Records Section */}
                {invalidPairs.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <h3 className="font-medium text-sm text-red-800 dark:text-red-200">Invalid Records Detected</h3>
                      </div>
                      <p className="text-xs text-red-700 dark:text-red-300">
                        Found {invalidPairs.length} duplicate pair{invalidPairs.length !== 1 ? 's' : ''} with invalid names (empty, NaN, null, or undefined).
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="bg-red hover:bg-red-100 dark:hover:bg-red-900/30 text-white shadow-sm px-4 py-2 font-medium"
                      onClick={() => setShowDeleteModal(true)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Clean Up Invalid Records
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <section aria-labelledby="duplicate-grid-heading">
              <h2 id="duplicate-grid-heading" className="sr-only">Duplicate Records Grid</h2>
              <InteractiveDataGrid
                data={duplicateData}
                onReviewPair={handleReviewPair}
                onUpdatePairStatus={handleUpdatePairStatus}
                selectedRowIds={selectedRowIds}
                onToggleRowSelection={handleToggleRowSelection}
                onToggleSelectAll={handleToggleSelectAll}
                onDeleteInvalidRecords={handleDeleteInvalidRecords}
                sessionId={currentSessionId || undefined}
              />
             
            </section>
            {/* <section aria-labelledby="export-actions-heading" className="mt-8">
              <h2 id="export-actions-heading" className="sr-only">Export Actions</h2>
              <DataExportActions onExport={handleExport} hasData={duplicateData.length > 0} />
            </section> */}
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
          recordName={selectedPairForReview.record1.name}
          isOpen={!!selectedPairForReview}
          onClose={handleCloseModal}
          onResolve={handleResolvePair}
          onAnalyzeConfidence={handleAnalyzeConfidence}
          onEnhancedAnalysisComplete={handleEnhancedAnalysisComplete}
          onCacheAnalysis={handleCacheAnalysis}
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

      {/* Delete Invalid Records Modal */}
      {showDeleteModal && (
        <DeleteInvalidRecordsModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirmDelete={handleDeleteInvalidRecordsFromModal}
          invalidPairs={invalidPairs}
          isDeleting={isDeleting}
        />
      )}
      
       <footer className="py-6 text-center text-sm text-muted-foreground border-t">
         © {new Date().getFullYear()} Powered by Flowserve AI. All rights reserved.
       </footer>
     </div>
  );
}

    