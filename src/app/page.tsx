"use client";

import React, { useState, useEffect } from 'react';
import type { DuplicatePair, CustomerRecord } from '@/types';
import { AppHeader } from '@/components/layout/header';
import { FileUpload } from '@/components/file-upload';
import { InteractiveDataGrid } from '@/components/interactive-data-grid';
import { CardReviewModal } from '@/components/card-review-modal';
import { DataExportActions } from '@/components/data-export-actions';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';
import { analyzeDuplicateConfidence, type AnalyzeDuplicateConfidenceOutput } from '@/ai/flows/analyze-duplicate-confidence';

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

  const fetchAiAnalysisForPair = async (pair: Omit<DuplicatePair, 'status' | 'aiConfidence' | 'aiReasoning'>): Promise<Partial<DuplicatePair>> => {
    if (pair.similarityScore < 0.9 && pair.similarityScore > 0.6) { // Only run AI for borderline cases for demo
      try {
        const aiResult = await analyzeDuplicateConfidence({
          record1: transformRecordForAI(pair.record1),
          record2: transformRecordForAI(pair.record2),
          fuzzyScore: pair.similarityScore,
        });
        return { aiConfidence: aiResult.confidenceLevel, aiReasoning: aiResult.reasoning };
      } catch (error) {
        console.error(`AI analysis failed for pair ${pair.id}:`, error);
        return { aiConfidence: 'Error', aiReasoning: 'AI analysis failed.' };
      }
    }
    return {};
  };

  const handleFileProcessed = async (file: File) => {
    toast({ title: "Processing File...", description: `Simulating data extraction and deduplication for ${file.name}.` });
    setIsLoadingData(true);
    
    // Simulate API call and AI analysis
    await new Promise(resolve => setTimeout(resolve, 2000));

    const processedDataPromises = mockDuplicateDataRaw.map(async (pair) => {
      const aiData = await fetchAiAnalysisForPair(pair);
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
    // This is a mock export function
    console.log(`Exporting data to ${format}...`, duplicateData);
    // In a real app, you'd generate and download the file here.
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
            <section aria-labelledby="duplicate-grid-heading">
              <h2 id="duplicate-grid-heading" className="sr-only">Duplicate Records Grid</h2>
              <InteractiveDataGrid 
                data={duplicateData} 
                onReviewPair={handleReviewPair}
                onUpdatePairStatus={handleResolvePair} // Pass this if grid allows direct status updates
              />
            </section>
            <section aria-labelledby="export-actions-heading">
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
