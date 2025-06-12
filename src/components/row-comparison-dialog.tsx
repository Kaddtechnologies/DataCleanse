"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Loader2, TableIcon, RotateCcw, AlertTriangle } from 'lucide-react';
import { cn } from "@/lib/utils";
import type { CustomerRecord } from '@/types';

interface RowData {
  rowNumber: number;
  [key: string]: any;
}

interface RowComparisonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rowNumbers: number[];
  sessionId: string;
  title?: string;
  fallbackRecords?: CustomerRecord[]; // Fallback data when database query fails
}

export function RowComparisonDialog({
  isOpen,
  onClose,
  rowNumbers,
  sessionId,
  title = "Row Comparison",
  fallbackRecords = []
}: RowComparisonDialogProps) {
  const [rowData, setRowData] = useState<RowData[]>([]);
  const [allColumns, setAllColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);

  useEffect(() => {
    if (isOpen && rowNumbers.length > 0 && sessionId) {
      fetchRowData();
    }
  }, [isOpen, rowNumbers, sessionId]);

  const fetchRowData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the new POST endpoint for row data retrieval
      const response = await fetch(`/api/sessions/${sessionId}/row-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rowNumbers: rowNumbers
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch row data');
      }
      
      const result = await response.json();
      
      if (result.success && result.data.rows && result.data.rows.length > 0) {
        // Transform the database result format to our RowData format
        const transformedData = result.data.rows.map((row: any) => ({
          rowNumber: row.rowNumber,
          ...row.data
        }));
        
        setRowData(transformedData);
        
        // Use headers from database if available, otherwise extract from data
        let columnNames: string[] = [];
        if (result.data.headers && result.data.headers.length > 0) {
          columnNames = result.data.headers.filter((header: string) => header !== 'rowNumber');
        } else {
          // Fallback to extracting from data
          const columnSet = new Set<string>();
          transformedData.forEach((row: RowData) => {
            Object.keys(row).forEach(key => {
              if (key !== 'rowNumber') {
                columnSet.add(key);
              }
            });
          });
          columnNames = Array.from(columnSet);
        }
        
        setAllColumns(columnNames.sort());
        setUsingFallback(false);
      } else {
        // No data found, try fallback
        tryFallbackData();
      }
    } catch (err) {
      console.error('Error fetching row data:', err);
      // Try fallback data when API fails
      tryFallbackData();
    } finally {
      setLoading(false);
    }
  };

  const tryFallbackData = () => {
    if (fallbackRecords && fallbackRecords.length > 0) {
      console.log('Using fallback CustomerRecord data for row comparison');
      
      // Transform CustomerRecord data to RowData format
      const transformedFallbackData = fallbackRecords.map((record, index) => ({
        rowNumber: record.rowNumber || rowNumbers[index] || (index + 1),
        ...record
      }));
      
      setRowData(transformedFallbackData);
      setUsingFallback(true);
      
      // Extract column names from CustomerRecord, excluding system fields
      const systemFields = ['id', 'rowNumber', 'name_score', 'addr_score', 'city_score', 'country_score', 'tpi_score', 'overall_score', 'blockType', 'matchMethod', 'bestNameMatchMethod', 'bestAddrMatchMethod', 'isLowConfidence', 'llm_conf'];
      const columnSet = new Set<string>();
      transformedFallbackData.forEach((record) => {
        Object.keys(record).forEach(key => {
          if (!systemFields.includes(key)) {
            columnSet.add(key);
          }
        });
      });
      
      setAllColumns(Array.from(columnSet).sort());
      setError(null);
    } else {
      setError('No data found for the specified rows and no fallback data available');
    }
  };

  const getValueDifference = (column: string, rowIndex: number) => {
    if (rowData.length < 2) return 'none';
    
    const currentValue = rowData[rowIndex]?.[column] || '';
    const otherValues = rowData
      .filter((_, index) => index !== rowIndex)
      .map(row => row[column] || '');
    
    const currentStr = String(currentValue).toLowerCase().trim();
    const hasIdenticalMatch = otherValues.some(val => 
      String(val).toLowerCase().trim() === currentStr
    );
    
    if (hasIdenticalMatch) return 'identical';
    if (currentStr === '') return 'empty';
    return 'different';
  };

  const getCellClassName = (difference: string) => {
    switch (difference) {
      case 'identical':
        return 'bg-green-50 dark:bg-green-950/20 border-l-2 border-green-500';
      case 'different':
        return 'bg-amber-50 dark:bg-amber-950/20 border-l-2 border-amber-500';
      case 'empty':
        return 'bg-gray-50 dark:bg-gray-950/20 border-l-2 border-gray-400';
      default:
        return '';
    }
  };

  const renderValue = (value: any) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-muted-foreground italic">Empty</span>;
    }
    return String(value);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] max-h-[90vh] p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <TableIcon className="w-5 h-5" />
              {title} - Rows {rowNumbers.join(', ')}
              {usingFallback && (
                <Badge variant="outline" className="ml-2 text-amber-600 border-amber-500">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Fallback Data
                </Badge>
              )}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {usingFallback 
                ? "Showing limited CustomerRecord data as fallback. Complete Excel row data may not be available." 
                : "Compare data across rows in an Excel-like format. Scroll horizontally to see all columns."
              }
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                <span>Loading row data...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-64 gap-4">
                <p className="text-destructive">{error}</p>
                <Button variant="outline" onClick={fetchRowData}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            ) : rowData.length > 0 ? (
              <div className="flex flex-col h-full">
                {/* Legend */}
                <div className="p-4 bg-muted/30 border-b">
                  <div className="flex items-center gap-6 text-xs">
                    <span className="font-medium">Legend:</span>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-200 border-l-2 border-green-500 rounded-sm"></div>
                      <span>Identical values</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-200 border-l-2 border-amber-500 rounded-sm"></div>
                      <span>Different values</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-200 border-l-2 border-gray-400 rounded-sm"></div>
                      <span>Empty values</span>
                    </div>
                  </div>
                </div>

                {/* Table Container */}
                <ScrollArea className="flex-1">
                  <div className="min-w-max">
                    <table className="w-full border-collapse">
                      {/* Header */}
                      <thead className="sticky top-0 bg-background border-b">
                        <tr>
                          <th className="text-left p-3 font-medium border-r bg-muted/50 min-w-[120px]">
                            Field
                          </th>
                          {rowData.map((row, index) => (
                            <th 
                              key={index} 
                              className="text-left p-3 font-medium border-r bg-muted/50 min-w-[200px]"
                            >
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Row {row.rowNumber}</Badge>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>

                      {/* Body */}
                      <tbody>
                        {allColumns.map((column, columnIndex) => (
                          <tr key={column} className={columnIndex % 2 === 0 ? 'bg-muted/20' : ''}>
                            {/* Column Name */}
                            <td className="p-3 font-medium border-r border-b bg-muted/30 sticky left-0 z-10">
                              <div className="min-w-[100px]">
                                <span className="text-sm">{column}</span>
                              </div>
                            </td>
                            
                            {/* Values for each row */}
                            {rowData.map((row, rowIndex) => {
                              const value = row[column];
                              const difference = getValueDifference(column, rowIndex);
                              
                              return (
                                <td 
                                  key={`${column}-${rowIndex}`}
                                  className={cn(
                                    "p-3 border-r border-b text-sm",
                                    getCellClassName(difference)
                                  )}
                                >
                                  <div className="min-w-[180px] max-w-[300px]">
                                    <div className="break-words">
                                      {renderValue(value)}
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64">
                <p className="text-muted-foreground">No data to display</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t bg-muted/30">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                {rowData.length > 0 && (
                  <span>
                    Comparing {rowData.length} rows across {allColumns.length} columns
                  </span>
                )}
              </div>
              <Button onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}