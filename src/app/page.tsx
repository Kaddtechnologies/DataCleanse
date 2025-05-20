
"use client";

import React, { useState, useEffect } from 'react';
import type { DuplicatePair, CustomerRecord } from '@/types';
import { AppHeader } from '@/components/layout/header';
import { FileUpload } from '@/components/file-upload';
import { InteractiveDataGrid } from '@/components/interactive-data-grid';
import { CardReviewModal } from '@/components/card-review-modal';
import { DataExportActions } from '@/components/data-export-actions';
import { useToast } from "@/hooks/use-toast";
import { Loader2, BrainCircuit } from 'lucide-react';
import { analyzeDuplicateConfidence, type AnalyzeDuplicateConfidenceOutput } from '@/ai/flows/analyze-duplicate-confidence';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Mock data for demonstration
const mockDuplicateDataRaw: Omit<DuplicatePair, 'status' | 'aiConfidence' | 'aiReasoning'>[] = [
  {
    id: 'pair1',
    record1: { id: 'recA1', name: 'Johnathan Doe', email: 'john.doe@example.com', address: '123 Main St, Anytown, USA', phone: '555-0101' },
    record2: { id: 'recB1', name: 'Jon Doe', email: 'johndoe@example.com', address: '123 Main Street, Anytown, USA', phone: '555-0100' },
    similarityScore: 0.85,
  },
  {
    id: 'pair2',
    record1: { id: 'recA2', name: 'Jane P. Smith', email: 'jane.smith@example.com', phone: '555-1234', city: 'New York' },
    record2: { id: 'recB2', name: 'Jayne Smith', email: 'j.smith@example.com', phone: '555-1235', city: 'Ney York' },
    similarityScore: 0.72,
  },
  {
    id: 'pair3',
    record1: { id: 'recA3', name: 'Alice Wonderland', email: 'alice@wonder.land', company: 'Mad Hatter Inc.' },
    record2: { id: 'recB3', name: 'Alicia Wonderland', email: 'alice.w@wonder.land', company: 'Mad Hatter Inc' },
    similarityScore: 0.92,
  },
   {
    id: 'pair4',
    record1: { id: 'recA4', name: 'Robert Johnson', email: 'rob.johnson@mail.com', address: '456 Oak Ave, Otherville, USA' },
    record2: { id: 'recB4', name: 'Bob Johnson', email: 'bobbyj@mail.com', address: '456 Oak Avenue, Otherville, USA' },
    similarityScore: 0.65,
  },
];

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

  const handleFileProcessed = async (file: File) => {
    toast({ title: "Processing File...", description: `Simulating data extraction and deduplication for ${file.name}.` });
    setIsLoadingData(true);
    setSelectedRowIds(new Set()); // Clear selection on new file
    
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate processing time

    const processedDataPromises = mockDuplicateDataRaw.map(async (pair) => {
      // Initial AI analysis for borderline cases (demo behavior)
      let aiData: Partial<DuplicatePair> = {};
      if (pair.similarityScore < 0.9 && pair.similarityScore > 0.6) {
        aiData = await fetchAiAnalysisForPair(pair);
      }
      return { ...pair, ...aiData, status: 'pending' as DuplicatePair['status'] };
    });

    const fullyProcessedData = await Promise.all(processedDataPromises);

    setDuplicateData(fullyProcessedData);
    setIsLoadingData(false);
    toast({ title: "Deduplication Complete", description: "Potential duplicates are ready for review.", variant: "default" });
  };

  const handleReviewPair = (pair: DuplicatePair) => {
    setSelectedPairForReview(pair);
  };

  const handleCloseModal = () => {
    setSelectedPairForReview(null);
  };

  const handleResolvePair = (pairId: string, resolution: 'merged' | 'not_duplicate' | 'skipped') => {
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
                <CardTitle className="text-xl">Bulk AI Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-4">
                  <Button
                    onClick={handleBulkAiAnalyze}
                    disabled={selectedRowIds.size === 0 || isBulkProcessing}
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
       <footer className="py-6 text-center text-sm text-muted-foreground border-t">
        © {new Date().getFullYear()} DataSift. All rights reserved.
      </footer>
    </div>
  );
}

    