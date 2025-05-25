"use client";

import { useState, useMemo } from 'react';
import type { DuplicatePair } from '@/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, CheckCircle, XCircle, SkipForward, AlertTriangle, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Search, Download, Loader2 } from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from 'xlsx';
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
}

const StatusBadge = ({ status }: { status: DuplicatePair['status'] }) => {
  switch (status) {
    case 'merged':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="w-3 h-3 mr-1" /> Merged</Badge>;
    case 'duplicate':
      return <Badge variant="default" className="bg-blue-500 hover:bg-blue-600"><CheckCircle className="w-3 h-3 mr-1" /> Duplicate</Badge>;
    case 'not_duplicate':
      return <Badge variant="secondary"><XCircle className="w-3 h-3 mr-1" /> Not Duplicate</Badge>;
    case 'skipped':
      return <Badge variant="outline"><SkipForward className="w-3 h-3 mr-1" /> Skipped</Badge>;
    case 'pending':
    default:
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><AlertTriangle className="w-3 h-3 mr-1" /> Pending</Badge>;
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
      className = "bg-green-500 hover:bg-green-600";
      break;
    case 'medium':
      badgeVariant = "secondary";
      className = "bg-yellow-500 hover:bg-yellow-600 text-black"; // Ensure contrast for yellow
      break;
    case 'low':
      badgeVariant = "destructive"; // Using destructive for low for better visual cue
      break;
    case 'error':
      badgeVariant = "destructive";
      className = "bg-red-700 hover:bg-red-800";
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
  onToggleSelectAll 
}: InteractiveDataGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [confidenceFilter, setConfidenceFilter] = useState<string>("all");
  
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
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.record1.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.record1.address}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.record1.city && `${row.original.record1.city}, ${row.original.record1.country || ''}`}
            {!row.original.record1.city && row.original.record1.country}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            <Badge variant="outline" className="bg-slate-100">Row: {row.original.record1.rowsNumber || 'N/A'}</Badge>
          </div>
        </div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: "record2",
      header: "Record 2",
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.record2.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.record2.address}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.record2.city && `${row.original.record2.city}, ${row.original.record2.country || ''}`}
            {!row.original.record2.city && row.original.record2.country}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            <Badge variant="outline" className="bg-slate-100">Row: {row.original.record2.rowNumber || 'N/A'}</Badge>
          </div>
        </div>
      ),
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
      cell: ({ row }) => (
        <div className="text-center">
          <Badge
            variant={row.original.similarityScore > 0.8 ? "default" : row.original.similarityScore > 0.6 ? "secondary" : "destructive"}
            className={
              row.original.similarityScore > 0.8 ? "bg-green-500 hover:bg-green-600" : 
              row.original.similarityScore > 0.6 ? "bg-yellow-500 hover:bg-yellow-600 text-black" : ""
            }
          >
            {(row.original.similarityScore * 100).toFixed(0)}%
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "aiConfidence",
      header: "AI Confidence",
      cell: ({ row }) => (
        <div className="text-center">
          <AiConfidenceBadge confidence={row.original.aiConfidence} />
        </div>
      ),
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
      // Wrap in setTimeout to allow UI to update with loading state
      setTimeout(() => {
        // Get the filtered rows from the table instead of using raw data
        // This ensures export matches what's currently displayed
        const filteredRows = table.getFilteredRowModel().rows;
        const filteredData = filteredRows.map(row => row.original);
        
        if (filteredData.length === 0) {
          setIsExporting(false);
          return; // No data to export after filtering
        }
        
        // Prepare data for export, organizing by status groups
        const exportData: any[] = [];
        
        // Helper function to get status display name
        const getStatusDisplayName = (status: DuplicatePair['status']) => {
          switch (status) {
            case 'merged': return 'Merged';
            case 'not_duplicate': return 'Not Duplicate';
            case 'skipped': return 'Skipped';
            case 'pending': return 'Skipped - Needs Review';
            case 'duplicate': return 'Duplicate';
            default: return 'Unknown Status';
          }
        };

        // Helper function to sort data by TPI or Name
        const sortedData = [...filteredData].sort((a, b) => {
          // First try to sort by TPI if available
          const tpiA = a.record1.tpi || '';
          const tpiB = b.record1.tpi || '';
          
          if (tpiA && tpiB) {
            return tpiA.localeCompare(tpiB);
          }
          
          // Fall back to sorting by name
          return a.record1.name.localeCompare(b.record1.name);
        });
        
        // Group data by status
        const groupedData: Record<string, DuplicatePair[]> = {
          'merged': [],
          'not_duplicate': [],
          'skipped': [],
          'pending': [],
          'duplicate': []
        };
        
        sortedData.forEach(pair => {
          // Make sure the status exists in groupedData
          if (!groupedData[pair.status]) {
            groupedData[pair.status] = [];
          }
          groupedData[pair.status].push(pair);
        });
        
        // Add export metadata header with filter information
        exportData.push({
          section: 'Deduplication Results Export',
          info: `Generated: ${new Date().toLocaleString()}`,
          filter: globalFilter ? `Filter applied: "${globalFilter}"` : 'No filters applied',
          empty1: '',
          empty2: ''
        });
        
        // Add summary of filtered data
        exportData.push({
          section: 'Export Summary',
          info: `Total Records: ${filteredData.length}/${data.length}`,
          filter: globalFilter ? 'Filtered View' : 'Complete View',
          empty1: '',
          empty2: ''
        });
        
        // Add empty row as separator
        exportData.push({});
        
        // Add section headers and data for each status group
        Object.keys(groupedData).forEach(status => {
          if (groupedData[status].length > 0) {
            // Add section header
            exportData.push({
              section: `${getStatusDisplayName(status as DuplicatePair['status'])} Records`,
              count: `Count: ${groupedData[status].length}`,
              empty1: '',
              empty2: '',
              empty3: '',
              empty4: '',
              empty5: '',
              empty6: '',
              empty7: '',
              empty8: '',
              empty9: '',
            });
            
            // Add column headers
            exportData.push({
              masterRowId: 'Master Row ID',
              duplicateRowId: 'Duplicate Row ID',
              masterName: 'Master Name',
              masterAddress: 'Master Address',
              masterCity: 'Master City',
              masterCountry: 'Master Country',
              masterTpi: 'Master TPI',
              duplicateName: 'Duplicate Name',
              duplicateAddress: 'Duplicate Address',
              duplicateCity: 'Duplicate City',
              duplicateCountry: 'Duplicate Country',
              duplicateTpi: 'Duplicate TPI',
              similarityScore: 'Similarity Score',
              aiConfidence: 'AI Confidence',
              status: 'Status',
              action: 'Action Taken'
            });
            
            // Add data rows
            groupedData[status].forEach(pair => {
              // For merged and duplicate, only keep the master record
              if (status === 'merged' || status === 'duplicate') {
                const row: any = {
                  masterRowId: pair.record1.rowId || '',
                  duplicateRowId: '',
                  masterName: pair.record1.name || '',
                  masterAddress: pair.record1.address || '',
                  masterCity: pair.record1.city || '',
                  masterCountry: pair.record1.country || '',
                  masterTpi: pair.record1.tpi || '',
                  duplicateName: '',
                  duplicateAddress: '',
                  duplicateCity: '',
                  duplicateCountry: '',
                  duplicateTpi: '',
                  similarityScore: `${(pair.similarityScore * 100).toFixed(0)}%`,
                  aiConfidence: pair.aiConfidence || '-',
                  status: getStatusDisplayName(pair.status),
                  action: 'Merged to Master'
                };
                
                exportData.push(row);
              }
              // For skipped and not_duplicate, keep both records
              else if (status === 'skipped' || status === 'not_duplicate' || status === 'pending') {
                const row: any = {
                  masterRowId: pair.record1.rowId || '',
                  duplicateRowId: pair.record2.rowId || '',
                  masterName: pair.record1.name || '',
                  masterAddress: pair.record1.address || '',
                  masterCity: pair.record1.city || '',
                  masterCountry: pair.record1.country || '',
                  masterTpi: pair.record1.tpi || '',
                  duplicateName: pair.record2.name || '',
                  duplicateAddress: pair.record2.address || '',
                  duplicateCity: pair.record2.city || '',
                  duplicateCountry: pair.record2.country || '',
                  duplicateTpi: pair.record2.tpi || '',
                  similarityScore: `${(pair.similarityScore * 100).toFixed(0)}%`,
                  aiConfidence: pair.aiConfidence || '-',
                  status: getStatusDisplayName(pair.status),
                  action: status === 'not_duplicate' ? 'Kept Both Records' : 'Pending Decision'
                };
                
                exportData.push(row);
              }
            });
            
            // Add empty row as separator
            exportData.push({});
          }
        });
        
        // Create worksheet
        const ws = XLSX.utils.json_to_sheet(exportData, { skipHeader: true });
        
        // Apply formatting (column widths and cell styles)
        const colWidths = [
          { wch: 15 }, // Master Row ID
          { wch: 15 }, // Duplicate Row ID
          { wch: 30 }, // Master Name
          { wch: 30 }, // Master Address
          { wch: 15 }, // Master City
          { wch: 15 }, // Master Country
          { wch: 15 }, // Master TPI
          { wch: 30 }, // Duplicate Name
          { wch: 30 }, // Duplicate Address
          { wch: 15 }, // Duplicate City
          { wch: 15 }, // Duplicate Country
          { wch: 15 }, // Duplicate TPI
          { wch: 15 }, // Similarity Score
          { wch: 15 }, // AI Confidence
          { wch: 20 }, // Status
          { wch: 20 }, // Action Taken
        ];
        
        ws['!cols'] = colWidths;
        
        // Create workbook and add worksheet
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Deduplication Results');
        
        // Generate file name with filter indication if filtered
        const fileName = globalFilter 
          ? `deduplication_results_filtered_${new Date().toISOString().slice(0,10)}.xlsx`
          : `deduplication_results_${new Date().toISOString().slice(0,10)}.xlsx`;
        
        // Generate Excel file and trigger download
        XLSX.writeFile(wb, fileName);
        
        // Reset loading state
        setIsExporting(false);
      }, 100);
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
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredData.length} of {data.length} potential duplicate {data.length === 1 ? 'pair' : 'pairs'}.
            {statusFilter !== "all" && ` (Status: ${statusFilter})`}
            {confidenceFilter !== "all" && ` (Confidence: ${confidenceFilter})`}
          </p>
          <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:space-x-2">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportToExcel}
                disabled={!data || data.length === 0 || isExporting}
              >
                {isExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Exporting...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" /> Export to Excel
                  </>
                )}
              </Button>
              <Input
                placeholder="Search all columns..."
                value={globalFilter ?? ""}
                onChange={(event) => setGlobalFilter(event.target.value)}
                className="max-w-sm"
              />
            </div>
            
            <div className="flex items-center space-x-2">
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
                <SelectTrigger className="h-8 w-[130px]">
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
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
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
    </Card>
  );
}

    