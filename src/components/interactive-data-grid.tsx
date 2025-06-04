"use client";

import { useState, useMemo } from 'react';
import type { DuplicatePair } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, CheckCircle, XCircle, SkipForward, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Download, Loader2, Trash2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportDuplicatePairsToExcel } from '@/utils/duplicate-pairs-export';
import { checkPairForInvalidNames, separateValidAndInvalidPairs, getDisplayName } from '@/utils/record-validation';
import { DeleteInvalidRecordsModal } from './delete-invalid-records-modal';
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
  onDeleteInvalidRecords?: (pairIds: string[]) => void;
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

const AiConfidenceBadge = ({ confidence }: { confidence?: string }) => {
  if (!confidence) {
    return <span className="text-xs text-muted-foreground">-</span>;
  }

  let badgeVariant: "default" | "secondary" | "outline" | "destructive" = "outline";
  let className = "";

  switch (confidence.toLowerCase()) {
    case 'high':
      badgeVariant = "default";
      className = "bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700";
      break;
    case 'medium':
      badgeVariant = "secondary";
      className = "bg-yellow-500 dark:bg-yellow-600 hover:bg-yellow-600 dark:hover:bg-yellow-700 text-black dark:text-white"; // Ensure contrast for yellow
      break;
    case 'low':
      badgeVariant = "destructive"; // Using destructive for low for better visual cue
      break;
    case 'error':
      badgeVariant = "destructive";
      className = "bg-red-700 dark:bg-red-800 hover:bg-red-800 dark:hover:bg-red-900";
      break;
    default: // For any other unexpected values
      badgeVariant = "outline";
  }

  return (
    <Badge variant={badgeVariant} className={className}>
      {confidence}
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
  onDeleteInvalidRecords
}: InteractiveDataGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Separate valid and invalid pairs
  const { validPairs, invalidPairs } = useMemo(() => 
    separateValidAndInvalidPairs(data || []), [data]
  );

  // Filter data based on status and confidence filters
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
      
      return true;
    });
  }, [data, statusFilter, confidenceFilter]);

  // Handle deleting invalid records
  const handleDeleteInvalidRecords = async (pairIds: string[]) => {
    if (!onDeleteInvalidRecords) return;
    
    setIsDeleting(true);
    try {
      await onDeleteInvalidRecords(pairIds);
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting invalid records:', error);
    } finally {
      setIsDeleting(false);
    }
  };

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
                <span className="ml-2 text-xs text-red-500 font-normal">(invalid)</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{row.original.record1.address}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.record1.city && `${row.original.record1.city}, ${row.original.record1.country || ''}`}
              {!row.original.record1.city && row.original.record1.country}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs bg-muted">
                Row: {row.original.record1.rowNumber || 'N/A'}
              </Badge>
              {record1Invalid && (
                <Badge variant="secondary" className="text-xs text-red-600 bg-red-50 border-red-200">
                  Invalid Name
                </Badge>
              )}
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
                <span className="ml-2 text-xs text-red-500 font-normal">(invalid)</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">{row.original.record2.address}</div>
            <div className="text-xs text-muted-foreground">
              {row.original.record2.city && `${row.original.record2.city}, ${row.original.record2.country || ''}`}
              {!row.original.record2.city && row.original.record2.country}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs bg-muted">
                Row: {row.original.record2.rowNumber || 'N/A'}
              </Badge>
              {record2Invalid && (
                <Badge variant="secondary" className="text-xs text-red-600 bg-red-50 border-red-200">
                  Invalid Name
                </Badge>
              )}
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
            <div className="flex flex-col items-center gap-1">
              <AiConfidenceBadge confidence={confidence} />
              {isEnhanced && (
                <span className="text-xs text-blue-600 font-medium" title="Confidence enhanced by smart business rules">
                  Smart Enhanced
                </span>
              )}
            </div>
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => onReviewPair(row.original)}
          >
            <Eye className="w-4 h-4 mr-1 md:mr-2" />
            <span className="hidden md:inline">Review</span>
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
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
        globalFilter,
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
        
        {/* Invalid Records Warning */}
        {invalidPairs.length > 0 && (
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-full">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h4 className="font-semibold text-red-800 text-base">
                    {invalidPairs.length} Record{invalidPairs.length !== 1 ? 's' : ''} with Invalid Names
                  </h4>
                  <p className="text-sm text-red-700 mt-1">
                    Found records with "nan", empty, or invalid name values that should be cleaned up.
                  </p>
                </div>
              </div>
              {onDeleteInvalidRecords && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isDeleting}
                  className="border-red-300 text-red-700 hover:bg-red-50 hover:border-red-400"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clean Up Invalid Records
                </Button>
              )}
            </div>
          </div>
        )}
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Showing {filteredData.length} of {data.length} potential duplicate {data.length === 1 ? 'pair' : 'pairs'}.
            {invalidPairs.length > 0 && (
              <span className="text-red-600 font-medium">
                {" "}({invalidPairs.length} with invalid names)
              </span>
            )}
            {statusFilter !== "all" && ` (Status: ${statusFilter})`}
            {confidenceFilter !== "all" && ` (Confidence: ${confidenceFilter})`}
          </p>
          
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
            {/* Search Input */}
            <Input
              placeholder="Search all columns..."
              value={globalFilter ?? ""}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="w-full sm:w-64"
            />
            
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
      
      {/* Delete Invalid Records Modal */}
      <DeleteInvalidRecordsModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirmDelete={handleDeleteInvalidRecords}
        invalidPairs={invalidPairs}
        isDeleting={isDeleting}
      />
    </Card>
  );
}

    