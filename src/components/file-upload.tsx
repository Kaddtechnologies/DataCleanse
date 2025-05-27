"use client";

import type { DragEvent, ChangeEvent } from 'react';
import { type JSX, useState, useEffect, useCallback, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle, ScanLine, ArrowRight, Brain, Eye, Merge, Users, Loader2, HelpCircle, BookOpen, Play, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { LoadingOverlay } from '@/components/loading-overlay';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import readXlsxFile from 'read-excel-file';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { environment } from '../../environment';
import { 
  LOGICAL_FIELDS, 
  autoMapColumns, 
  logMappingResults, 
  validateRequiredMappings,
  type AutoMappingResult 
} from '@/lib/canonical-field-mapping';

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
  duplicates?: any[]; // Add optional duplicates array to match page.tsx expectations
};

type DeduplicationResponse = {
  message: string;
  results: DeduplicationResults;
  error: string | null;
};

interface FileUploadProps {
  onFileProcessed: (data: DeduplicationResponse) => void;
}

// Define blocking strategies with descriptions
const BLOCKING_STRATEGIES = [
  {
    id: 'use_prefix',
    name: 'Prefix Blocking',
    description: 'Groups records with the same beginning characters of names'
  },
  {
    id: 'use_metaphone',
    name: 'Metaphone',
    description: 'Uses phonetic algorithm to match names that sound similar but spelled differently'
  },
  {
    id: 'use_soundex',
    name: 'Soundex',
    description: 'Groups names with similar pronunciation regardless of spelling variations'
  },
  {
    id: 'use_ngram',
    name: 'N-Gram',
    description: 'Matches text patterns by breaking names into character sequences'
  }
];

// Help Guide Content
const HELP_GUIDE_CONTENT = `# Master Data Cleansing Help Guide

This guide explains how to use the Master Data Cleansing tool to find and manage duplicate records in your data.

## What This Tool Does

The Master Data Cleansing tool helps you find duplicate company or customer records in your Excel or CSV files. Think of it like a smart spell-checker, but for duplicate entries instead of misspelled words.

## Blocking Strategies Explained

When working with large files, searching for duplicates can be time-consuming. "Blocking strategies" help speed things up by focusing your search. Think of these like different ways to sort a deck of cards before looking for matches.

### Available Strategies

#### 1. Prefix Blocking
- **What it does:** Groups records that start with the same first few letters in their name and city
- **When to use:** Always a good starting point - very fast with good results
- **Example:** "Acme Corporation" in "New York" and "ACME Corp" in "New York" would be grouped together

#### 2. Metaphone Blocking
- **What it does:** Groups records that sound similar when pronounced
- **When to use:** Good for company names that might be spelled differently but sound the same
- **Example:** "Acme" and "Akme" would be grouped together because they sound alike

#### 3. Soundex Blocking
- **What it does:** Another way to group records that sound similar (slightly different than Metaphone)
- **When to use:** Use alongside Metaphone for better coverage
- **Example:** "Smith" and "Smyth" would be grouped together

#### 4. N-gram Blocking
- **What it does:** Groups records that share parts of words
- **When to use:** Good for catching misspellings or slight variations in names
- **Example:** "Johnson" and "Johnsen" would be grouped together

#### 5. AI Scoring
- **What it does:** Uses artificial intelligence to better determine if records are truly duplicates
- **When to use:** For final verification when you need high accuracy
- **Note:** Significantly slows down processing

## Recommended Settings for Different Situations

### Quick Check of Small Files (Under 1,000 Records)
- ✅ Prefix Blocking
- ✅ Metaphone Blocking
- ❌ Soundex Blocking
- ❌ N-gram Blocking
- ❌ AI Scoring

### Medium-Sized Files (1,000-10,000 Records)
- ✅ Prefix Blocking
- ✅ Metaphone Blocking
- ❌ Soundex Blocking
- ❌ N-gram Blocking
- ❌ AI Scoring

### Large Files (10,000-100,000 Records)
- ✅ Prefix Blocking
- ❌ Metaphone Blocking
- ❌ Soundex Blocking
- ❌ N-gram Blocking
- ❌ AI Scoring

### Very Large Files (Over 100,000 Records)
- ✅ Prefix Blocking only
- ❌ All other options

### When Accuracy is Critical
- ✅ Prefix Blocking
- ✅ Metaphone Blocking
- ✅ Soundex Blocking
- ✅ N-gram Blocking
- ✅ AI Scoring
- **Note:** This will be much slower but will find more potential duplicates

## Similarity Thresholds

The similarity threshold controls how similar records need to be to count as potential duplicates:

- **Name Threshold (default 70%):** How similar the names need to be
- **Overall Threshold (default 70%):** How similar the records are overall

### Adjusting Thresholds

- **Lower thresholds (60-70%):** Find more potential duplicates, but may include false matches
- **Medium thresholds (70-80%):** Balanced approach (recommended)
- **Higher thresholds (80-90%):** Only find very obvious duplicates

## Troubleshooting

### Common Issues

1. **No duplicates found**
   - Try lowering the similarity thresholds
   - Try different blocking strategies
   - Check your column mapping to make sure the right fields are being compared

2. **Too many false matches**
   - Increase the similarity thresholds
   - Make sure your column mapping is correct

3. **Processing is very slow**
   - Reduce the number of blocking strategies
   - Turn off N-gram Blocking and AI Scoring
   - Use only Prefix Blocking for very large files

4. **System seems frozen**
   - Large files with multiple blocking strategies can take a long time
   - Start with just Prefix Blocking and add others if needed

## Quick Tips

- Always map the "customer_name" field to the column containing company or customer names
- Start with Prefix Blocking only to get quick initial results
- Add more blocking strategies one at a time if you need more thorough results
- The threshold settings of 70% for both name and overall similarity work well for most cases
- Save AI Scoring for final verification of important data only

## Need More Help?

Contact your system administrator or the help desk for assistance.`;

// Interactive Tour Steps
const TOUR_STEPS = [
  {
    id: 'blocking-section',
    title: 'Blocking Strategy Configuration',
    content: 'This section controls how the system searches for duplicates. Blocking strategies help speed up processing by grouping similar records together before detailed comparison.',
    position: 'bottom'
  },
  {
    id: 'prefix-strategy',
    title: 'Prefix Blocking',
    content: 'The most efficient strategy - groups records that start with the same letters. Always recommended as a starting point.',
    position: 'right'
  },
  {
    id: 'metaphone-strategy',
    title: 'Metaphone Blocking',
    content: 'Groups records that sound similar when pronounced. Good for catching spelling variations of company names.',
    position: 'right'
  },
  {
    id: 'soundex-strategy',
    title: 'Soundex Blocking',
    content: 'Another phonetic matching algorithm. Use alongside Metaphone for better coverage of sound-alike names.',
    position: 'right'
  },
  {
    id: 'ngram-strategy',
    title: 'N-Gram Blocking',
    content: 'Matches text patterns by breaking names into character sequences. More thorough but significantly slower.',
    position: 'right'
  },
  {
    id: 'ai-strategy',
    title: 'AI Scoring',
    content: 'Uses artificial intelligence for the most accurate duplicate detection. Warning: This dramatically increases processing time.',
    position: 'right'
  },
  {
    id: 'thresholds-section',
    title: 'Similarity Thresholds',
    content: 'These sliders control how similar records need to be to count as potential duplicates. Lower values find more matches but may include false positives.',
    position: 'top'
  },
  {
    id: 'column-mapping',
    title: 'Column Mapping Section',
    content: 'This is where you tell the system which columns in your Excel file contain which type of data. This step is crucial for accurate duplicate detection.',
    position: 'top'
  },
  {
    id: 'customer_name-mapping',
    title: 'Customer Name Mapping (Required)',
    content: 'You MUST map this field to the column containing company or customer names. The system cannot automatically detect which column contains the actual customer names - you need to manually select the correct one.',
    position: 'right'
  },
  {
    id: 'address-mapping',
    title: 'Address Mapping (Optional)',
    content: 'Map this to your address column if available. Address information helps improve duplicate detection accuracy.',
    position: 'right'
  },
  {
    id: 'city-mapping',
    title: 'City Mapping (Optional)',
    content: 'City information is used for blocking and provides additional context for duplicate detection.',
    position: 'right'
  },
  {
    id: 'country-mapping',
    title: 'Country Mapping (Optional)',
    content: 'Country information helps provide geographic context and can improve matching accuracy.',
    position: 'right'
  },
  {
    id: 'tpi-mapping',
    title: 'Unique ID/TPI Mapping (Optional)',
    content: 'If your data has unique identifiers, map them here. This helps track records through the deduplication process.',
    position: 'right'
  }
];

export function FileUpload({ onFileProcessed }: FileUploadProps): JSX.Element {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rowCount, setRowCount] = useState<number | null>(null);
  const { toast } = useToast();
  const [columnHeaders, setColumnHeaders] = useState<string[]>([]);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deduplicationResults, setDeduplicationResults] = useState<DeduplicationResponse | null>(null);
  
  // Blocking strategy configuration state
  const [usePrefix, setUsePrefix] = useState(true);
  const [useMetaphone, setUseMetaphone] = useState(false);
  const [useSoundex, setUseSoundex] = useState(false);
  const [useNgram, setUseNgram] = useState(false);
  const [useAi, setUseAi] = useState(false);
  const [nameThreshold, setNameThreshold] = useState(70);
  const [overallThreshold, setOverallThreshold] = useState(70);
  
  // Help system state
  const [showHelpOptions, setShowHelpOptions] = useState(false);
  const [showReferenceGuide, setShowReferenceGuide] = useState(false);
  const [showInteractiveTour, setShowInteractiveTour] = useState(false);
  const [currentTourStep, setCurrentTourStep] = useState(0);
  const [tourHighlightedElement, setTourHighlightedElement] = useState<string | null>(null);
  
  // Refs for tour highlighting and file input
  const blockingSectionRef = useRef<HTMLDivElement>(null);
  const columnMappingRef = useRef<HTMLDivElement>(null);
  const thresholdsSectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Processing time estimates per 100 records (in seconds)
  const PROCESSING_TIMES = {
    prefix: 0.54,
    metaphone: 0.89,
    soundex: 1.27,
    ngram: 9.03,
    ai: 53.16,
    prefix_ai: 54,
    all_ai: 61.41
  };
  
  // Calculate estimated completion time based on selected strategies and dataset size
  const calculateEstimatedTime = useCallback(() => {
    if (!rowCount) return null;
    
    let timePerHundredRecords = 0;
    
    // Calculate base time based on selected blocking strategies
    if (useAi) {
      if (usePrefix && useMetaphone && useSoundex && useNgram) {
        timePerHundredRecords = PROCESSING_TIMES.all_ai;
      } else if (usePrefix) {
        timePerHundredRecords = PROCESSING_TIMES.prefix_ai;
      } else {
        timePerHundredRecords = PROCESSING_TIMES.ai;
      }
    } else {
      if (usePrefix) timePerHundredRecords += PROCESSING_TIMES.prefix;
      if (useMetaphone) timePerHundredRecords += PROCESSING_TIMES.metaphone;
      if (useSoundex) timePerHundredRecords += PROCESSING_TIMES.soundex;
      if (useNgram) timePerHundredRecords += PROCESSING_TIMES.ngram;
    }
    
    // Calculate total time in seconds
    const totalTimeSeconds = (timePerHundredRecords * rowCount) / 100;
    
    // Convert to minutes and seconds
    const minutes = Math.floor(totalTimeSeconds / 60);
    const seconds = Math.round(totalTimeSeconds % 60);
    
    return { minutes, seconds, totalTimeSeconds };
  }, [rowCount, usePrefix, useMetaphone, useSoundex, useNgram, useAi]);

  // Help system functions
  const startInteractiveTour = useCallback(() => {
    setShowHelpOptions(false);
    setShowInteractiveTour(true);
    setCurrentTourStep(0);
    setTourHighlightedElement(TOUR_STEPS[0].id);
    setTourCardPosition('bottom-4'); // Reset to default position
  }, []);

  const nextTourStep = useCallback(() => {
    if (currentTourStep < TOUR_STEPS.length - 1) {
      const nextStep = currentTourStep + 1;
      setCurrentTourStep(nextStep);
      setTourHighlightedElement(TOUR_STEPS[nextStep].id);
      setTourCardPosition('bottom-4'); // Reset position for recalculation
    } else {
      setShowInteractiveTour(false);
      setTourHighlightedElement(null);
      setCurrentTourStep(0);
    }
  }, [currentTourStep]);

  const previousTourStep = useCallback(() => {
    if (currentTourStep > 0) {
      const prevStep = currentTourStep - 1;
      setCurrentTourStep(prevStep);
      setTourHighlightedElement(TOUR_STEPS[prevStep].id);
      setTourCardPosition('bottom-4'); // Reset position for recalculation
    }
  }, [currentTourStep]);

  const closeTour = useCallback(() => {
    setShowInteractiveTour(false);
    setTourHighlightedElement(null);
    setCurrentTourStep(0);
  }, []);

  const openReferenceGuide = useCallback(() => {
    setShowHelpOptions(false);
    setShowReferenceGuide(true);
  }, []);

  const closeReferenceGuide = useCallback(() => {
    setShowReferenceGuide(false);
  }, []);

  // Markdown renderer for help guide
  const renderMarkdown = useCallback((content: string) => {
    // Simple markdown renderer for basic formatting
    return content
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('### ')) {
          return <h3 key={index} className="text-lg font-semibold mt-4 mb-2 text-foreground">{line.slice(4)}</h3>;
        }
        if (line.startsWith('## ')) {
          return <h2 key={index} className="text-xl font-bold mt-6 mb-3 text-foreground">{line.slice(3)}</h2>;
        }
        if (line.startsWith('# ')) {
          return <h1 key={index} className="text-2xl font-bold mt-8 mb-4 text-foreground">{line.slice(2)}</h1>;
        }
        
        // Lists
        if (line.startsWith('- ')) {
          return <li key={index} className="ml-4 mb-1 text-muted-foreground">{line.slice(2)}</li>;
        }
        if (line.match(/^\d+\. /)) {
          return <li key={index} className="ml-4 mb-1 text-muted-foreground list-decimal">{line.replace(/^\d+\. /, '')}</li>;
        }
        
        // Bold text
        if (line.includes('**')) {
          const parts = line.split('**');
          return (
            <p key={index} className="mb-2 text-muted-foreground">
              {parts.map((part, i) => 
                i % 2 === 1 ? <strong key={i} className="font-semibold text-foreground">{part}</strong> : part
              )}
            </p>
          );
        }
        
        // Regular paragraphs
        if (line.trim()) {
          return <p key={index} className="mb-2 text-muted-foreground">{line}</p>;
        }
        
        // Empty lines
        return <div key={index} className="mb-2"></div>;
      });
  }, []);

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
    setUsePrefix(true);
    setUseMetaphone(false);
    setUseSoundex(false);
    setUseNgram(false);
    setUseAi(false);
    setNameThreshold(70);
    setOverallThreshold(70);
    setEstimatedProcessingTime(null);
  }, []);

  const handleFileSelection = useCallback(async (selectedFile: File | null) => {
    setFile(selectedFile);
    if (selectedFile) {
      // Check file size limit (100MB)
      const maxSizeInBytes = 100 * 1024 * 1024; // 100MB in bytes
      if (selectedFile.size > maxSizeInBytes) {
        toast({
          title: "File Too Large",
          description: "Please select a file smaller than 100MB.",
          variant: "destructive"
        });
        return;
      }
      
      await extractColumnHeaders(selectedFile);
      await getFileRowCount(selectedFile);
      toast({ title: "File Selected", description: selectedFile.name });
    } else {
      // Clear the file input value to allow re-selecting the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
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
        error: null
      });
    }
  }, [extractColumnHeaders, getFileRowCount, toast, resetState, onFileProcessed]);

  const handleDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      void handleFileSelection(droppedFile);
    }
  }, [handleFileSelection, setIsDragging]);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, [setIsDragging]);

  const handleDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, [setIsDragging]);

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

  const [showLoadingOverlay, setShowLoadingOverlay] = useState(false);
  const [estimatedProcessingTime, setEstimatedProcessingTime] = useState<{ minutes: number; seconds: number; totalTimeSeconds: number } | null>(null);

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

    setIsLoading(true);
    setError(null);
    
    // Calculate and set estimated processing time
    const estimatedTime = calculateEstimatedTime();
    setEstimatedProcessingTime(estimatedTime);
    setShowLoadingOverlay(true);

    try {
      // Process the file and prepare form data
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
      formData.append('use_prefix', usePrefix.toString());
      formData.append('use_metaphone', useMetaphone.toString());
      formData.append('use_soundex', useSoundex.toString());
      formData.append('use_ngram', useNgram.toString());
      formData.append('use_ai', useAi.toString());
      formData.append('name_threshold', nameThreshold.toString());
      formData.append('overall_threshold', overallThreshold.toString());

      // Make API request
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

      // Update state with results
      setDeduplicationResults(responseData);
      onFileProcessed(responseData);
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
  }, [file, isLoading, convertCsvToUtf8, columnMap, toast, onFileProcessed, setDeduplicationResults, setError, setIsLoading, calculateEstimatedTime]);

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
      setUsePrefix(true);
      setUseMetaphone(false);
      setUseSoundex(false);
      setUseNgram(false);
      setUseAi(false);
      setNameThreshold(70);
      setOverallThreshold(70);
      setEstimatedProcessingTime(null);
    }
  }, [file]); // Add file as dependency

  // Handle tour highlighting
  useEffect(() => {
    if (showInteractiveTour && tourHighlightedElement) {
      const element = document.getElementById(tourHighlightedElement);
      if (element) {
        // Add tour highlight styles
        element.style.position = 'relative';
        element.style.zIndex = '51';
        element.style.boxShadow = '0 0 0 4px rgba(59, 130, 246, 0.5), 0 0 0 8px rgba(59, 130, 246, 0.2)';
        element.style.borderRadius = '8px';
        element.style.transition = 'all 0.3s ease';
        
        // Scroll to show the element with more space at the top
        element.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        
        // Add a small delay to ensure scroll completes before any additional positioning
        setTimeout(() => {
          // Scroll a bit more to ensure there's space for the tour card
          window.scrollBy({ top: -100, behavior: 'smooth' });
        }, 300);
        
        return () => {
          // Reset styles
          element.style.position = '';
          element.style.zIndex = '';
          element.style.boxShadow = '';
          element.style.borderRadius = '';
          element.style.transition = '';
        };
      }
    }
  }, [showInteractiveTour, tourHighlightedElement]);

  // Calculate tour card position to avoid overlap
  const getTourCardPosition = useCallback(() => {
    if (!showInteractiveTour || !tourHighlightedElement) {
      return 'bottom-4';
    }

    const element = document.getElementById(tourHighlightedElement);
    if (!element) {
      return 'bottom-4';
    }

    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const cardHeight = 200; // Approximate height of tour card
    const margin = 20; // Margin between element and card

    // If the highlighted element is in the bottom half of the viewport
    // and there's not enough space below it, position the card at the top
    if (rect.bottom > viewportHeight / 2 && (viewportHeight - rect.bottom) < (cardHeight + margin)) {
      return 'top-4';
    }

    return 'bottom-4';
  }, [showInteractiveTour, tourHighlightedElement]);

  const [tourCardPosition, setTourCardPosition] = useState('bottom-4');

  // Update tour card position when tour step changes
  useEffect(() => {
    if (showInteractiveTour) {
      // Use a timeout to ensure the highlighted element has been positioned
      const timer = setTimeout(() => {
        setTourCardPosition(getTourCardPosition());
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [showInteractiveTour, tourHighlightedElement, getTourCardPosition]);

  // Close help options when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showHelpOptions) {
        const target = event.target as Element;
        if (!target.closest('.relative')) {
          setShowHelpOptions(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showHelpOptions]);

  return (
    <>
      <LoadingOverlay isVisible={showLoadingOverlay} estimatedTime={estimatedProcessingTime} />
      <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Upload Customer Data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg transition-colors
            ${isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/70'}
            ${file ? 'bg-green-50 dark:bg-green-950/20 border-green-500 dark:border-green-600' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <input
            type="file"
            id="fileUpload"
            className="hidden"
            onChange={handleFileChange}
            accept=".csv,.xls,.xlsx"
            ref={fileInputRef}
          />
          {file ? (
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto text-green-600 dark:text-green-400 mb-3" />
              <p className="font-medium text-green-700 dark:text-green-400">{file.name}</p>
              <div className="text-sm text-muted-foreground">
                ({file.size > 1024 * 1024 ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : `${(file.size / 1024).toFixed(2)} KB`})
                {rowCount !== null && (
                  <span className="ml-2 flex items-center justify-center">
                    <ScanLine className="w-4 h-4 mr-1 text-muted-foreground" /> {rowCount} rows
                  </span>
                )}
              </div>
              <Button variant="link" size="sm" className="mt-2 text-destructive" onClick={() => handleFileSelection(null)}>
                Remove file
              </Button>
            </div>
          ) : (
            <>
              <UploadCloud className={`w-16 h-16 mx-auto mb-4 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
              <label htmlFor="fileUpload" className="font-medium text-primary cursor-pointer hover:underline">
                Choose a file
              </label>
              <p className="text-sm text-muted-foreground mt-1">or drag and drop</p>
              <p className="text-xs text-muted-foreground mt-2">CSV, XLS, XLSX up to 100MB</p>
            </>
          )}
        </div>

        {columnHeaders.length > 0 && (
          <>
            {/* Help System */}
            <div className="flex items-center justify-center mb-4">
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHelpOptions(!showHelpOptions)}
                  className="bg-primary/5 border-primary/20 hover:bg-primary/10 text-primary font-medium shadow-sm transition-all duration-200 hover:shadow-md"
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  Need Help?
                </Button>
                
                {showHelpOptions && (
                  <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 bg-background border border-border rounded-lg shadow-lg p-2 z-50 min-w-[200px]">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={startInteractiveTour}
                      className="w-full justify-start text-left hover:bg-primary/10"
                    >
                      <Play className="w-4 h-4 mr-2 text-primary" />
                      Interactive Tour
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={openReferenceGuide}
                      className="w-full justify-start text-left hover:bg-primary/10"
                    >
                      <BookOpen className="w-4 h-4 mr-2 text-primary" />
                      Reference Guide
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4 mb-6" ref={blockingSectionRef} id="blocking-section">
              <h3 className="text-lg font-semibold">Blocking Strategy Configuration</h3>
              <div className="flex flex-col space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {BLOCKING_STRATEGIES.map((strategy) => (
                    <div key={strategy.id} className="flex items-center space-x-2" id={`${strategy.id.replace('use_', '')}-strategy`}>
                      <Checkbox
                        id={`strategy-${strategy.id}`}
                        checked={
                          strategy.id === 'use_prefix' ? usePrefix :
                          strategy.id === 'use_metaphone' ? useMetaphone :
                          strategy.id === 'use_soundex' ? useSoundex :
                          strategy.id === 'use_ngram' ? useNgram : false
                        }
                        onCheckedChange={(checked: boolean | "indeterminate") => {
                          if (strategy.id === 'use_prefix') setUsePrefix(!!checked);
                          else if (strategy.id === 'use_metaphone') setUseMetaphone(!!checked);
                          else if (strategy.id === 'use_soundex') setUseSoundex(!!checked);
                          else if (strategy.id === 'use_ngram') setUseNgram(!!checked);
                        }}
                      />
                      <label
                        htmlFor={`strategy-${strategy.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {strategy.name}
                      </label>
                    </div>
                  ))}
                  
                  <div className="flex items-center space-x-2" id="ai-strategy">
                    <Checkbox
                      id="use-ai"
                      checked={useAi}
                      onCheckedChange={(checked: boolean | "indeterminate") => setUseAi(!!checked)}
                    />
                    <label
                      htmlFor="use-ai"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Clean with AI
                    </label>
                  </div>
                </div>
                
                <div className="bg-muted p-4 rounded-md">
                  <h4 className="text-sm font-medium mb-2">Selected Strategies:</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    {BLOCKING_STRATEGIES.map(strategy => {
                      const isSelected =
                        strategy.id === 'use_prefix' ? usePrefix :
                        strategy.id === 'use_metaphone' ? useMetaphone :
                        strategy.id === 'use_soundex' ? useSoundex :
                        strategy.id === 'use_ngram' ? useNgram : false;
                      
                      return isSelected ? (
                        <li key={strategy.id} className="text-sm">
                          <span className="font-medium">{strategy.name}:</span> {strategy.description}
                        </li>
                      ) : null;
                    })}
                    {useAi && (
                      <li className="text-sm">
                        <span className="font-medium">Clean with AI:</span> Uses AI to analyze and determine duplicate confidence
                      </li>
                    )}
                  </ul>
                  
                  {rowCount && (
                    <div className="mt-4 border-t border-border pt-3">
                      <h4 className="text-sm font-medium mb-2">Estimated Processing Time:</h4>
                      <div className="flex items-center">
                        <div className="text-sm">
                          {(() => {
                            const estimate = calculateEstimatedTime();
                            if (!estimate) return "Calculating...";
                            
                            return (
                              <span className="font-medium">
                                ~{estimate.minutes > 0 ? `${estimate.minutes} minute${estimate.minutes !== 1 ? 's' : ''}` : ''}
                                {estimate.seconds > 0 ? `${estimate.minutes > 0 ? ' ' : ''}${estimate.seconds} second${estimate.seconds !== 1 ? 's' : ''}` : ''}
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                      
                      {useAi && (
                        <div className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 p-2 rounded-md">
                          <strong>Note:</strong> AI processing significantly increases processing time. For faster results,
                          consider using non-AI strategies and using the review card's AI recommendation feature for
                          individual rows when needed.
                        </div>
                      )}
                      
                      {useNgram && !useAi && (
                        <div className="mt-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 p-2 rounded-md">
                          <strong>Note:</strong> N-Gram processing is more thorough but takes longer than other non-AI methods.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="space-y-4" ref={thresholdsSectionRef} id="thresholds-section">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="name-threshold">Name Matching Threshold: {nameThreshold}%</Label>
                    </div>
                    <Slider
                      id="name-threshold"
                      min={0}
                      max={100}
                      step={1}
                      value={[nameThreshold]}
                      onValueChange={(value: number[]) => setNameThreshold(value[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>More Inclusive</span>
                      <span>More Precise</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label htmlFor="overall-threshold">Overall Matching Threshold: {overallThreshold}%</Label>
                    </div>
                    <Slider
                      id="overall-threshold"
                      min={0}
                      max={100}
                      step={1}
                      value={[overallThreshold]}
                      onValueChange={(value: number[]) => setOverallThreshold(value[0])}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>More Inclusive</span>
                      <span>More Precise</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {columnHeaders.length > 0 && (
          <div className="space-y-4" ref={columnMappingRef} id="column-mapping">
            <h3 className="text-lg font-semibold">Map Columns to Logical Fields</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LOGICAL_FIELDS.map((field) => (
                <div key={field.key} className="space-y-2" id={`${field.key}-mapping`}>
                  <Label htmlFor={field.key}>
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    onValueChange={(value) => setColumnMap({ ...columnMap, [field.key]: value === "unmapped" ? "" : value })}
                    value={columnMap[field.key] || "unmapped"}
                    disabled={isLoading}
                  >
                    <SelectTrigger id={field.key}>
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unmapped">Unmapped</SelectItem>
                      {columnHeaders.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Auto-Mapping Feedback Section */}
        {columnHeaders.length > 0 && (
          <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-3">
            <h4 className="text-sm font-semibold text-foreground flex items-center">
              <CheckCircle className="w-4 h-4 mr-2 text-green-600 dark:text-green-400" />
              Auto-Mapping Results
            </h4>
            <div className="space-y-2">
              {LOGICAL_FIELDS.map((field) => {
                const mappedHeader = columnMap[field.key];
                const isRequired = field.required;
                
                return (
                  <div key={field.key} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-muted-foreground">
                      {field.label}
                      {isRequired && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
                    </span>
                    <div className="flex items-center">
                      {mappedHeader ? (
                        <>
                          <CheckCircle className="w-3 h-3 text-green-500 dark:text-green-400 mr-1" />
                          <span className="text-green-700 dark:text-green-400 font-medium">"{mappedHeader}"</span>
                        </>
                      ) : (
                        <>
                          {isRequired ? (
                            <>
                              <X className="w-3 h-3 text-red-500 dark:text-red-400 mr-1" />
                              <span className="text-red-600 dark:text-red-400">Required - Please map</span>
                            </>
                          ) : (
                            <>
                              <div className="w-3 h-3 rounded-full bg-muted mr-1"></div>
                              <span className="text-muted-foreground">Not mapped</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Summary feedback */}
            <div className="pt-2 border-t border-border">
              {(() => {
                const mappedCount = Object.values(columnMap).filter(Boolean).length;
                const requiredMappedCount = LOGICAL_FIELDS.filter(field => 
                  field.required && columnMap[field.key]
                ).length;
                const totalRequired = LOGICAL_FIELDS.filter(field => field.required).length;
                
                if (requiredMappedCount === totalRequired && mappedCount >= 2) {
                  return (
                    <div className="text-xs text-green-700 dark:text-green-400 flex items-center">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Ready to process! {mappedCount} field{mappedCount !== 1 ? 's' : ''} mapped.
                    </div>
                  );
                } else if (requiredMappedCount < totalRequired) {
                  return (
                    <div className="text-xs text-red-600 dark:text-red-400 flex items-center">
                      <X className="w-3 h-3 mr-1" />
                      Please map all required fields to continue.
                    </div>
                  );
                } else {
                  return (
                    <div className="text-xs text-amber-600 dark:text-amber-400 flex items-center">
                      <HelpCircle className="w-3 h-3 mr-1" />
                      Map at least 2 fields to start deduplication.
                    </div>
                  );
                }
              })()}
            </div>
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
          <div className="mt-4 space-y-4">
            <h4 className="text-lg font-semibold">Deduplication Results</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Auto Merge</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-400">{deduplicationResults.results.kpi_metrics.auto_merge}</p>
                    </div>
                    <Merge className="h-8 w-8 text-green-500 dark:text-green-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">High confidence matches (≥98%)</p>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Needs Review</p>
                      <p className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">{deduplicationResults.results.kpi_metrics.needs_review}</p>
                    </div>
                    <Eye className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Medium confidence matches (90-97%)</p>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Needs AI Analysis</p>
                      <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{deduplicationResults.results.kpi_metrics.needs_ai}</p>
                    </div>
                    <Brain className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Low confidence matches (&lt;90%)</p>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Total Duplicates</p>
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-400">{deduplicationResults.results.total_potential_duplicates}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-500 dark:text-purple-400" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Total potential matches found</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Interactive Tour Overlay */}
    {showInteractiveTour && (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm">
        {/* Tour Step Card */}
        <div className={`fixed ${tourCardPosition} left-1/2 transform -translate-x-1/2 z-52 max-w-md w-full mx-4`}>
          <Card className="shadow-2xl border-primary/20 bg-background">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    Step {currentTourStep + 1} of {TOUR_STEPS.length}
                  </Badge>
                  <h3 className="font-semibold text-foreground">{TOUR_STEPS[currentTourStep].title}</h3>
                </div>
                <Button variant="ghost" size="sm" onClick={closeTour}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-muted-foreground mb-4">{TOUR_STEPS[currentTourStep].content}</p>
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={previousTourStep}
                  disabled={currentTourStep === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <div className="flex space-x-1">
                  {TOUR_STEPS.map((_, index) => (
                    <div
                      key={index}
                      className={`w-2 h-2 rounded-full ${
                        index === currentTourStep ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={nextTourStep}
                  className="bg-primary hover:bg-primary/90"
                >
                  {currentTourStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
                  {currentTourStep !== TOUR_STEPS.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )}

    {/* Reference Guide Side Panel */}
    {showReferenceGuide && (
      <div className="fixed inset-0 z-50 flex">
        {/* Side Panel - No backdrop, just the panel */}
        <div className="ml-auto w-1/2 min-w-[500px] max-w-[800px] bg-background shadow-2xl overflow-hidden flex flex-col border-l border-border">
          {/* Header */}
          <div className="bg-primary/5 border-b border-border p-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground">Master Data Cleansing Help Guide</h2>
            </div>
            <Button variant="ghost" size="sm" onClick={closeReferenceGuide}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-background">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              {renderMarkdown(HELP_GUIDE_CONTENT)}
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
