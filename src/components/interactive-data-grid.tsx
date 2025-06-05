"use client";

import { useState, useMemo, useEffect } from 'react';
import type { DuplicatePair } from '@/types';
import { useSessionPersistence } from '@/hooks/use-session-persistence';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, CheckCircle, XCircle, SkipForward, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Download, Loader2, Trash2, Zap, Search } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportDuplicatePairsToExcel } from '@/utils/duplicate-pairs-export';
import { checkPairForInvalidNames, getDisplayName } from '@/utils/record-validation';
import { RowComparisonDialog } from '@/components/row-comparison-dialog';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  getPaginationRowModel,
} from "@tanstack/react-table";

interface DataTablePaginationProps {
  table: any;
  pageSizes?: number[];
}

const DataTablePagination = ({
  table,
  pageSizes = [10, 20, 30, 40, 50],
}: DataTablePaginationProps) => {
  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {pageSizes.map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

interface InteractiveDataGridProps {
  data: DuplicatePair[];
  onReviewPair: (pair: DuplicatePair) => void;
  onUpdatePairStatus: (pairId: string, status: 'merged' | 'not_duplicate' | 'skipped' | 'duplicate') => void;
  selectedRowIds: Set<string>;
  onToggleRowSelection: (pairId: string) => void;
  onToggleSelectAll: () => void;
  sessionId?: string; // Add session ID for database operations
}

const StatusBadge = ({ status }: { status: DuplicatePair['status'] }) => {
  switch (status) {
    case 'merged':
      return <Badge variant="default" className="bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700"><CheckCircle className="w-3 h-3 mr-1" /> Merged</Badge>;
    case 'duplicate':
      return <Badge variant="default" className="bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700"><CheckCircle className="w-3 h-3 mr-1" /> Duplicate</Badge>;
    case 'not_duplicate':
      return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Not Duplicate</Badge>;
    case 'skipped':
      return <Badge variant="outline"><SkipForward className="w-3 h-3 mr-1" /> Skipped</Badge>;
    case 'pending':
    default:
      return <Badge variant="outline" className="border-yellow-500 dark:border-yellow-400 text-yellow-600 dark:text-yellow-400"><AlertTriangle className="w-3 h-3 mr-1" /> Pending</Badge>;
  }
};

const AiConfidenceBadge = ({ confidence, isEnhanced = false }: { confidence?: string; isEnhanced?: boolean }) => {
  if (!confidence) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  let badgeVariant: "default" | "secondary" | "outline" | "destructive" = "outline";
  let className = "";
  let iconColor = "";

  switch (confidence.toLowerCase()) {
    case 'high':
      badgeVariant = "default";
      className = "bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700";
      iconColor = "text-white dark:text-white"; // White on green background
      break;
    case 'medium':
      badgeVariant = "secondary";
      className = "bg-yellow-500 dark:bg-yellow-600 hover:bg-yellow-600 dark:hover:bg-yellow-700 text-black dark:text-white";
      iconColor = "text-black dark:text-white"; // Black on yellow for contrast
      break;
    case 'low':
      badgeVariant = "destructive";
      iconColor = "text-white dark:text-white"; // White on red background
      break;
    case 'error':
      badgeVariant = "destructive";
      className = "bg-red-700 dark:bg-red-800 hover:bg-red-800 dark:hover:bg-red-900";
      iconColor = "text-white dark:text-white"; // White on red background
      break;
    default:
      badgeVariant = "outline";
      iconColor = "text-foreground dark:text-foreground"; // Follows text color
  }

  return (
    <Badge 
      variant={badgeVariant} 
      className={`${className} ${isEnhanced ? 'ring-2 ring-blue-400/50 dark:ring-blue-500/50' : ''}`}
      title={isEnhanced ? "Confidence enhanced by smart business rules" : undefined}
    >
      {confidence}
      {isEnhanced && (
        <Zap className={`w-3 h-3 ml-1 ${iconColor}`} />
      )}
    </Badge>
  );
};

export function InteractiveDataGrid({ 
  data, 
  onReviewPair, 
  onUpdatePairStatus,
  selectedRowIds,
  onToggleRowSelection,
  onToggleSelectAll,
  sessionId
}: InteractiveDataGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [smartSearchQuery, setSmartSearchQuery] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");
  
  // Row comparison dialog state
  const [showRowComparison, setShowRowComparison] = useState(false);
  const [comparisonRowNumbers, setComparisonRowNumbers] = useState<number[]>([]);
  
  
  // Database persistence
  const { updateDuplicatePair } = useSessionPersistence();
  
  // Enhanced status update handler that saves to database
  const handleStatusUpdate = async (pairId: string, status: 'merged' | 'not_duplicate' | 'skipped' | 'duplicate') => {
    // Update local state first for immediate UI feedback
    onUpdatePairStatus(pairId, status);
    
    // Save to database if session ID is available
    if (sessionId) {
      try {
        await updateDuplicatePair(pairId, { status });
      } catch (error) {
        console.error('Failed to save status to database:', error);
        // Could show a toast notification here for failed saves
      }
    }
  };
  
  // Handle row number clicks for comparison
  const handleRowNumberClick = (rowNumbers: (number | undefined)[]) => {
    const validRowNumbers = rowNumbers.filter((num): num is number => 
      num !== undefined && num !== null && !isNaN(num)
    );
    
    if (validRowNumbers.length > 0 && sessionId) {
      setComparisonRowNumbers(validRowNumbers);
      setShowRowComparison(true);
    }
  };

  // Smart search function - searches only in specific searchable fields
  const smartSearchFilter = (pair: DuplicatePair, query: string): boolean => {
    if (!query.trim()) return true;
    
    // Normalize search query: lowercase, trim, and remove special characters for better matching
    const searchQuery = query.toLowerCase().trim().replace(/[^\w\s]/g, '');
    
    // Define searchable fields for both records including state/region
    const searchableFields = [
      // Record 1 fields
      pair.record1.name?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record1.address?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record1.city?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record1.country?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record1.state?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record1.region?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record1.tpi?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record1.rowNumber?.toString() || '',
      
      // Record 2 fields  
      pair.record2.name?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record2.address?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record2.city?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record2.country?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record2.state?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record2.region?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record2.tpi?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record2.rowNumber?.toString() || '',
    ];
    
    // Support multiple search terms (space-separated)
    const searchTerms = searchQuery.split(/\s+/).filter(term => term.length > 0);
    
    // Check if all search terms are found in at least one field
    return searchTerms.every(term =>
      searchableFields.some(field => field.includes(term))
    );
  };

  // Filter data based on status, confidence, and smart search
  const filteredData = useMemo(() => {
    return data.filter(pair => {
      // Apply status filter
      if (statusFilter !== "all" && pair.status !== statusFilter) {
        return false;
      }
      
      // Apply confidence filter
      if (confidenceFilter !== "all" && pair.aiConfidence !== confidenceFilter) {
        return false;
      }
      
      // Apply smart search filter
      if (!smartSearchFilter(pair, smartSearchQuery)) {
        return false;
      }
      
      return true;
    });
  }, [data, statusFilter, confidenceFilter, smartSearchQuery]);

  

  const columns: ColumnDef<DuplicatePair>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => {
            table.toggleAllPageRowsSelected(!!value);
            onToggleSelectAll();
          }}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedRowIds.has(row.original.id)}
          onCheckedChange={() => onToggleRowSelection(row.original.id)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableGlobalFilter: false,
    },
    {
      accessorKey: "record1",
      header: "Record 1",
      cell: ({ row }) => {
        const { record1Invalid } = checkPairForInvalidNames(row.original);
        return (
          <div className={record1Invalid ? "border-l-3 border-red-400 pl-4" : "pl-1"}>
            <div className={`font-medium ${record1Invalid ? 'text-red-600' : ''}`}>
              {row.original.record1.name}
              {record1Invalid && (
                <span className="ml-2 text-xs text-red-500 font-normal">(invalid name)</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{row.original.record1.address}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.record1.city && `${row.original.record1.city}, ${row.original.record1.country || ''}`}
              {!row.original.record1.city && row.original.record1.country}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant="outline" 
                className="text-xs bg-muted cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleRowNumberClick([row.original.record1.rowNumber, row.original.record2.rowNumber])}
                title="Click to compare rows in Excel-like format"
              >
                Row: {row.original.record1.rowNumber || 'N/A'}
              </Badge>
            </div>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "record2",
      header: "Record 2",
      cell: ({ row }) => {
        const { record2Invalid } = checkPairForInvalidNames(row.original);
        return (
          <div className={record2Invalid ? "border-l-3 border-red-400 pl-4" : "pl-1"}>
            <div className={`font-medium ${record2Invalid ? 'text-red-600' : ''}`}>
              {row.original.record2.name}
              {record2Invalid && (
                <span className="ml-2 text-xs text-red-500 font-normal">(invalid name)</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{row.original.record2.address}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.record2.city && `${row.original.record2.city}, ${row.original.record2.country || ''}`}
              {!row.original.record2.city && row.original.record2.country}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge 
                variant="outline" 
                className="text-xs bg-muted cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleRowNumberClick([row.original.record1.rowNumber, row.original.record2.rowNumber])}
                title="Click to compare rows in Excel-like format"
              >
                Row: {row.original.record2.rowNumber || 'N/A'}
              </Badge>
            </div>
          </div>
        );
      },
      enableSorting: true,
    },
    {
      accessorKey: "similarityScore",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Similarity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const originalScore = row.original.originalScore || (row.original.similarityScore * 100);
        const enhancedScore = row.original.enhancedScore || originalScore;
        const isEnhanced = row.original.enhancedScore && Math.abs(enhancedScore - originalScore) >= 1;
        
        return (
          <div className="text-center">
            <div className="flex flex-col items-center gap-1">
              <Badge
                variant={enhancedScore > 80 ? "default" : enhancedScore > 60 ? "secondary" : "destructive"}
                className={
                  enhancedScore > 80 ? "bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700" : 
                  enhancedScore > 60 ? "bg-yellow-500 dark:bg-yellow-600 hover:bg-yellow-600 dark:hover:bg-yellow-700 text-black dark:text-white" : ""
                }
              >
                {enhancedScore.toFixed(0)}%
              </Badge>
              {isEnhanced && (
                <span className="text-xs text-muted-foreground" title={`Original: ${originalScore.toFixed(0)}% → Enhanced: ${enhancedScore.toFixed(0)}%`}>
                  {enhancedScore > originalScore ? '↑ Enhanced' : '↓ Adjusted'}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "aiConfidence",
      header: "AI Confidence",
      cell: ({ row }) => {
        // Prioritize enhanced confidence over original AI confidence
        const confidence = row.original.enhancedConfidence || row.original.aiConfidence;
        const isEnhanced = !!row.original.enhancedConfidence;
        
        return (
          <div className="text-center">
            <AiConfidenceBadge confidence={confidence} isEnhanced={isEnhanced} />
          </div>
        );
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="text-center">
          <StatusBadge status={row.original.status} />
        </div>
      ),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="text-right">
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReviewPair(row.original)}
            >
              <Eye className="w-4 h-4 mr-1 md:mr-2" />
              <span className="hidden md:inline">Review</span>
            </Button>
            
            {/* Quick action buttons for faster processing */}
            {row.original.status === 'pending' && (
              <div className="hidden md:flex items-center gap-1 ml-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStatusUpdate(row.original.id, 'duplicate')}
                  className="text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-300 h-8 w-8 p-0"
                  title="Mark as Duplicate"
                >
                  <CheckCircle className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStatusUpdate(row.original.id, 'not_duplicate')}
                  className="text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-300 h-8 w-8 p-0"
                  title="Not a Duplicate"
                >
                  <XCircle className="w-3 h-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStatusUpdate(row.original.id, 'skipped')}
                  className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800/30 hover:text-gray-700 dark:hover:text-gray-300 h-8 w-8 p-0"
                  title="Skip"
                >
                  <SkipForward className="w-3 h-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  // Function to export data to Excel with specified formatting
  const handleExportToExcel = async () => {
    if (!data || data.length === 0 || isExporting) return;
    
    setIsExporting(true);
    
    try {
      // Get the filtered rows from the table instead of using raw data
      // This ensures export matches what's currently displayed
      const filteredRows = table.getFilteredRowModel().rows;
      const filteredDataForExport = filteredRows.map(row => row.original);
      
      // Use the dedicated export utility
      await exportDuplicatePairsToExcel(data, filteredDataForExport, {
        globalFilter: smartSearchQuery, // Use smart search query instead
        statusFilter,
        confidenceFilter
      });
      
      setIsExporting(false);
    } catch (error) {
      console.error("Error exporting data:", error);
      setIsExporting(false);
    }
  };

  if (!data) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Potential Duplicates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading data or no data available.</p>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-semibold">Potential Duplicates</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No duplicate pairs found or data not yet processed.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold">Potential Duplicates Review</CardTitle>
        
        
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredData.length} of {data.length} potential duplicate {data.length === 1 ? 'pair' : 'pairs'}.
            {smartSearchQuery && ` (Search: "${smartSearchQuery}")`}
            {statusFilter !== "all" && ` (Status: ${statusFilter})`}
            {confidenceFilter !== "all" && ` (Confidence: ${confidenceFilter})`}
          </p>
          
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            {/* Smart Search Input */}
            <div className="relative w-full sm:w-80">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                <Search className="w-4 h-4 text-muted-foreground" />
              </div>
              <Input
                placeholder="Search by name, address, city, state, country, TPI, or row number..."
                value={smartSearchQuery}
                onChange={(event) => setSmartSearchQuery(event.target.value)}
                className="pl-10 bg-background border-muted-foreground/20 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
              />
              {smartSearchQuery && (
                <button
                  onClick={() => setSmartSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            {smartSearchQuery && (
              <div className="text-xs text-muted-foreground mt-1 w-full sm:w-80">
                💡 Tip: Use spaces to search multiple terms (e.g., "john london" finds records with both words)
              </div>
            )}
            
            {/* Filter Controls */}
            <div className="flex items-center gap-2">
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="merged">Merged</SelectItem>
                  <SelectItem value="duplicate">Duplicate</SelectItem>
                  <SelectItem value="not_duplicate">Not Duplicate</SelectItem>
                  <SelectItem value="skipped">Skipped</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                value={confidenceFilter}
                onValueChange={setConfidenceFilter}
              >
                <SelectTrigger className="h-8 w-[150px]">
                  <SelectValue placeholder="Confidence" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Confidence</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Review Instructions */}
        <div className="flex justify-end items-center py-2 border-b border-border">
          <p className="text-xs text-muted-foreground">
            Click <strong>Review</strong> to examine duplicate pairs in detail and make decisions about merging or keeping records separate.
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const { hasInvalidName } = checkPairForInvalidNames(row.original);
                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={hasInvalidName ? "hover:bg-red-25" : ""}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="py-4">
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} />
      </CardContent>
      
      {/* Row Comparison Dialog */}
      <RowComparisonDialog
        isOpen={showRowComparison}
        onClose={() => setShowRowComparison(false)}
        rowNumbers={comparisonRowNumbers}
        sessionId={sessionId || ''}
        title="Duplicate Pair Row Comparison"
      />
    </Card>
  );
}

    