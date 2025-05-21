
"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { UploadCloud, FileText, CheckCircle, ScanLine, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from "@/hooks/use-toast";
import * as XLSX from 'xlsx';
import readXlsxFile from 'read-excel-file';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

// Define the logical fields the backend expects for mapping
const LOGICAL_FIELDS = [
  { key: 'customer_name', label: 'Customer Name (for matching)', required: true },
  { key: 'address', label: 'Address (for matching)', required: false },
  { key: 'city', label: 'City (for blocking/info)', required: false },
  { key: 'country', label: 'Country (for info)', required: false },
  { key: 'tpi', label: 'Unique ID/TPI (for info)', required: false },
];

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'; // Replace with your actual API base URL

interface FileUploadProps {
  onFileProcessed: (file: File) => void;
}

export function FileUpload({ onFileProcessed }: FileUploadProps) {
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
  const [deduplicationResults, setDeduplicationResults] = useState<any>(null); // Replace 'any' with your expected result type

  const getCSVRowCount = (csvFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        // A simple line count. Might need adjustment for files with trailing newlines.
        // Subtract 1 if there's a header row and you don't want to count it,
        // but for total lines, this is generally okay.
        const lines = text.split('\n').filter(line => line.trim() !== '').length;
        setRowCount(lines);
      }
    };
    reader.onerror = () => {
      toast({ title: "Error Reading File", description: "Could not read file contents to count rows.", variant: "destructive" });
      setRowCount(null);
    };
    reader.readAsText(csvFile);
  };

  const extractColumnHeaders = async (selectedFile: File) => {
    try {
      let headers: string[] = [];
      if (selectedFile.name.toLowerCase().endsWith('.csv')) {
        const text = await selectedFile.text();
        const lines = text.split('\n');
        if (lines.length > 0) {
          headers = lines[0].split(',').map(header => header.trim());
        }
      } else if (selectedFile.name.toLowerCase().endsWith('.xlsx') || selectedFile.name.toLowerCase().endsWith('.xls')) {
        const data = await readXlsxFile(selectedFile);
        if (data.length > 0) {
          headers = data[0].map((header: any) => String(header).trim());
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
  };

  // Simple normalization function
  const normalize = (text: string): string => {
    text = String(text).toLowerCase().trim();
    text = text.replace(/[^a-z0-9\s]/g, " ");
    text = text.replace(/\s+/g, " ");
    return text;
  };

  const CANDIDATE_MAP: Record<string, string[]> = {
    "customer_name": ["customer", "name", "account", "client"],
    "address": ["address", "addr", "street", "road"],
    "city": ["city", "town"],
    "country": ["country", "nation", "cntry", "co"],
    "tpi": ["tpi", "id", "num", "number", "code"],
  };

  const autoMapColumns = (headers: string[]) => {
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
  };

  const handleFileSelection = async (selectedFile: File | null) => {
    setFile(selectedFile);
 if (selectedFile) {
 await extractColumnHeaders(selectedFile);
 toast({ title: "File Selected", description: selectedFile.name });
    } else { // File was removed
      handleFileSelection(null);
    }
  };

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileSelection(event.dataTransfer.files[0]);
      toast({ title: "File Selected", description: event.dataTransfer.files[0].name });
    }
  }, [toast]);

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
 await handleFileSelection(event.target.files[0]);
    } else {
 await handleFileSelection(null);
    }
  };

  const handleDeduplicate = async () => {
    if (file) {
      setIsLoading(true);
      setError(null);
      setDeduplicationResults(null);

      const formData = new FormData();
      formData.append('file', file);

      // Filter out unmapped fields (where value is empty string) before sending
      const activeColumnMap: Record<string, string> = {};
      for (const key in columnMap) {
        if (columnMap[key]) { // Only include if a column is selected
          activeColumnMap[key] = columnMap[key];
        }
      }
      formData.append('column_map_json', JSON.stringify(activeColumnMap));

      try {
        const response = await fetch(`${API_BASE_URL}/deduplicate/`, {
          method: 'POST',
          body: formData,
          // Headers are not typically needed for FormData, browser sets them
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || data.detail || `Server error: ${response.status}`);
        }

        if (data.error) {
          setError(`Deduplication Error: ${data.message || data.error}`);
          setDeduplicationResults(null);
        } else {
          setDeduplicationResults(data); // data should be DeduplicationResponse
          onFileProcessed(data); // Pass results to parent
        }

      } catch (err: any) {
        console.error("Deduplication API error:", err);
        setError(`Failed to process deduplication: ${err.message}`);
        setDeduplicationResults(null);
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    // Reset progress and row count if file is removed
    const handleCleanup = () => 
    {
    if (!file) {
      setUploadProgress(0);
      setIsProcessing(false);
      setRowCount(null);

    // Clear column headers and map when file is removed
 setColumnHeaders([]); setColumnMap({}); setDeduplicationResults(null); setError(null);
    }
    if (!file) { setColumnHeaders([]); setColumnMap({}); setDeduplicationResults(null); setError(null); }

  return (
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
                ({(file.size / 1024).toFixed(2)} KB)
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
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Map Columns to Logical Fields</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {LOGICAL_FIELDS.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>
                    {field.label} {field.required && <span className="text-destructive">*</span>}
                  </Label>
                  <Select
                    onValueChange={(value) => setColumnMap({ ...columnMap, [field.key]: value })}
                    value={columnMap[field.key] || ""}
                    disabled={isLoading}
                  >
                    <SelectTrigger id={field.key}>
                      <SelectValue placeholder="Select a column" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Unmapped</SelectItem>
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
          <div className="mt-4 p-4 border rounded-md bg-green-50 text-green-800">
            <h4 className="font-semibold mb-2">Deduplication Results:</h4>
            {/* Display a summary or trigger the display component */}
            <p>Deduplication completed successfully. Found {deduplicationResults.potential_duplicates?.length || 0} potential duplicate groups.</p>
            {/* You might want to call onFileProcessed here with the results */}
          </div>
        )}
      </CardContent>
    </Card>
  );
  }
 }
 ) // Return cleanup function or nothing if no cleanup needed
} // Add file as a dependency
