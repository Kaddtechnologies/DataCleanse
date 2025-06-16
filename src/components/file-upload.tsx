"use client";

import type { DragEvent, ChangeEvent } from 'react';
import { type JSX, useState, useEffect, useCallback, useRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { LoadingOverlay } from '@/components/loading-overlay';
import { useSessionPersistence } from '@/hooks/use-session-persistence';
import { FileConflictDialog } from '@/components/file-conflict-dialog';
import { DeleteInvalidRecordsModal } from '@/components/delete-invalid-records-modal';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import readXlsxFile from 'read-excel-file';
// Environment import removed - not used in this file
import { 
  autoMapColumns, 
  logMappingResults, 
  validateRequiredMappings
} from '@/lib/canonical-field-mapping';
import { performComprehensiveValidation } from '@/utils/record-validation';
import type { DuplicatePair } from '@/types';
import {
  FileUploadDisplay,
  HelpSystem,
  BlockingStrategyConfig,
  ColumnMapping,
  ResultsDisplay,
  type BlockingStrategyConfigType
} from './file-upload/index';

const API_BASE_URL = ''; // Use relative URL for Next.js API routes

type DeduplicationKPIMetrics = {
  auto_merge: number;
  needs_review: number;
  needs_ai: number;
  total_blocks: number;
};

type DeduplicationStats = {
  high_confidence_duplicates_groups: number;
  medium_confidence_duplicates_groups: number;
  low_confidence_duplicates_groups: number;
  block_stats: {
    total_blocks: number;
    max_block_size: number;
    avg_block_size: number;
    records_in_blocks: number;
  };
  total_master_records_with_duplicates: number;
  total_potential_duplicate_records: number;
};

type DeduplicationResults = {
  duplicate_group_count: number;
  total_potential_duplicates: number;
  kpi_metrics: DeduplicationKPIMetrics;
  stats: DeduplicationStats;
  duplicates?: any[];
};

type DeduplicationResponse = {
  message: string;
  results: DeduplicationResults;
  error: string | null;
  sessionId?: string;
  fromSessionLoad?: boolean;
};

interface FileUploadProps {
  onFileProcessed: (data: DeduplicationResponse) => void;
  onLoadSession?: (sessionId: string) => void;
  onFileReady?: () => void;
  sessionToLoad?: string | null;
  sessionStats?: {
    total_pairs: number;
    pending: number;
    duplicate: number;
    not_duplicate: number;
    skipped: number;
    auto_merged: number;
  } | null;
}

// Processing time estimates per 100 records (in seconds)
const PROCESSING_TIMES = {
  prefix: 0.03,
  metaphone: 0.024,
  soundex: 0.035,
  ngram: 0.26,
  ai: 2.95,
  prefix_ai: 2.98,
  all_ai: 3.30
};

export function FileUpload({ onFileProcessed, onLoadSession, onFileReady, sessionToLoad, sessionStats }: FileUploadProps): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Database session management
  const { 
    createSession, 
    saveDuplicatePairs, 
    currentSession, 
    isLoading: isDbLoading, 
    error: dbError 
  } = useSessionPersistence();
  
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // File conflict detection state
  const [showFileConflictDialog, setShowFileConflictDialog] = useState(false);
  const [existingSession, setExistingSession] = useState<any>(null);
  const [suggestedFilename, setSuggestedFilename] = useState<string>('');
  const [deduplicationResults, setDeduplicationResults] = useState<DeduplicationResponse | null>(null);
  
  // Data validation modal state
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationPairs, setValidationPairs] = useState<DuplicatePair[]>([]);
  const [isDeletingInvalidRecords, setIsDeletingInvalidRecords] = useState(false);
  
  // Blocking strategy configuration state
  const [blockingConfig, setBlockingConfig] = useState<BlockingStrategyConfigType>({
    usePrefix: true,
    useMetaphone: false,
    useSoundex: false,
    useNgram: false,
    useAi: false,
    nameThreshold: 70,
    overallThreshold: 70
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [estimatedProcessingTime, setEstimatedProcessingTime] = useState<{ minutes: number; seconds: number; totalTimeSeconds: number } | null>(null);
  
  // Calculate estimated completion time based on selected strategies and dataset size
  const calculateEstimatedTime = useCallback(() => {
    if (!rowCount) return null;
    
    let timePerHundredRecords = 0;
    
    // Calculate base time based on selected blocking strategies
    if (blockingConfig.useAi) {
      if (blockingConfig.usePrefix && blockingConfig.useMetaphone && blockingConfig.useSoundex && blockingConfig.useNgram) {
        timePerHundredRecords = PROCESSING_TIMES.all_ai;
      } else if (blockingConfig.usePrefix) {
        timePerHundredRecords = PROCESSING_TIMES.prefix_ai;
      } else {
        timePerHundredRecords = PROCESSING_TIMES.ai;
      }
    } else {
      if (blockingConfig.usePrefix) timePerHundredRecords += PROCESSING_TIMES.prefix;
      if (blockingConfig.useMetaphone) timePerHundredRecords += PROCESSING_TIMES.metaphone;
      if (blockingConfig.useSoundex) timePerHundredRecords += PROCESSING_TIMES.soundex;
      if (blockingConfig.useNgram) timePerHundredRecords += PROCESSING_TIMES.ngram;
    }
    
    // Calculate total time in seconds
    const totalTimeSeconds = (timePerHundredRecords * rowCount) / 100;
    
    // Convert to minutes and seconds
    const minutes = Math.floor(totalTimeSeconds / 60);
    const seconds = Math.round(totalTimeSeconds % 60);
    
    return { minutes, seconds, totalTimeSeconds };
  }, [rowCount, blockingConfig]);

  // Auto-mapping with enhanced logging
  const performAutoMapping = useCallback((headers: string[]) => {
    const result = autoMapColumns(headers);
    
    // Log the detailed results for debugging
    logMappingResults(headers, result);
    
    // Set the column mappings
    setColumnMap(result.mappings);
  }, []);

  const getFileRowCount = useCallback(async (file: File) => {
    try {
      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(file);
        });
        const lines = text.split('\n').filter(line => line.trim() !== '').length;
        setRowCount(lines);
      } else if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
        const data = await readXlsxFile(file);
        setRowCount(data.length);
      }
    } catch (err) {
      console.error("Error counting rows:", err);
      toast({ title: "Error Reading File", description: "Could not read file contents to count rows.", variant: "destructive" });
      setRowCount(null);
    }
  }, [toast]);

  const extractColumnHeaders = useCallback(async (selectedFile: File) => {
    try {
      let headers: string[] = [];
      
      if (selectedFile.name.toLowerCase().endsWith('.csv')) {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsText(selectedFile);
        });
        
        const lines = text.split('\n');
        if (lines.length > 0) {
          headers = lines[0].split(',').map(header => header.trim());
        }
      } else if (selectedFile.name.toLowerCase().endsWith('.xlsx') || selectedFile.name.toLowerCase().endsWith('.xls')) {
        const data = await readXlsxFile(selectedFile);
        if (data.length > 0) {
          headers = data[0].map(header => String(header).trim());
        }
      }
      
      setColumnHeaders(headers);
      performAutoMapping(headers);
    } catch (err) {
      console.error("Error extracting headers:", err);
      toast({ title: "Error", description: "Failed to extract column headers.", variant: "destructive" });
      setColumnHeaders([]);
      setColumnMap({});
    }
  }, [toast, performAutoMapping]);

  const resetState = useCallback(() => {
    setColumnHeaders([]);
    setColumnMap({});
    setRowCount(null);
    setDeduplicationResults(null);
    setBlockingConfig({
      usePrefix: true,
      useMetaphone: false,
      useSoundex: false,
      useNgram: false,
      useAi: false,
      nameThreshold: 70,
      overallThreshold: 70
    });
    setEstimatedProcessingTime(null);
  }, []);

  const handleFileSelection = useCallback(async (selectedFile: File | null) => {
    if (selectedFile) {
      // Show loading overlay immediately
      setShowLoadingOverlay(true);
      
      try {
        // Check file size limit (100MB)
        const maxSizeInBytes = 100 * 1024 * 1024; // 100MB in bytes
        if (selectedFile.size > maxSizeInBytes) {
          toast({
            title: "File Too Large",
            description: "Please select a file smaller than 100MB.",
            variant: "destructive"
          });
          // Clear the file input
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
          setShowLoadingOverlay(false);
          return;
        }
        
        // Check for file conflicts before proceeding
        try {
          const response = await fetch('/api/sessions/check-filename', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ fileName: selectedFile.name }),
          });
          
          if (response.ok) {
            const conflictData = await response.json();
            
            if (conflictData.exists) {
              // Hide loading overlay before showing conflict dialog
              setShowLoadingOverlay(false);
              // Show conflict dialog
              setExistingSession(conflictData.existingSession);
              setSuggestedFilename(conflictData.suggestedFilename);
              setShowFileConflictDialog(true);
              setFile(selectedFile); // Store file for later use
              return; // Don't proceed with normal file processing yet
            }
          }
        } catch (error) {
          console.error('Error checking for file conflicts:', error);
          // Continue with normal processing if conflict check fails
        }
        
        // No conflict, proceed with normal file processing
        setFile(selectedFile);
        await extractColumnHeaders(selectedFile);
        await getFileRowCount(selectedFile);
        toast({ title: "File Selected", description: selectedFile.name });
        
        // Notify that file is ready for processing
        if (onFileReady) {
          onFileReady();
        }
      } finally {
        // Hide loading overlay after processing
        setShowLoadingOverlay(false);
      }
    } else {
      // Clear the file input value to allow re-selecting the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      setFile(null);
      resetState();
      // When file is removed, call onFileProcessed with empty results to clear the table
      onFileProcessed({
        message: "",
        results: {
          duplicates: [], // Add empty duplicates array to match expected structure
          duplicate_group_count: 0,
          total_potential_duplicates: 0,
          kpi_metrics: {
            auto_merge: 0,
            needs_review: 0,
            needs_ai: 0,
            total_blocks: 0
          },
          stats: {
            high_confidence_duplicates_groups: 0,
            medium_confidence_duplicates_groups: 0,
            low_confidence_duplicates_groups: 0,
            block_stats: {
              total_blocks: 0,
              max_block_size: 0,
              avg_block_size: 0,
              records_in_blocks: 0
            },
            total_master_records_with_duplicates: 0,
            total_potential_duplicate_records: 0
          }
        },
        error: null,
        sessionId: undefined // Clear the session ID to update header status
      });
    }
  }, [extractColumnHeaders, getFileRowCount, toast, resetState, onFileProcessed, onFileReady]);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      void handleFileSelection(droppedFile);
    }
  }, [handleFileSelection]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] || null;
    void handleFileSelection(selectedFile);
  }, [handleFileSelection]);

  const convertCsvToUtf8 = useCallback(async (csvFile: File): Promise<File> => {
    if (!csvFile.name.toLowerCase().endsWith('.csv')) {
      return csvFile;
    }

    try {
      const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
        reader.onerror = (e) => reject(new Error("Error reading file"));
        reader.readAsArrayBuffer(csvFile);
      });

      let text: string;
      try {
        const decoder = new TextDecoder('utf-8', { fatal: true });
        text = decoder.decode(buffer);
      } catch (e) {
        try {
          const decoder = new TextDecoder('windows-1252');
          text = decoder.decode(buffer);
        } catch (e) {
          const decoder = new TextDecoder('iso-8859-1');
          text = decoder.decode(buffer);
        }
      }

      const utf8Blob = new Blob([new TextEncoder().encode(text)], { type: 'text/csv;charset=utf-8' });
      return new File([utf8Blob], csvFile.name, { type: 'text/csv;charset=utf-8' });
    } catch (err) {
      console.error("Error converting CSV to UTF-8:", err);
      return csvFile;
    }
  }, []);

  // Extract original file data for row-by-row comparison
  const extractOriginalFileData = useCallback(async (file: File): Promise<{ data: any[]; headers: string[] } | null> => {
    try {
      if (file.name.toLowerCase().endsWith('.csv')) {
        // Handle CSV files
        const text = await file.text();
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        const data: Record<string, any>[] = [];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].trim()) {
            const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
            const row: Record<string, any> = { rowNumber: i };
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            data.push(row);
          }
        }
        return { data, headers };
      } else {
        // Handle Excel files
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 2) return null;
        
        const headers = jsonData[0] as string[];
        const data: Record<string, any>[] = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const values = jsonData[i] as any[];
          if (values.some(v => v !== undefined && v !== null && v !== '')) {
            const row: Record<string, any> = { rowNumber: i };
            headers.forEach((header, index) => {
              row[header] = values[index] || '';
            });
            data.push(row);
          }
        }
        return { data, headers };
      }
    } catch (error) {
      console.error('Error extracting original file data:', error);
      return null;
    }
  }, []);

  // Session loading function to restore file upload state
  const loadSessionState = useCallback(async (sessionId: string) => {
    // Show loading overlay while loading session
    setShowLoadingOverlay(true);
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}/load`);
      if (!response.ok) {
        throw new Error('Failed to load session');
      }
      
      const sessionData = await response.json();
      
      if (sessionData.success) {
        // Restore session info
        setCurrentSessionId(sessionId);
        
        // Create a mock file object for the session's file with correct file size
        const fileName = sessionData.session.file_name;
        const fileSize = sessionData.session.file_size || 0;
        
        // Create a mock blob with the correct size for display purposes
        const mockBlob = new Blob([''], { type: 'text/csv' });
        const mockFile = new File([mockBlob], fileName, { type: 'text/csv' });
        
        // Override the size property to show the correct file size
        Object.defineProperty(mockFile, 'size', {
          value: fileSize,
          writable: false
        });
        
        setFile(mockFile);
        
        // Restore blocking configuration from session config
        const config = sessionData.configuration || {};
        setBlockingConfig({
          usePrefix: config.use_prefix !== undefined ? config.use_prefix : true,
          useMetaphone: config.use_metaphone !== undefined ? config.use_metaphone : false,
          useSoundex: config.use_soundex !== undefined ? config.use_soundex : false,
          useNgram: config.use_ngram !== undefined ? config.use_ngram : false,
          useAi: config.use_ai !== undefined ? config.use_ai : false,
          nameThreshold: config.name_threshold || 70,
          overallThreshold: config.overall_threshold || 70
        });
        
        // Extract and restore column mappings from the first duplicate pair
        if (sessionData.duplicate_pairs && sessionData.duplicate_pairs.length > 0) {
          const firstPair = sessionData.duplicate_pairs[0];
          
          // Extract column headers from the record structure
          const record1 = firstPair.record1 || {};
          const record2 = firstPair.record2 || {};
          
          // Get all unique field names from both records
          const allFields = new Set([
            ...Object.keys(record1),
            ...Object.keys(record2)
          ]);
          
          // Filter out system fields and create column headers
          const systemFields = ['id', 'rowNumber', 'overall_score', 'isLowConfidence'];
          const headers = Array.from(allFields).filter(field => !systemFields.includes(field));
          setColumnHeaders(headers);
          
          // Set up column mappings based on the fields we find
          const mappings: Record<string, string> = {};
          if (headers.includes('name')) mappings.customer_name = 'name';
          if (headers.includes('address')) mappings.address = 'address';
          if (headers.includes('city')) mappings.city = 'city';
          if (headers.includes('country')) mappings.country = 'country';
          if (headers.includes('tpi')) mappings.tpi = 'tpi';
          
          setColumnMap(mappings);
          
          // Estimate row count from duplicate pairs (this is approximate)
          const estimatedRowCount = Math.max(
            ...sessionData.duplicate_pairs.map((pair: any) => 
              Math.max(
                pair.record1?.rowNumber || 0,
                pair.record2?.rowNumber || 0
              )
            )
          );
          setRowCount(estimatedRowCount);
        }
        
        // Calculate confidence level statistics from duplicate pairs
        const duplicatePairs = sessionData.duplicate_pairs || [];
        const highConfidenceCount = duplicatePairs.filter((pair: any) => {
          const score = pair.enhancedScore || (pair.similarityScore * 100);
          return score >= 98;
        }).length;
        const mediumConfidenceCount = duplicatePairs.filter((pair: any) => {
          const score = pair.enhancedScore || (pair.similarityScore * 100);
          return score >= 90 && score < 98;
        }).length;
        const lowConfidenceCount = duplicatePairs.filter((pair: any) => {
          const score = pair.enhancedScore || (pair.similarityScore * 100);
          return score < 90;
        }).length;

        // Set deduplication results to show the session has been processed with real data
        const sessionResults = {
          message: "Session loaded successfully",
          results: {
            duplicate_group_count: sessionData.statistics?.total_pairs || 0,
            total_potential_duplicates: sessionData.statistics?.total_pairs || 0,
            kpi_metrics: {
              auto_merge: sessionData.statistics?.merged + sessionData.statistics?.duplicate || 0,
              needs_review: sessionData.statistics?.pending || 0,
              needs_ai: 0,
              total_blocks: 0
            },
            stats: {
              high_confidence_duplicates_groups: highConfidenceCount,
              medium_confidence_duplicates_groups: mediumConfidenceCount,
              low_confidence_duplicates_groups: lowConfidenceCount,
              block_stats: {
                total_blocks: 0,
                max_block_size: 0,
                avg_block_size: 0,
                records_in_blocks: 0
              },
              total_master_records_with_duplicates: sessionData.statistics?.total_pairs || 0,
              total_potential_duplicate_records: sessionData.statistics?.total_pairs || 0
            }
          },
          error: null,
          sessionId: sessionId
        };
        
        setDeduplicationResults(sessionResults);
        
        // Notify parent component that file is ready
        if (onFileReady) {
          onFileReady();
        }
        
        // Call onFileProcessed to initialize the data grid with session data
        onFileProcessed({
          ...sessionResults,
          sessionId: sessionId,
          fromSessionLoad: true
        });
        
        toast({ 
          title: "Session Loaded", 
          description: `Restored session "${sessionData.session.session_name}" with ${sessionData.statistics?.total_pairs || 0} duplicate pairs.`
        });
      }
    } catch (error) {
      console.error('Error loading session in FileUpload:', error);
      toast({
        title: "Error Loading Session",
        description: "Failed to restore file upload state from session",
        variant: "destructive"
      });
    } finally {
      // Hide loading overlay after session loading completes
      setShowLoadingOverlay(false);
    }
  }, [setCurrentSessionId, setFile, setBlockingConfig, setColumnHeaders, setColumnMap, setRowCount, setDeduplicationResults, onFileReady, onFileProcessed, toast]);

  // File conflict dialog handlers
  const handleLoadExistingSession = useCallback(async (sessionId: string) => {
    if (onLoadSession) {
      setShowFileConflictDialog(false);
      await onLoadSession(sessionId);
    }
  }, [onLoadSession]);

  const handleCreateNewSession = useCallback(async (newFileName: string) => {
    if (file) {
      setShowFileConflictDialog(false);
      // Show loading overlay while processing new file
      setShowLoadingOverlay(true);
      
      try {
        // Update the file name for processing with the new incremented name
        const newFile = new File([file], newFileName, { type: file.type });
        setFile(newFile);
        await extractColumnHeaders(newFile);
        await getFileRowCount(newFile);
        toast({ title: "File Selected", description: newFile.name });
      } finally {
        setShowLoadingOverlay(false);
      }
    }
  }, [file, extractColumnHeaders, getFileRowCount, toast]);

  const handleConflictDialogClose = useCallback(() => {
    // Clear the file and reset state when user cancels the conflict dialog
    setShowFileConflictDialog(false);
    setFile(null);
    setExistingSession(null);
    setSuggestedFilename('');
    
    // Clear the file input value to allow re-selecting files
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Reset all related state
    resetState();
  }, [resetState]);

  // Validation modal handlers
  const handleDeleteInvalidRecords = useCallback(async (pairIds: string[]) => {
    setIsDeletingInvalidRecords(true);
    try {
      // Call API to delete invalid pairs from database
      const response = await fetch('/api/duplicate-pairs/delete-batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pairIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete invalid records');
      }

      const result = await response.json();
      console.log('Deleted invalid pairs:', result);

      // Update validation pairs by removing deleted ones
      setValidationPairs(prevPairs => 
        prevPairs.filter(pair => !pairIds.includes(pair.id))
      );

      // Show success message
      toast({
        title: "Records Deleted",
        description: `Successfully removed ${pairIds.length} invalid record pairs`,
        variant: "default"
      });

      // Close modal if no more pairs to validate
      const remainingPairs = validationPairs.filter(pair => !pairIds.includes(pair.id));
      const validationResults = performComprehensiveValidation(remainingPairs);
      
      if (validationResults.invalidDuplicatePairs.length === 0 && validationResults.completelyInvalidPairs.length === 0) {
        setShowValidationModal(false);
        setValidationPairs([]);
      }

    } catch (error) {
      console.error('Error deleting invalid records:', error);
      toast({
        title: "Error",
        description: "Failed to delete invalid records",
        variant: "destructive"
      });
    } finally {
      setIsDeletingInvalidRecords(false);
    }
  }, [validationPairs, toast]);

  const handleMovePair = useCallback(async (pairId: string, targetCategory: 'valid' | 'invalid_duplicates' | 'completely_invalid') => {
    try {
      // Update pair status in database
      const response = await fetch(`/api/duplicate-pairs/${pairId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: targetCategory === 'valid' ? 'pending' : 'skipped',
          validation_category: targetCategory 
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update pair status');
      }

      // Update local state
      setValidationPairs(prevPairs => 
        prevPairs.map(pair => 
          pair.id === pairId 
            ? { ...pair, status: targetCategory === 'valid' ? 'pending' as const : 'skipped' as const }
            : pair
        )
      );

      toast({
        title: "Pair Updated",
        description: `Moved pair to ${targetCategory.replace('_', ' ')} category`,
        variant: "default"
      });

    } catch (error) {
      console.error('Error moving pair:', error);
      toast({
        title: "Error",
        description: "Failed to update pair status",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleRefreshGrid = useCallback(() => {
    // Trigger a refresh of the data grid if needed
    // This would typically call the parent component's refresh function
    console.log('Refreshing data grid after validation changes');
  }, []);

  const handleCloseValidationModal = useCallback(() => {
    setShowValidationModal(false);
    setValidationPairs([]);
  }, []);

  const handleDeduplicate = useCallback(async () => {
    if (!file || isLoading) return;

    // Validate required fields
    if (!columnMap.customer_name) {
      toast({
        title: "Error",
        description: "Customer Name field mapping is required",
        variant: "destructive"
      });
      return;
    }

    // Calculate and set estimated processing time immediately
    const estimatedTime = calculateEstimatedTime();
    setEstimatedProcessingTime(estimatedTime);
    
    // Show loading overlay immediately when button is clicked
    setShowLoadingOverlay(true);
    setIsLoading(true);
    setError(null);
    
    try {
      // Process the file and prepare form data FIRST (before any database operations)
      const processedFile = await convertCsvToUtf8(file);
      const formData = new FormData();
      formData.append('file', processedFile);

      // Add individual column mapping fields
      formData.append('customer_name_column', columnMap.customer_name || '');
      formData.append('address_column', columnMap.address || '');
      formData.append('city_column', columnMap.city || '');
      formData.append('country_column', columnMap.country || '');
      formData.append('tpi_column', columnMap.tpi || '');
      
      // Add blocking strategy configuration
      formData.append('use_prefix', blockingConfig.usePrefix.toString());
      formData.append('use_metaphone', blockingConfig.useMetaphone.toString());
      formData.append('use_soundex', blockingConfig.useSoundex.toString());
      formData.append('use_ngram', blockingConfig.useNgram.toString());
      formData.append('use_ai', blockingConfig.useAi.toString());
      formData.append('name_threshold', blockingConfig.nameThreshold.toString());
      formData.append('overall_threshold', blockingConfig.overallThreshold.toString());

      // Make API request to Python backend FIRST
      const response = await fetch(`${API_BASE_URL}/api/find-duplicates`, {
        method: 'POST',
        body: formData,
      });

      // Handle response
      const contentType = response.headers.get("content-type");
      const responseData = contentType?.includes("application/json") 
        ? await response.json()
        : { error: await response.text() };

      // Check for errors
      if (!response.ok) {
        throw new Error(responseData.error || responseData.detail || `Server error: ${response.status}`);
      }

      if (responseData.error) {
        throw new Error(responseData.message || responseData.error);
      }

      // Now create database session AFTER successful API response
      const sessionName = `${file.name} - ${new Date().toLocaleString()}`;
      const processingConfig: Record<string, any> = {
        use_prefix: blockingConfig.usePrefix,
        use_metaphone: blockingConfig.useMetaphone,
        use_soundex: blockingConfig.useSoundex,
        use_ngram: blockingConfig.useNgram,
        use_ai: blockingConfig.useAi,
        name_threshold: blockingConfig.nameThreshold,
        overall_threshold: blockingConfig.overallThreshold
      };
      
      const sessionId = await createSession(
        sessionName,
        file.name,
        processingConfig
      );

      if (!sessionId) {
        throw new Error('Failed to create database session');
      }

      setCurrentSessionId(sessionId);
      
      // Extract and store original file data for row-by-row comparison (in background)
      try {
        const extractedFileData = await extractOriginalFileData(file);
        if (extractedFileData && extractedFileData.data.length > 0) {
          const dataResponse = await fetch('/api/sessions/original-data', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId: sessionId,
              fileData: extractedFileData.data,
              headers: extractedFileData.headers
            })
          });
          
          if (!dataResponse.ok) {
            console.warn('Failed to store original file data:', await dataResponse.text());
          } else {
            console.log('Successfully stored original file data with headers');
          }
        }
      } catch (error) {
        console.error('Failed to store original file data:', error);
        // Don't fail the whole process if we can't store original data
      }

      // Save duplicate pairs to database if we have results
      if (sessionId && responseData.results.duplicates && responseData.results.duplicates.length > 0) {
        console.log('Raw duplicates from backend:', responseData.results.duplicates.slice(0, 2)); // Log first 2 for debugging
        
        // Transform backend duplicate format to DuplicatePair format
        const transformedDuplicates: DuplicatePair[] = responseData.results.duplicates.map((duplicate: any, index: number) => ({
          id: `temp-${index}`, // Temporary ID, will be replaced by database
          record1: duplicate.record1 || duplicate.Record1 || duplicate.master_record || duplicate.left_record || {},
          record2: duplicate.record2 || duplicate.Record2 || duplicate.duplicate_record || duplicate.right_record || {},
          similarityScore: duplicate.similarityScore || duplicate.similarity_score || duplicate.score || 0,
          status: 'pending' as const,
          aiConfidence: duplicate.aiConfidence || duplicate.ai_confidence,
          aiReasoning: duplicate.aiReasoning || duplicate.ai_reasoning,
          enhancedConfidence: duplicate.enhancedConfidence || duplicate.enhanced_confidence,
          enhancedScore: duplicate.enhancedScore || duplicate.enhanced_score,
          originalScore: duplicate.originalScore || duplicate.original_score || (duplicate.similarityScore || duplicate.similarity_score || duplicate.score || 0) * 100
        }));
        
        console.log('Transformed duplicates:', transformedDuplicates.slice(0, 2)); // Log first 2 transformed
        
        // Validate that we have valid records before saving
        const validDuplicates = transformedDuplicates.filter(dup => {
          const hasValidRecord1 = dup.record1 && Object.keys(dup.record1).length > 0;
          const hasValidRecord2 = dup.record2 && Object.keys(dup.record2).length > 0;
          const hasValidScore = typeof dup.similarityScore === 'number' && !isNaN(dup.similarityScore);
          
          if (!hasValidRecord1 || !hasValidRecord2 || !hasValidScore) {
            console.warn('Filtering out invalid duplicate pair:', {
              hasValidRecord1,
              hasValidRecord2,
              hasValidScore,
              record1Keys: dup.record1 ? Object.keys(dup.record1) : [],
              record2Keys: dup.record2 ? Object.keys(dup.record2) : [],
              similarityScore: dup.similarityScore
            });
            return false;
          }
          return true;
        });
        
        console.log(`Saving ${validDuplicates.length} valid pairs out of ${transformedDuplicates.length} transformed`);
        
        // Perform comprehensive validation on the pairs
        const validationResults = performComprehensiveValidation(validDuplicates);
        
        // Check if we have invalid pairs that need user attention
        if (validationResults.invalidDuplicatePairs.length > 0 || validationResults.completelyInvalidPairs.length > 0) {
          console.log('Validation found invalid pairs:', {
            invalidDuplicates: validationResults.invalidDuplicatePairs.length,
            completelyInvalid: validationResults.completelyInvalidPairs.length,
            totalValid: validationResults.validPairs.length
          });
          
          // Store all pairs for validation modal (including valid ones for context)
          setValidationPairs(validDuplicates);
          setShowValidationModal(true);
          
          // Show notification about validation findings
          toast({
            title: "Data Validation Required",
            description: `Found ${validationResults.invalidDuplicatePairs.length + validationResults.completelyInvalidPairs.length} pairs requiring review`,
            variant: "default"
          });
        }
        
        if (validDuplicates.length > 0) {
          await saveDuplicatePairs(
            sessionId,
            validDuplicates,
            { name: file.name, size: file.size },
            processingConfig,
            columnMap
          );
        } else {
          console.warn('No valid duplicate pairs to save after transformation');
        }
      }
      
      // Update state with results and include session ID
      setDeduplicationResults(responseData);
      onFileProcessed({
        ...responseData,
        sessionId: sessionId
      });
    } catch (error) {
      console.error("Deduplication API error:", error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process deduplication';
      setError(errorMessage);
      setDeduplicationResults(null);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
      setShowLoadingOverlay(false);
    }
  }, [file, isLoading, convertCsvToUtf8, columnMap, toast, onFileProcessed, setDeduplicationResults, setError, setIsLoading, calculateEstimatedTime, blockingConfig, createSession, saveDuplicatePairs, extractOriginalFileData]);

  // Effect to handle session loading
  useEffect(() => {
    if (sessionToLoad) {
      loadSessionState(sessionToLoad);
    }
  }, [sessionToLoad, loadSessionState]);

  useEffect(() => {
    // Reset progress and row count if file is removed
    if (!file) {
      setUploadProgress(0);
      setIsProcessing(false);
      setRowCount(null);
      setColumnHeaders([]);
      setColumnMap({});
      setDeduplicationResults(null);
      setError(null);
      setBlockingConfig({
        usePrefix: true,
        useMetaphone: false,
        useSoundex: false,
        useNgram: false,
        useAi: false,
        nameThreshold: 70,
        overallThreshold: 70
      });
      setEstimatedProcessingTime(null);
    }
  }, [file]); // Add file as dependency

  return (
    <>
      <LoadingOverlay isVisible={showLoadingOverlay} estimatedTime={estimatedProcessingTime} />
      
      <div className="space-y-6">
        <FileUploadDisplay
          file={file}
          isDragging={isDragging}
          rowCount={rowCount}
          onFileChange={handleFileChange}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onFileRemove={() => handleFileSelection(null)}
        />

        {columnHeaders.length > 0 && (
          <div className="space-y-4">
            <HelpSystem className="mb-4" />
            
            <BlockingStrategyConfig
              config={blockingConfig}
              onConfigChange={setBlockingConfig}
              rowCount={rowCount}
              calculateEstimatedTime={calculateEstimatedTime}
            />
            
            <ColumnMapping
              columnHeaders={columnHeaders}
              columnMap={columnMap}
              onColumnMapChange={setColumnMap}
              isLoading={isLoading}
            />
          </div>
        )}

        {file && columnHeaders.length > 0 && Object.values(columnMap).filter(Boolean).length >= 2 && (
          <Button
            onClick={handleDeduplicate}
            disabled={isLoading || Object.values(columnMap).filter(Boolean).length < 2}
            className="w-full bg-accent-gradient text-accent-foreground hover:opacity-90 transition-opacity"
          >
            {isLoading ? (
              'Deduplicating...'
            ) : (
              <>
                Start Deduplication <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </Button>
        )}

        {isProcessing && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center">Processing: {uploadProgress}%</p>
          </div>
        )}

        {error && (
          <div className="text-destructive text-sm mt-4">
            Error: {error}
          </div>
        )}

        {deduplicationResults && (
          <ResultsDisplay results={deduplicationResults} sessionStats={sessionStats} className="mt-4" />
        )}
      </div>
    
      <FileConflictDialog
        isOpen={showFileConflictDialog}
        onClose={handleConflictDialogClose}
        fileName={file?.name || ''}
        existingSession={existingSession}
        suggestedFilename={suggestedFilename}
        onLoadExistingSession={handleLoadExistingSession}
        onCreateNewSession={handleCreateNewSession}
        isLoading={isLoading}
      />
      
      <DeleteInvalidRecordsModal
        isOpen={showValidationModal}
        onClose={handleCloseValidationModal}
        onConfirmDelete={handleDeleteInvalidRecords}
        invalidPairs={validationPairs}
        isDeleting={isDeletingInvalidRecords}
        onMovePair={handleMovePair}
        onRefreshGrid={handleRefreshGrid}
      />
    </>
  );
}