import * as XLSX from 'xlsx';
import type { DuplicatePair } from '@/types';

interface ExportOptions {
  globalFilter?: string;
  statusFilter?: string;
  confidenceFilter?: string;
}

/**
 * Export duplicate pairs data to Excel with advanced formatting and grouping
 * @param data - Array of duplicate pairs to export
 * @param filteredData - Pre-filtered data (if using table filtering)
 * @param options - Export options including filters
 */
export const exportDuplicatePairsToExcel = async (
  data: DuplicatePair[],
  filteredData: DuplicatePair[],
  options: ExportOptions = {}
): Promise<void> => {
  if (!data || data.length === 0) {
    throw new Error('No data available to export');
  }

  const { globalFilter, statusFilter, confidenceFilter } = options;
  
  // Use filtered data if provided, otherwise use all data
  const dataToExport = filteredData.length > 0 ? filteredData : data;
  
  if (dataToExport.length === 0) {
    throw new Error('No data to export after filtering');
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
  const sortedData = [...dataToExport].sort((a, b) => {
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
    filter: buildFilterDescription(globalFilter, statusFilter, confidenceFilter),
    empty1: '',
    empty2: ''
  });
  
  // Add summary of filtered data
  exportData.push({
    section: 'Export Summary',
    info: `Total Records: ${dataToExport.length}/${data.length}`,
    filter: hasFilters(globalFilter, statusFilter, confidenceFilter) ? 'Filtered View' : 'Complete View',
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
        masterRowId: 'Master Row Number',
        duplicateRowId: 'Duplicate Row Number',
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
        const baseRow = {
          similarityScore: `${(pair.similarityScore * 100).toFixed(0)}%`,
          aiConfidence: pair.aiConfidence || '-',
          status: getStatusDisplayName(pair.status),
        };

        // For merged and duplicate, only keep the master record
        if (status === 'merged' || status === 'duplicate') {
          const row: any = {
            masterRowId: pair.record1.rowNumber || '',
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
            ...baseRow,
            action: 'Merged to Master'
          };
          
          exportData.push(row);
        }
        // For skipped and not_duplicate, keep both records
        else if (status === 'skipped' || status === 'not_duplicate' || status === 'pending') {
          const row: any = {
            masterRowId: pair.record1.rowNumber || '',
            duplicateRowId: pair.record2.rowNumber || '',
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
            ...baseRow,
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
    { wch: 15 }, // Master Row Number
    { wch: 15 }, // Duplicate Row Number
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
  const fileName = generateFileName(globalFilter, statusFilter, confidenceFilter);
  
  // Generate Excel file and trigger download
  XLSX.writeFile(wb, fileName);
};

/**
 * Helper function to build filter description for export metadata
 */
function buildFilterDescription(globalFilter?: string, statusFilter?: string, confidenceFilter?: string): string {
  const filters: string[] = [];
  
  if (globalFilter) {
    filters.push(`Search: "${globalFilter}"`);
  }
  
  if (statusFilter && statusFilter !== 'all') {
    filters.push(`Status: ${statusFilter}`);
  }
  
  if (confidenceFilter && confidenceFilter !== 'all') {
    filters.push(`Confidence: ${confidenceFilter}`);
  }
  
  return filters.length > 0 ? `Filters applied: ${filters.join(', ')}` : 'No filters applied';
}

/**
 * Helper function to check if any filters are applied
 */
function hasFilters(globalFilter?: string, statusFilter?: string, confidenceFilter?: string): boolean {
  return !!(globalFilter || (statusFilter && statusFilter !== 'all') || (confidenceFilter && confidenceFilter !== 'all'));
}

/**
 * Helper function to generate filename based on filters
 */
function generateFileName(globalFilter?: string, statusFilter?: string, confidenceFilter?: string): string {
  const dateStr = new Date().toISOString().slice(0, 10);
  const hasAnyFilter = hasFilters(globalFilter, statusFilter, confidenceFilter);
  
  return hasAnyFilter 
    ? `deduplication_results_filtered_${dateStr}.xlsx`
    : `deduplication_results_${dateStr}.xlsx`;
} 