"use client";

import { useState, useMemo, useEffect } from 'react';
import type { DuplicatePair } from '@/types';
import { useSessionPersistence } from '@/hooks/use-session-persistence';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, CheckCircle, XCircle, SkipForward, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Download, Loader2, Trash2, Zap, Search, Filter, Building2, MapPin, Hash } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportDuplicatePairsToExcel } from '@/utils/duplicate-pairs-export';
import { checkPairForInvalidNames, getDisplayName, hasValidAddressInfo } from '@/utils/record-validation';
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
    <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/20">
      <div className="flex items-center space-x-6 lg:space-x-8">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium text-muted-foreground">Rows per page</p>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[70px] border-border/50">
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
        <div className="flex w-[100px] items-center justify-center text-sm font-medium text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0 border-border/50"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 border-border/50"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 border-border/50"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 border-border/50"
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
  sessionId?: string;
  onSessionStatsChanged?: () => void;
}

// Executive-level Status Badge
const StatusBadge = ({ status }: { status: DuplicatePair['status'] }) => {
  const statusConfig = {
    merged: {
      variant: 'default' as const,
      className: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-800 font-medium',
      icon: CheckCircle,
      label: 'Merged'
    },
    duplicate: {
      variant: 'default' as const,
      className: 'bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800 font-medium',
      icon: CheckCircle,
      label: 'Duplicate'
    },
    not_duplicate: {
      variant: 'default' as const,
      className: 'bg-slate-500/10 text-slate-700 border-slate-200 dark:bg-slate-500/20 dark:text-slate-300 dark:border-slate-800 font-medium',
      icon: XCircle,
      label: 'Not Duplicate'
    },
    skipped: {
      variant: 'default' as const,
      className: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-800 font-medium',
      icon: SkipForward,
      label: 'Skipped'
    },
    pending: {
      variant: 'default' as const,
      className: 'bg-orange-500/10 text-orange-700 border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-800 font-medium',
      icon: AlertTriangle,
      label: 'Pending'
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  const IconComponent = config.icon;

  return (
    <Badge variant={config.variant} className={`${config.className} px-3 py-1 text-xs`}>
      <IconComponent className="w-3 h-3 mr-1.5" />
      {config.label}
    </Badge>
  );
};

// Executive-level AI Confidence Badge
const AiConfidenceBadge = ({ confidence }: { confidence?: string }) => {
  if (!confidence || confidence === 'Error') {
    return (
      <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-800 px-3 py-1 text-xs font-medium">
        Error
      </Badge>
    );
  }

  const confidenceConfig = {
    high: {
      className: 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-800',
      label: 'High'
    },
    medium: {
      className: 'bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-800',
      label: 'Medium'
    },
    low: {
      className: 'bg-red-500/10 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-800',
      label: 'Low'
    }
  };

  const config = confidenceConfig[confidence.toLowerCase() as keyof typeof confidenceConfig];
  if (!config) return <span className="text-xs text-muted-foreground">-</span>;

  return (
    <Badge variant="outline" className={`${config.className} px-3 py-1 text-xs font-medium`}>
      {config.label}
    </Badge>
  );
};

// Executive-level Similarity Score Badge
const SimilarityBadge = ({ score }: { score: number }) => {
  const percentage = Math.round(score * 100);
  
  let className = '';
  if (percentage >= 95) {
    className = 'bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-800';
  } else if (percentage >= 85) {
    className = 'bg-blue-500/10 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-800';
  } else if (percentage >= 70) {
    className = 'bg-amber-500/10 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-800';
  } else {
    className = 'bg-red-500/10 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-800';
  }

  return (
    <Badge variant="outline" className={`${className} px-3 py-1 text-xs font-medium tabular-nums`}>
      {percentage}%
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
  sessionId,
  onSessionStatsChanged
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
        // Trigger session stats refresh
        if (onSessionStatsChanged) {
          onSessionStatsChanged();
        }
      } catch (error) {
        console.error('Failed to save status to database:', error);
      }
    }
  };
  
  // Handle row number clicks for comparison
  const handleRowNumberClick = (rowNumbers: (number | undefined)[]) => {
    const validRowNumbers = rowNumbers.filter((num): num is number => 
      num !== undefined && num !== null && !isNaN(num)
    );
    
    console.log('Row numbers clicked:', rowNumbers);
    console.log('Valid row numbers:', validRowNumbers);
    console.log('Session ID:', sessionId);
    
    if (validRowNumbers.length > 0 && sessionId) {
      setComparisonRowNumbers(validRowNumbers);
      setShowRowComparison(true);
    }
  };

  // Smart search function
  const smartSearchFilter = (pair: DuplicatePair, query: string): boolean => {
    if (!query.trim()) return true;
    
    const searchQuery = query.toLowerCase().trim().replace(/[^\w\s]/g, '');
    
    const searchableFields = [
      pair.record1.name?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record1.address?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record1.city?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record1.country?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record1.tpi?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record1.rowNumber?.toString() || '',
      
      pair.record2.name?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record2.address?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record2.city?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record2.country?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record2.tpi?.toLowerCase().replace(/[^\w\s]/g, '') || '',
      pair.record2.rowNumber?.toString() || '',
    ];
    
    const searchTerms = searchQuery.split(/\s+/).filter(term => term.length > 0);
    
    return searchTerms.every(term =>
      searchableFields.some(field => field.includes(term))
    );
  };

  // Filter data based on status, confidence, smart search, and invalid names
  const filteredData = useMemo(() => {
    return data.filter(pair => {
      // Filter out pairs where both records are completely invalid (both name and address invalid)
      const { record1Invalid, record2Invalid } = checkPairForInvalidNames(pair);
      const record1CompletelyInvalid = record1Invalid && !hasValidAddressInfo(pair.record1);
      const record2CompletelyInvalid = record2Invalid && !hasValidAddressInfo(pair.record2);
      
      // Exclude pairs where at least one record is completely invalid
      if (record1CompletelyInvalid || record2CompletelyInvalid) {
        return false;
      }
      
      if (statusFilter !== "all" && pair.status !== statusFilter) {
        return false;
      }
      
      if (confidenceFilter !== "all" && pair.aiConfidence !== confidenceFilter) {
        return false;
      }
      
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
        <div className="flex items-center">
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(value) => {
              table.toggleAllPageRowsSelected(!!value);
              onToggleSelectAll();
            }}
            aria-label="Select all"
            className="border-border/50"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center">
          <Checkbox
            checked={selectedRowIds.has(row.original.id)}
            onCheckedChange={() => onToggleRowSelection(row.original.id)}
            aria-label="Select row"
            className="border-border/50"
          />
        </div>
      ),
      enableSorting: false,
      enableGlobalFilter: false,
      size: 50,
    },
    {
      accessorKey: "record1",
      header: "Record 1",
      cell: ({ row }) => {
        const { record1Invalid } = checkPairForInvalidNames(row.original);
        const record1HasValidAddress = hasValidAddressInfo(row.original.record1);
        const needsUserDecision = record1Invalid && record1HasValidAddress;
        
        return (
          <div className="space-y-2">
            <div className="flex items-start space-x-3">
              <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className={`font-medium text-sm ${record1Invalid ? 'text-red-600' : 'text-foreground'} truncate`}>
                  {row.original.record1.name}
                  {record1Invalid && (
                    <span className="ml-2 text-xs text-red-500 font-normal">
                      {needsUserDecision ? '(no name - needs review)' : '(invalid)'}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <div 
                    className="text-xs text-muted-foreground truncate cursor-help"
                    title={row.original.record1.address || 'No address available'}
                  >
                    {row.original.record1.address}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {[row.original.record1.city, row.original.record1.country].filter(Boolean).join(', ')}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Hash className="w-3 h-3 text-muted-foreground" />
              <Badge 
                variant="outline" 
                className="text-xs bg-muted/50 border-border/50 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleRowNumberClick([row.original.record1.rowNumber, row.original.record2.rowNumber])}
                title="Click to compare rows"
              >
                Row {row.original.record1.rowNumber || 'N/A'}
              </Badge>
            </div>
          </div>
        );
      },
      enableSorting: true,
      size: 300,
    },
    {
      accessorKey: "record2",
      header: "Record 2", 
      cell: ({ row }) => {
        const { record2Invalid } = checkPairForInvalidNames(row.original);
        const record2HasValidAddress = hasValidAddressInfo(row.original.record2);
        const needsUserDecision = record2Invalid && record2HasValidAddress;
        
        return (
          <div className="space-y-2">
            <div className="flex items-start space-x-3">
              <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <div className={`font-medium text-sm ${record2Invalid ? 'text-red-600' : 'text-foreground'} truncate`}>
                  {row.original.record2.name}
                  {record2Invalid && (
                    <span className="ml-2 text-xs text-red-500 font-normal">
                      {needsUserDecision ? '(no name - needs review)' : '(invalid)'}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <div 
                    className="text-xs text-muted-foreground truncate cursor-help"
                    title={row.original.record2.address || 'No address available'}
                  >
                    {row.original.record2.address}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1 truncate">
                  {[row.original.record2.city, row.original.record2.country].filter(Boolean).join(', ')}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Hash className="w-3 h-3 text-muted-foreground" />
              <Badge 
                variant="outline" 
                className="text-xs bg-muted/50 border-border/50 cursor-pointer hover:bg-accent transition-colors"
                onClick={() => handleRowNumberClick([row.original.record1.rowNumber, row.original.record2.rowNumber])}
                title="Click to compare rows"
              >
                Row {row.original.record2.rowNumber || 'N/A'}
              </Badge>
            </div>
          </div>
        );
      },
      enableSorting: true,
      size: 300,
    },
    {
      accessorKey: "similarityScore",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="hover:bg-muted/50 px-2"
        >
          Similarity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex justify-center">
          <SimilarityBadge score={row.original.similarityScore} />
        </div>
      ),
      size: 120,
    },
    {
      accessorKey: "aiConfidence",
      header: "AI Confidence",
      cell: ({ row }) => (
        <div className="flex justify-center">
          <AiConfidenceBadge confidence={row.original.enhancedConfidence || row.original.aiConfidence} />
        </div>
      ),
      size: 140,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="flex justify-center">
          <StatusBadge status={row.original.status} />
        </div>
      ),
      size: 120,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReviewPair(row.original)}
            className="border-border/50 hover:bg-accent text-xs px-3 py-1.5"
          >
            <Eye className="w-3 h-3 mr-1.5" />
            Review
          </Button>
          
          {row.original.status === 'pending' && (
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusUpdate(row.original.id, 'duplicate')}
                className="text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-700 h-7 w-7 p-0"
                title="Mark as Duplicate"
              >
                <CheckCircle className="w-3 h-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleStatusUpdate(row.original.id, 'not_duplicate')}
                className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-700 h-7 w-7 p-0"
                title="Not a Duplicate"
              >
                <XCircle className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      ),
      size: 160,
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

  if (!data) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="text-xl font-semibold text-foreground">Potential Duplicates Review</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Loading data or no data available.</p>
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="border-b border-border/50 bg-muted/20">
          <CardTitle className="text-xl font-semibold text-foreground">Potential Duplicates Review</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No duplicate pairs found or data not yet processed.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-semibold text-foreground mb-2">Potential Duplicates Review</CardTitle>
            <p className="text-sm text-muted-foreground">
              Showing {filteredData.length} of {data.length} potential duplicate pairs
              {smartSearchQuery && ` (Search: "${smartSearchQuery}")`}
              {data.some(pair => {
                const { record1Invalid, record2Invalid } = checkPairForInvalidNames(pair);
                const record1CompletelyInvalid = record1Invalid && !hasValidAddressInfo(pair.record1);
                const record2CompletelyInvalid = record2Invalid && !hasValidAddressInfo(pair.record2);
                return record1CompletelyInvalid || record2CompletelyInvalid;
              }) && ` • Pairs with completely invalid records are hidden`}
            </p>
          </div>
        </div>
        
        {/* Executive Controls Section */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mt-6">
          {/* Advanced Search */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <Search className="w-4 h-4 text-muted-foreground" />
            </div>
            <Input
              placeholder="Search records..."
              value={smartSearchQuery}
              onChange={(event) => setSmartSearchQuery(event.target.value)}
              className="pl-10 border-border/50 bg-background/50 focus:bg-background transition-colors"
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
          
          {/* Executive Filters */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[140px] border-border/50 bg-background/50">
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
              
              <Select value={confidenceFilter} onValueChange={setConfidenceFilter}>
                <SelectTrigger className="h-9 w-[140px] border-border/50 bg-background/50">
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
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-hidden">
          <Table>
            <TableHeader className="bg-muted/30">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-border/50 hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead 
                      key={header.id} 
                      className="text-muted-foreground font-semibold text-xs uppercase tracking-wide py-4 px-6"
                      style={{ width: header.getSize() }}
                    >
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
                table.getRowModel().rows.map((row, index) => {
                  const { hasInvalidName, record1Invalid, record2Invalid } = checkPairForInvalidNames(row.original);
                  const record1HasValidAddress = hasValidAddressInfo(row.original.record1);
                  const record2HasValidAddress = hasValidAddressInfo(row.original.record2);
                  const needsUserDecision = (record1Invalid && record1HasValidAddress) || (record2Invalid && record2HasValidAddress);
                  
                  let rowClassName = "border-border/50 hover:bg-muted/30 transition-colors";
                  if (needsUserDecision) {
                    rowClassName += " bg-amber-50/50 dark:bg-amber-950/10"; // Amber for user decision needed
                  } else if (hasInvalidName) {
                    rowClassName += " bg-red-50/50 dark:bg-red-950/10"; // Red for other invalid cases
                  }
                  rowClassName += ` ${index % 2 === 0 ? " bg-background" : " bg-muted/10"}`;
                  
                  return (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={rowClassName}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell 
                          key={cell.id} 
                          className="py-4 px-6 align-top"
                          style={{ width: cell.column.getSize() }}
                        >
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
                    className="h-24 text-center text-muted-foreground"
                  >
                    No results found.
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

    