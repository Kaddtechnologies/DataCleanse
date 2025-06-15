"use client";

import React, { useState, useEffect, useMemo } from 'react';
import type { DuplicatePair, CustomerRecord } from '@/types';
import { AppHeader } from '@/components/layout/header';
import { FileUpload } from '@/components/file-upload';
import { InteractiveDataGrid } from '@/components/interactive-data-grid';
import { CardReviewModal } from '@/components/card-review-modal';
import { DataExportActions } from '@/components/data-export-actions';
import { useToast } from "@/hooks/use-toast";
import { useSessionStats } from "@/hooks/use-session-stats";
import { useSessionPersistence } from "@/hooks/use-session-persistence";
import { useIsMobile } from "@/hooks/use-mobile";
import { Loader2, CheckCircle, AlertTriangle, FileText, Trash2 } from 'lucide-react';
import { categorizeInvalidPairs, checkPairForInvalidNames } from '@/utils/record-validation';
import { DeleteInvalidRecordsModal } from '@/components/delete-invalid-records-modal';
import { MergeHighConfidencePairsModal } from '@/components/merge-high-confidence-pairs-modal';
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
const isMobile = useIsMobile();
  const [duplicateData, setDuplicateData] = useState<DuplicatePair[]>([]);
  const [selectedPairForReview, setSelectedPairForReview] = useState<DuplicatePair | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [loadingType, setLoadingType] = useState<'processing' | 'loading_session'>('processing');
  const { toast } = useToast();
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [isBulkMerging, setIsBulkMerging] = useState(false);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [pairsToMerge, setPairsToMerge] = useState<DuplicatePair[]>([]);
  const [hasBulkMergedThisSession, setHasBulkMergedThisSession] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Session management state
  const [showSessionManager, setShowSessionManager] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionMetadata, setSessionMetadata] = useState<Record<string, any> | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'none' | 'ready' | 'active'>('none');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [sessionToLoadInFileUpload, setSessionToLoadInFileUpload] = useState<string | null>(null);
  const [refreshStatsCounter, setRefreshStatsCounter] = useState(0);
  
  // Real-time session statistics
  const { stats: sessionStats, refreshStats } = useSessionStats(currentSessionId);
  
  // Session persistence
  const { updateSessionMetadata, updateDuplicatePair } = useSessionPersistence();
  
  // Invalid records state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [invalidRecordPairs, setInvalidRecordPairs] = useState<DuplicatePair[]>([]);
  const [summaryMessage, setSummaryMessage] = useState<string | null>(null);

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
    setLoadingType('processing');
    setSelectedRowIds(new Set()); // Clear selection on new file
    
    // Handle session status based on response
    if (apiResponse.sessionId === undefined) {
      // File was removed or cleared
      setCurrentSessionId(null);
      setSessionStatus('none');
      setLastSaved(null);
      setHasBulkMergedThisSession(false);
      setDuplicateData([]);
      setIsLoadingData(false);
      return;
    }
    
    // Store session information from response
    if (apiResponse.sessionId) {
      setCurrentSessionId(apiResponse.sessionId);
      setSessionStatus('active'); // Deduplication has started
    }
    setHasBulkMergedThisSession(false); // Reset bulk merge flag for new upload

    try {
      // Check if this is session loading data (has fromSessionLoad flag)
      if (apiResponse.fromSessionLoad) {
        // This is a session loading call - don't overwrite data, just update loading state
        setIsLoadingData(false);
        return;
      }
      
      // Check if duplicates array exists and has items
      if (!apiResponse.results?.duplicates || apiResponse.results.duplicates.length === 0) {
        // Clear the data and return early
        setDuplicateData([]);
        setIsLoadingData(false);
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

      // CRITICAL: First filter out all invalid records before any processing
      const categorizedPairs = categorizeInvalidPairs(duplicateGroups);
      const validPairs = categorizedPairs.validPairs;
      const invalidNameValidAddressPairs = categorizedPairs.invalidNameValidAddressPairs; // Need user decision
      const completelyInvalidPairs = categorizedPairs.completelyInvalidPairs; // Batch delete candidates
      
      console.log('Categorization results:', {
        total: duplicateGroups.length,
        valid: validPairs.length,
        invalidNameValidAddress: invalidNameValidAddressPairs.length,
        completelyInvalid: completelyInvalidPairs.length
      });

      // Set the data - ONLY include valid pairs in main grid
      // Invalid records should only be manipulated from the invalid records modal
      setDuplicateData(validPairs);
      setInvalidRecordPairs(completelyInvalidPairs); // Only completely invalid pairs for batch delete
      
      // Update summary message
      let summaryMessage = '';
      if (invalidNameValidAddressPairs.length > 0 || completelyInvalidPairs.length > 0) {
        const parts: string[] = [];
        if (invalidNameValidAddressPairs.length > 0) {
          parts.push(`${invalidNameValidAddressPairs.length} pairs need user review (missing names)`);
        }
        if (completelyInvalidPairs.length > 0) {
          parts.push(`${completelyInvalidPairs.length} completely invalid pairs found`);
        }
        summaryMessage = parts.join(' and ');
      }
      
      setSummaryMessage(summaryMessage || null);
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
      setSessionStatus('active'); // Loaded session is active
      
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

  // Handler for when file is ready to be processed
  const handleFileReady = () => {
    setSessionStatus('ready');
  };

  // Helper function to update last saved timestamp
  const updateLastSaved = () => {
    setLastSaved(new Date());
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
    updateLastSaved(); // Track save activity
    
    // Refresh real-time session statistics
    if (refreshStats) {
      refreshStats();
    }
    
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
    // First filter out any pairs with invalid names - these should never be merged
    const validNamePairs = duplicateData.filter(pair => {
      const { record1Invalid, record2Invalid } = checkPairForInvalidNames(pair);
      return !record1Invalid && !record2Invalid;
    });
    
    // Only consider pending pairs with both high AI confidence AND high similarity score from valid name pairs
    const eligiblePairs = validNamePairs.filter(pair => {
      // Only consider pending pairs
      if (pair.status !== 'pending') return false;
      
      // Both conditions must be true for high confidence
      return (pair.aiConfidence === 'high' && pair.similarityScore >= 0.98);
    });

    if (eligiblePairs.length === 0) {
      const invalidNameCount = duplicateData.length - validNamePairs.length;
      let message = "No pending pairs with high confidence found. Only pairs with both high AI confidence and ≥98% similarity score are eligible for automatic merging.";
      
      if (invalidNameCount > 0) {
        message += ` Note: ${invalidNameCount} pairs with invalid names were excluded from merge consideration.`;
      }
      
      toast({
        title: "No Eligible Pairs",
        description: message,
        variant: "destructive"
      });
      return;
    }

    // Store pairs to merge and show modal
    setPairsToMerge(eligiblePairs);
    setShowMergeModal(true);
  };

  const confirmBulkMerge = async () => {
    setIsBulkMerging(true);
    setShowMergeModal(false);
    
    // Create a temporary array for updates
    let updatedData = [...duplicateData];
    let mergeCount = 0;

    // Process each pair and update in database
    for (const pair of pairsToMerge) {
      const pairIndex = updatedData.findIndex(p => p.id === pair.id);
      if (pairIndex !== -1) {
        updatedData[pairIndex] = { ...updatedData[pairIndex], status: 'merged' };
        mergeCount++;
        
        // Update pair status in database
        if (pair.id && currentSessionId) {
          await updateDuplicatePair(pair.id, { status: 'merged' });
        }
      }
    }

    // Update session metadata
    if (currentSessionId) {
      await updateSessionMetadata(currentSessionId, {
        quick_actions: {
          bulk_merge_performed: true,
          bulk_merge_count: mergeCount,
          bulk_merge_timestamp: new Date().toISOString(),
          total_bulk_merges: (sessionMetadata?.quick_actions?.total_bulk_merges || 0) + mergeCount
        }
      });
    }

    // Update state
    setDuplicateData(updatedData);
    setIsBulkMerging(false);
    setPairsToMerge([]);
    setHasBulkMergedThisSession(true); // Mark that bulk merge has been performed
    
    // Refresh session stats
    refreshStats();
    
    toast({
      title: "Bulk Merge Complete",
      description: `Successfully merged ${mergeCount} high confidence pairs.`,
      variant: "default"
    });
  };

  const cancelBulkMerge = () => {
    setShowMergeModal(false);
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

  // Categorize valid and invalid pairs
  const categorizedData = useMemo(() => 
    categorizeInvalidPairs(duplicateData || []), [duplicateData]
  );
  
  const { validPairs, invalidNameValidAddressPairs, completelyInvalidPairs, statistics } = categorizedData;
  const invalidPairs = completelyInvalidPairs;

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
  // Handle loading a session from the header
  const handleLoadSession = async (sessionId: string) => {
    setIsLoadingData(true); // Show loading indicator
    setLoadingType('loading_session');
    try {
      console.log(`Starting to load session ${sessionId}`);
      
      // First, load session metadata and statistics quickly (no duplicate pairs)
      const sessionResponse = await fetch(`/api/sessions/${sessionId}/load`);
      if (!sessionResponse.ok) {
        throw new Error('Failed to load session');
      }
      
      const sessionData = await sessionResponse.json();
      console.log(`Session metadata loaded for ${sessionId}:`, sessionData);
      
      if (!sessionData.success) {
        throw new Error(sessionData.error || 'Failed to load session');
      }
      
      // Set session metadata first
      setCurrentSessionId(sessionId);
      setSessionMetadata(sessionData.session?.metadata || {});
      setSessionStatus('active');
      setLastSaved(new Date()); // Set last saved to now since we just loaded
      
      // Trigger file upload component to restore its state
      setSessionToLoadInFileUpload(sessionId);
      
      // Clear the session loading trigger after a brief delay
      setTimeout(() => {
        setSessionToLoadInFileUpload(null);
      }, 100);
      
      // Now load first page of duplicate pairs if they exist
      if (sessionData.statistics?.total_pairs > 0) {
        console.log(`Loading first page of duplicate pairs for session ${sessionId}`);
        const pairsResponse = await fetch(`/api/sessions/${sessionId}/pairs?page=1&limit=50`);
        
        if (pairsResponse.ok) {
          const pairsData = await pairsResponse.json();
          
          if (pairsData.success && pairsData.duplicate_pairs) {
            setDuplicateData(pairsData.duplicate_pairs);
            
            // Restore UI state from metadata
            const metadata = sessionData.session?.metadata || {};
            
            // Check if bulk merge was performed
            const hasBulkMergeFlag = metadata.quick_actions?.bulk_merge_performed || false;
            const hasMergedRecords = pairsData.duplicate_pairs.some((pair: any) => pair.status === 'merged');
            setHasBulkMergedThisSession(hasBulkMergeFlag || hasMergedRecords);
            
            // Check for invalid records that weren't deleted
            if (metadata.invalid_records && !metadata.invalid_records.deleted) {
              const invalidPairs = pairsData.duplicate_pairs.filter((pair: DuplicatePair) => {
                return checkPairForInvalidNames(pair);
              });
              setInvalidRecordPairs(invalidPairs);
            }
            
            console.log(`Loaded ${pairsData.duplicate_pairs.length} pairs for session ${sessionId}`);
          }
        }
      } else {
        // No duplicate pairs to load
        setDuplicateData([]);
        setHasBulkMergedThisSession(false);
        setInvalidRecordPairs([]);
      }
      
      // Use statistics from the session load for progress calculation
      const statistics = sessionData.statistics || {};
      const progressPercentage = statistics.total_pairs > 0 
        ? Math.round(((statistics.total_pairs - statistics.pending) / statistics.total_pairs) * 100)
          : 0;
        
        toast({
          title: "Session Loaded",
          description: `Loaded "${sessionData.session.session_name}" with ${statistics.total_pairs || 0} total pairs (${progressPercentage}% complete).`,
          variant: "default"
        });
        
      console.log(`Session ${sessionId} loaded successfully`);
        
    } catch (error) {
      console.error('Error loading session:', error);
      // Reset states on error
      setCurrentSessionId(null);
      setSessionStatus('none');
      setDuplicateData([]);
      setSessionMetadata(null);
      setHasBulkMergedThisSession(false);
      setInvalidRecordPairs([]);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load session. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingData(false); // Hide loading indicator
    }
  };

  const handleDeleteInvalidRecords = async (pairIds: string[]) => {
    try {
      const deletedCount = pairIds.length;
      
      // Delete pairs from database
      if (currentSessionId && pairIds.length > 0) {
        const response = await fetch('/api/duplicate-pairs/delete-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pairIds })
        });
        
        if (!response.ok) {
          throw new Error('Failed to delete pairs from database');
        }
      }
      
      // Update session metadata
      if (currentSessionId) {
        await updateSessionMetadata(currentSessionId, {
          invalid_records: {
            deleted: true,
            deleted_count: deletedCount,
            deleted_timestamp: new Date().toISOString(),
            deleted_pair_ids: pairIds
          }
        });
      }
      
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
      
      // Refresh session stats
      refreshStats();
      
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

  // Session stats refresh handler
  const handleSessionStatsChanged = () => {
    setRefreshStatsCounter(prev => prev + 1);
    // Trigger real-time session statistics refresh
    if (refreshStats) {
      refreshStats();
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppHeader 
        onLoadPreviousSession={handleLoadSession}
        sessionId={currentSessionId || undefined}
        sessionStatus={sessionStatus}
        lastSaved={lastSaved}
        refreshStatsCounter={refreshStatsCounter}
      />
      <main className="container mx-auto p-4 md:p-8 space-y-8 flex-grow">
        <section aria-labelledby="file-upload-heading">
          <h2 id="file-upload-heading" className="sr-only">File Upload</h2>
          <FileUpload 
            onFileProcessed={handleFileProcessed}
            onLoadSession={handleLoadSession}
            onFileReady={handleFileReady}
            sessionToLoad={sessionToLoadInFileUpload}
            sessionStats={sessionStats}
          />
        </section>

        {isLoadingData && (
          <div className="flex flex-col items-center justify-center text-center p-10 bg-card rounded-lg shadow-md">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            {loadingType === 'loading_session' ? (
              <>
                <p className="text-xl font-semibold text-primary">Loading Session...</p>
                <p className="text-muted-foreground">Please wait while we restore your saved session and data.</p>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold text-primary">Analyzing Data...</p>
                <p className="text-muted-foreground">Please wait while we process your file and identify duplicates.</p>
              </>
            )}
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
                {/* Real-time Session Statistics (mobile only) */}
                {isMobile && sessionStats && (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{sessionStats.total_pairs}</div>
                      <div className="text-xs text-muted-foreground">Total Pairs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{sessionStats.pending}</div>
                      <div className="text-xs text-muted-foreground">Awaiting Review</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600 dark:text-red-400">{sessionStats.duplicate}</div>
                      <div className="text-xs text-muted-foreground">Confirmed Duplicates</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">{sessionStats.not_duplicate}</div>
                      <div className="text-xs text-muted-foreground">Confirmed Unique</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{sessionStats.skipped}</div>
                      <div className="text-xs text-muted-foreground">Skipped/Deferred</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{sessionStats.auto_merged}</div>
                      <div className="text-xs text-muted-foreground">Auto-Merged</div>
                    </div>
                  </div>
                )}

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
                {(invalidNameValidAddressPairs.length > 0 || completelyInvalidPairs.length > 0) && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <h3 className="font-medium text-sm text-red-800 dark:text-red-200">Invalid Records Detected</h3>
                      </div>
                      <p className="text-xs text-red-700 dark:text-red-300">
                        Found {invalidNameValidAddressPairs.length} pairs needing user review and {completelyInvalidPairs.length} invalid singles affecting {statistics.totalRecordsAffected} total records.
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
                          Clean Up Invalid Data
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
                sessionId={currentSessionId || undefined}
                onSessionStatsChanged={handleSessionStatsChanged}
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
          sessionId={currentSessionId || undefined}
          onSessionStatsChanged={handleSessionStatsChanged}
        />
      )}
      
      {/* Merge High Confidence Pairs Modal */}
      {showMergeModal && (
        <MergeHighConfidencePairsModal
          isOpen={showMergeModal}
          onClose={cancelBulkMerge}
          onConfirmMerge={confirmBulkMerge}
          highConfidencePairs={pairsToMerge}
          isMerging={isBulkMerging}
        />
      )}

      {/* Delete Invalid Records Modal */}
      {showDeleteModal && (
        <DeleteInvalidRecordsModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirmDelete={handleDeleteInvalidRecordsFromModal}
          invalidPairs={[...invalidNameValidAddressPairs, ...completelyInvalidPairs]}
          isDeleting={isDeleting}
        />
      )}
      
       <footer className="py-6 text-center text-sm text-muted-foreground border-t">
         © {new Date().getFullYear()} Powered by Flowserve AI. All rights reserved.
       </footer>
     </div>
  );
}

    