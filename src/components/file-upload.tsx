
"use client";

import type { DragEvent, ChangeEvent } from 'react';
import { type JSX, useState, useEffect, useCallback } from 'react';
import { UploadCloud, FileText, CheckCircle, ScanLine, ArrowRight, Brain, Eye, Merge, Users, Loader2 } from 'lucide-react';
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

// Define the logical fields the backend expects for mapping
const LOGICAL_FIELDS = [
  { key: 'customer_name', label: 'Customer Name (for matching)', required: true },
  { key: 'address', label: 'Address (for matching)', required: false },
  { key: 'city', label: 'City (for blocking/info)', required: false },
  { key: 'country', label: 'Country (for info)', required: false },
  { key: 'tpi', label: 'Unique ID/TPI (for info)', required: false },
];

const API_BASE_URL = 'https://datacleansing.redocean-27211e6a.centralus.azurecontainerapps.io'; // Replace with your actual API base URL

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

  // Simple normalization function
  const normalize = useCallback((text: string): string => {
    text = String(text).toLowerCase().trim();
    text = text.replace(/[^a-z0-9\s]/g, " ");
    text = text.replace(/\s+/g, " ");
    return text;
  }, []);

  const CANDIDATE_MAP: Record<string, string[]> = {
    "customer_name": ["customer", "name", "account", "client"],
    "address": ["address", "addr", "street", "road"],
    "city": ["city", "town"],
    "country": ["country", "nation", "cntry", "co"],
    "tpi": ["tpi", "id", "num", "number", "code"],
  };

  const autoMapColumns = useCallback((headers: string[]) => {
    const detected: Record<string, string | undefined> = {};
    LOGICAL_FIELDS.forEach(field => detected[field.key] = undefined);

    headers.forEach(col => {
      const col_n = normalize(col);
      for (const key in CANDIDATE_MAP) {
        if (CANDIDATE_MAP[key].some(hint => col_n.includes(hint)) && detected[key] === undefined) {
          detected[key] = col;
        }
      }
    });

    setColumnMap(detected as Record<string, string>);
  }, [normalize]);

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
      autoMapColumns(headers);
    } catch (err) {
      console.error("Error extracting headers:", err);
      toast({ title: "Error", description: "Failed to extract column headers.", variant: "destructive" });
      setColumnHeaders([]);
      setColumnMap({});
    }
  }, [toast, autoMapColumns]);

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
      await extractColumnHeaders(selectedFile);
      await getFileRowCount(selectedFile);
      toast({ title: "File Selected", description: selectedFile.name });
    } else {
      resetState();
      // When file is removed, call onFileProcessed with empty results to clear the table
      onFileProcessed({
        message: "",
        results: {
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

      // Prepare column mapping data
      const columnMapData = {
        customer_name: columnMap.customer_name || null,
        address: columnMap.address || null,
        city: columnMap.city || null,
        country: columnMap.country || null,
        tpi: columnMap.tpi || null
      };
      formData.append('column_map_json', JSON.stringify(columnMapData));
      formData.append('encoding', 'utf-8');
      
      // Add blocking strategy configuration
      formData.append('use_prefix', usePrefix.toString());
      formData.append('use_metaphone', useMetaphone.toString());
      formData.append('use_soundex', useSoundex.toString());
      formData.append('use_ngram', useNgram.toString());
      formData.append('use_ai', useAi.toString());
      formData.append('name_threshold', nameThreshold.toString());
      formData.append('overall_threshold', overallThreshold.toString());

      // Make API request
      const response = await fetch(`${API_BASE_URL}/deduplicate/`, {
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
            ${file ? 'bg-green-50 border-green-500' : ''}`}
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
          />
          {file ? (
            <div className="text-center">
              <FileText className="w-16 h-16 mx-auto text-green-600 mb-3" />
              <p className="font-medium text-green-700">{file.name}</p>
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
              <p className="text-xs text-muted-foreground mt-2">CSV, XLS, XLSX up to 10MB</p>
            </>
          )}
        </div>

        {columnHeaders.length > 0 && (
          <div className="space-y-4 mb-6">
            <h3 className="text-lg font-semibold">Blocking Strategy Configuration</h3>
            <div className="flex flex-col space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {BLOCKING_STRATEGIES.map((strategy) => (
                  <div key={strategy.id} className="flex items-center space-x-2">
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
                
                <div className="flex items-center space-x-2">
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
                      <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                        <strong>Note:</strong> AI processing significantly increases processing time. For faster results,
                        consider using non-AI strategies and using the review card's AI recommendation feature for
                        individual rows when needed.
                      </div>
                    )}
                    
                    {useNgram && !useAi && (
                      <div className="mt-2 text-xs text-blue-600 bg-blue-50 p-2 rounded-md">
                        <strong>Note:</strong> N-Gram processing is more thorough but takes longer than other non-AI methods.
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
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
        )}

        {columnHeaders.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Map Columns to Logical Fields</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LOGICAL_FIELDS.map((field) => (
                <div key={field.key} className="space-y-2">
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
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Auto Merge</p>
                      <p className="text-2xl font-bold text-green-700">{deduplicationResults.results.kpi_metrics.auto_merge}</p>
                    </div>
                    <Merge className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">High confidence matches (≥98%)</p>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50 border-yellow-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Needs Review</p>
                      <p className="text-2xl font-bold text-yellow-700">{deduplicationResults.results.kpi_metrics.needs_review}</p>
                    </div>
                    <Eye className="h-8 w-8 text-yellow-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Medium confidence matches (90-97%)</p>
                </CardContent>
              </Card>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Needs AI Analysis</p>
                      <p className="text-2xl font-bold text-blue-700">{deduplicationResults.results.kpi_metrics.needs_ai}</p>
                    </div>
                    <Brain className="h-8 w-8 text-blue-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Low confidence matches (&lt;90%)</p>
                </CardContent>
              </Card>

              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-muted-foreground">Total Duplicates</p>
                      <p className="text-2xl font-bold text-purple-700">{deduplicationResults.results.total_potential_duplicates}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Total potential matches found</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
    </>
  );
}
