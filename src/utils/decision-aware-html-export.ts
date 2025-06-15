import type { DuplicatePair } from '@/types';

interface HtmlExportOptions {
  globalFilter?: string;
  statusFilter?: string;
  confidenceFilter?: string;
  showInstructions?: boolean;
}

interface ExportStats {
  totalPairs: number;
  processedPairs: number;
  highConfidence: number;
  mediumConfidence: number;
  lowConfidence: number;
  merged: number;
  notDuplicate: number;
  skipped: number;
  pending: number;
}

/**
 * Export duplicate pairs with decisions to HTML format matching Option 2 design
 * @param data - Array of duplicate pairs with their status decisions
 * @param filteredData - Pre-filtered data from table
 * @param options - Export options
 */
export const exportDecisionAwareHtml = async (
  data: DuplicatePair[],
  filteredData: DuplicatePair[],
  options: HtmlExportOptions = {}
): Promise<void> => {
  if (!data || data.length === 0) {
    throw new Error('No data available to export');
  }

  const { globalFilter, statusFilter, confidenceFilter, showInstructions = true } = options;
  const dataToExport = filteredData.length > 0 ? filteredData : data;
  
  if (dataToExport.length === 0) {
    throw new Error('No data to export after filtering');
  }

  // Calculate statistics
  const stats = calculateExportStats(dataToExport, data);
  
  // Group data by confidence and status
  const groupedData = groupDataByConfidenceAndStatus(dataToExport);
  
  // Generate HTML content
  const htmlContent = generateHtmlContent(groupedData, stats, options);
  
  // Download as HTML file
  downloadHtmlFile(htmlContent, options);
};

/**
 * Calculate export statistics
 */
function calculateExportStats(exportData: DuplicatePair[], allData: DuplicatePair[]): ExportStats {
  const processedPairs = exportData.filter(pair => pair.status !== 'pending').length;
  
  return {
    totalPairs: allData.length,
    processedPairs,
    highConfidence: exportData.filter(pair => {
      const score = pair.enhancedScore || (pair.similarityScore * 100);
      return score >= 98;
    }).length,
    mediumConfidence: exportData.filter(pair => {
      const score = pair.enhancedScore || (pair.similarityScore * 100);
      return score >= 90 && score < 98;
    }).length,
    lowConfidence: exportData.filter(pair => {
      const score = pair.enhancedScore || (pair.similarityScore * 100);
      return score < 90;
    }).length,
    merged: exportData.filter(pair => pair.status === 'merged' || pair.status === 'duplicate').length,
    notDuplicate: exportData.filter(pair => pair.status === 'not_duplicate').length,
    skipped: exportData.filter(pair => pair.status === 'skipped').length,
    pending: exportData.filter(pair => pair.status === 'pending').length,
  };
}

/**
 * Group data by confidence level and status for organized display
 */
function groupDataByConfidenceAndStatus(data: DuplicatePair[]) {
  const groups = {
    highConfidence: data.filter(pair => {
      const score = pair.enhancedScore || (pair.similarityScore * 100);
      return score >= 98;
    }),
    mediumConfidence: data.filter(pair => {
      const score = pair.enhancedScore || (pair.similarityScore * 100);
      return score >= 90 && score < 98;
    }),
    lowConfidence: data.filter(pair => {
      const score = pair.enhancedScore || (pair.similarityScore * 100);
      return score < 90;
    }),
  };

  // Sort each group by status (processed decisions first)
  Object.keys(groups).forEach(key => {
    groups[key as keyof typeof groups].sort((a, b) => {
      const statusOrder = { 'merged': 1, 'duplicate': 1, 'not_duplicate': 2, 'skipped': 3, 'pending': 4 };
      return (statusOrder[a.status] || 5) - (statusOrder[b.status] || 5);
    });
  });

  return groups;
}

/**
 * Generate complete HTML content
 */
function generateHtmlContent(
  groupedData: ReturnType<typeof groupDataByConfidenceAndStatus>,
  stats: ExportStats,
  options: HtmlExportOptions
): string {
  const filterInfo = buildFilterDescription(options.globalFilter, options.statusFilter, options.confidenceFilter);
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Customer Master Data Deduplication Results</title>
    <style>
        ${getHtmlStyles()}
    </style>
</head>
<body>
    ${generateHeader(stats, filterInfo)}
    ${options.showInstructions ? generateInstructions() : ''}
    ${generateHighConfidenceSection(groupedData.highConfidence)}
    ${generateMediumConfidenceSection(groupedData.mediumConfidence)}
    ${generateLowConfidenceSection(groupedData.lowConfidence)}
    ${generateSummarySection(stats)}
</body>
</html>`;
}

/**
 * Generate CSS styles for the HTML export
 */
function getHtmlStyles(): string {
  return `
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
            background-color: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .section {
            background: white;
            margin: 20px 0;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .section-header {
            padding: 15px 20px;
            font-size: 18px;
            font-weight: bold;
            color: white;
        }
        .high-confidence { background-color: #28a745; }
        .medium-confidence { background-color: #ffc107; color: #000; }
        .low-confidence { background-color: #dc3545; }
        
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
        }
        th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
            vertical-align: top;
        }
        th {
            background-color: #f8f9fa;
            font-weight: bold;
        }
        .master-record { background-color: #e8f5e8; }
        .duplicate-record { background-color: #fff3cd; }
        .decision-columns { background-color: #f0f8ff; }
        .difference { background-color: #ffebee; font-weight: bold; }
        .match { background-color: #e8f5e8; }
        .processed { background-color: #d4edda; }
        .pending { background-color: #fff3cd; }
        
        .instructions {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .summary-section {
            background-color: #e3f2fd;
            border: 1px solid #bbdefb;
            border-radius: 4px;
            padding: 15px;
            margin: 20px 0;
        }
        
        .stats-grid {
            display: flex;
            justify-content: space-between;
            flex-wrap: wrap;
        }
        
        .stat-item {
            flex: 1;
            min-width: 200px;
            margin: 10px;
        }
    `;
}

/**
 * Generate header section with export metadata
 */
function generateHeader(stats: ExportStats, filterInfo: string): string {
  return `
    <div class="header">
        <h1>Customer Master Data Deduplication Results</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()} | <strong>Total Pairs:</strong> ${stats.totalPairs} | <strong>Processed:</strong> ${stats.processedPairs}</p>
        <p><strong>Filter:</strong> ${filterInfo}</p>
        <p><strong>Progress:</strong> ${Math.round((stats.processedPairs / stats.totalPairs) * 100)}% of duplicates have been reviewed and decided</p>
    </div>
  `;
}

/**
 * Generate instructions section
 */
function generateInstructions(): string {
  return `
    <div class="instructions">
        <h3>📋 Next Steps for SAP S/4 Implementation</h3>
        <ul>
            <li><strong>✅ MERGED Records:</strong> Insert master record into SAP S/4, mark duplicate as superseded</li>
            <li><strong>❌ NOT DUPLICATE Records:</strong> Insert both records as separate entities in SAP S/4</li>
            <li><strong>⏸️ SKIPPED Records:</strong> Review again or insert as separate entities</li>
            <li><strong>⏳ PENDING Records:</strong> Still need review and decision in the React application</li>
            <li><strong>🎯 Goal:</strong> Use these decisions to build your SAP S/4 master data repository</li>
        </ul>
    </div>
  `;
}

/**
 * Generate high confidence section
 */
function generateHighConfidenceSection(data: DuplicatePair[]): string {
  if (data.length === 0) return '';
  
  const processedCount = data.filter(pair => pair.status !== 'pending').length;
  
  return `
    <div class="section">
        <div class="section-header high-confidence">
            🟢 HIGH CONFIDENCE MATCHES (≥98% Similarity) - Ready for SAP S/4 Implementation
            <span style="float: right;">Total: ${data.length} | Processed: ${processedCount}</span>
        </div>
        <div style="overflow-x: auto;">
            ${generateDataTable(data, 'high')}
        </div>
    </div>
  `;
}

/**
 * Generate medium confidence section
 */
function generateMediumConfidenceSection(data: DuplicatePair[]): string {
  if (data.length === 0) return '';
  
  const processedCount = data.filter(pair => pair.status !== 'pending').length;
  
  return `
    <div class="section">
        <div class="section-header medium-confidence">
            🟡 MEDIUM CONFIDENCE MATCHES (90-97% Similarity) - Review Completed
            <span style="float: right;">Total: ${data.length} | Processed: ${processedCount}</span>
        </div>
        <div style="overflow-x: auto;">
            ${generateDataTable(data, 'medium')}
        </div>
    </div>
  `;
}

/**
 * Generate low confidence section
 */
function generateLowConfidenceSection(data: DuplicatePair[]): string {
  if (data.length === 0) return '';
  
  const processedCount = data.filter(pair => pair.status !== 'pending').length;
  
  return `
    <div class="section">
        <div class="section-header low-confidence">
            🔴 LOW CONFIDENCE MATCHES (&lt;90% Similarity) - Investigation Results
            <span style="float: right;">Total: ${data.length} | Processed: ${processedCount}</span>
        </div>
        <div style="overflow-x: auto;">
            ${generateDataTable(data, 'low')}
        </div>
    </div>
  `;
}

/**
 * Generate data table for a confidence level
 */
function generateDataTable(data: DuplicatePair[], confidenceLevel: string): string {
  const tableHeaders = `
    <table>
        <thead>
            <tr>
                <th>Pair ID</th>
                <th class="master-record">Master Record Name</th>
                <th class="master-record">Master Address</th>
                <th class="master-record">Master TPI</th>
                <th class="duplicate-record">Duplicate Record Name</th>
                <th class="duplicate-record">Duplicate Address</th>
                <th class="duplicate-record">Duplicate TPI</th>
                <th class="decision-columns">Your Decision</th>
                <th class="decision-columns">Original Score %</th>
                <th class="decision-columns">Enhanced Score %</th>
                <th class="decision-columns">AI Confidence</th>
                <th class="decision-columns">Score Change</th>
                <th class="decision-columns">SAP S/4 Action</th>
            </tr>
        </thead>
        <tbody>
  `;

  const tableRows = data.map((pair, index) => {
    const rowClass = pair.status === 'pending' ? 'pending' : 'processed';
    const sapAction = getSapS4Action(pair.status);
    
    // Use enhanced score if available, otherwise use similarity score
    const originalScore = pair.originalScore || (pair.similarityScore * 100);
    const enhancedScore = pair.enhancedScore || originalScore;
    const scoreDifference = enhancedScore - originalScore;
    
    let scoreChangeDisplay = "No Enhancement";
    if (pair.enhancedScore && Math.abs(scoreDifference) >= 1) {
      if (scoreDifference > 0) {
        scoreChangeDisplay = `+${scoreDifference.toFixed(1)} pts (Enhanced)`;
      } else {
        scoreChangeDisplay = `${scoreDifference.toFixed(1)} pts (Reduced)`;
      }
    }
    
    return `
            <tr class="${rowClass}">
                <td>DP${String(index + 1).padStart(3, '0')}</td>
                <td class="master-record">${pair.record1.name || ''}</td>
                <td class="master-record">${pair.record1.address || ''}</td>
                <td class="master-record">${pair.record1.tpi || 'Missing'}</td>
                <td class="duplicate-record">${pair.record2.name || ''}</td>
                <td class="duplicate-record">${pair.record2.address || ''}</td>
                <td class="duplicate-record">${pair.record2.tpi || 'Missing'}</td>
                <td class="decision-columns"><strong>${getStatusDisplayName(pair.status)}</strong></td>
                <td class="decision-columns">${originalScore.toFixed(1)}%</td>
                <td class="decision-columns">${enhancedScore.toFixed(1)}%</td>
                <td class="decision-columns">${pair.enhancedConfidence || pair.aiConfidence || '-'}</td>
                <td class="decision-columns">${scoreChangeDisplay}</td>
                <td class="decision-columns">${sapAction}</td>
            </tr>
    `;
  }).join('');

  return tableHeaders + tableRows + `
        </tbody>
    </table>
  `;
}

/**
 * Generate summary section with actionable next steps
 */
function generateSummarySection(stats: ExportStats): string {
  const completionRate = Math.round((stats.processedPairs / stats.totalPairs) * 100);
  
  return `
    <div class="summary-section">
        <h3>📊 Implementation Summary & Next Steps</h3>
        <div class="stats-grid">
            <div class="stat-item">
                <h4>Review Progress</h4>
                <ul>
                    <li><strong>Total Duplicate Pairs:</strong> ${stats.totalPairs}</li>
                    <li><strong>Reviewed & Decided:</strong> ${stats.processedPairs} (${completionRate}%)</li>
                    <li><strong>Still Pending:</strong> ${stats.pending}</li>
                </ul>
            </div>
            <div class="stat-item">
                <h4>Decisions Made</h4>
                <ul>
                    <li><strong>Merge These:</strong> ${stats.merged} pairs</li>
                    <li><strong>Keep Separate:</strong> ${stats.notDuplicate} pairs</li>
                    <li><strong>Skipped:</strong> ${stats.skipped} pairs</li>
                </ul>
            </div>
            <div class="stat-item">
                <h4>SAP S/4 Actions Required</h4>
                <ul>
                    <li><strong>Master Records to Insert:</strong> ${stats.merged}</li>
                    <li><strong>Supersede Operations:</strong> ${stats.merged}</li>
                    <li><strong>Separate Records to Create:</strong> ${stats.notDuplicate * 2}</li>
                    <li><strong>Records Needing Review:</strong> ${stats.pending + stats.skipped}</li>
                </ul>
            </div>
        </div>
        
        <h3>🎯 Immediate Action Plan</h3>
        <div style="background-color: #fff; border: 1px solid #ddd; border-radius: 4px; padding: 15px;">
            <h4 style="color: #28a745;">✅ Ready for SAP S/4 Implementation:</h4>
            <ol>
                <li><strong>Insert ${stats.merged} Master Records</strong> - Use the "Master Record" data from MERGED pairs</li>
                <li><strong>Create Supersede Records</strong> - Mark duplicate records as superseded, pointing to masters</li>
                <li><strong>Insert ${stats.notDuplicate * 2} Separate Records</strong> - Create both records from NOT DUPLICATE pairs</li>
            </ol>
            
            <h4 style="color: #ffc107;">⚠️ Still Need Attention:</h4>
            <ul>
                <li><strong>${stats.pending} Pending Pairs</strong> - Return to React app to complete review</li>
                <li><strong>${stats.skipped} Skipped Pairs</strong> - Make final decision: merge or keep separate</li>
            </ul>
            
            <h4 style="color: #17a2b8;">📈 Progress Tracking:</h4>
            <p>You have completed <strong>${completionRate}%</strong> of the duplicate review process. 
            ${stats.pending > 0 ? `Complete the remaining ${stats.pending} pairs in the React application to reach 100%.` : 'Great job! All duplicates have been reviewed.'}</p>
        </div>
    </div>
  `;
}

/**
 * Helper functions
 */
function getStatusDisplayName(status: DuplicatePair['status']): string {
  switch (status) {
    case 'merged':
    case 'duplicate':
      return 'MERGED';
    case 'not_duplicate':
      return 'NOT DUPLICATE';
    case 'skipped':
      return 'SKIPPED';
    case 'pending':
      return 'PENDING REVIEW';
    default:
      return 'UNKNOWN';
  }
}

function getSapS4Action(status: DuplicatePair['status']): string {
  switch (status) {
    case 'merged':
    case 'duplicate':
      return 'Insert Master → Supersede Duplicate';
    case 'not_duplicate':
      return 'Insert Both as Separate Records';
    case 'skipped':
      return 'Pending Decision';
    case 'pending':
      return 'Complete Review First';
    default:
      return 'No Action Defined';
  }
}

function buildFilterDescription(globalFilter?: string, statusFilter?: string, confidenceFilter?: string): string {
  const filters: string[] = [];
  
  if (globalFilter) filters.push(`Search: "${globalFilter}"`);
  if (statusFilter && statusFilter !== 'all') filters.push(`Status: ${statusFilter}`);
  if (confidenceFilter && confidenceFilter !== 'all') filters.push(`Confidence: ${confidenceFilter}`);
  
  return filters.length > 0 ? `Filters applied: ${filters.join(', ')}` : 'No filters applied';
}

/**
 * Download the HTML content as a file
 */
function downloadHtmlFile(htmlContent: string, options: HtmlExportOptions): void {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  const dateStr = new Date().toISOString().slice(0, 10);
  const hasFilters = !!(options.globalFilter || options.statusFilter || options.confidenceFilter);
  const fileName = hasFilters 
    ? `deduplication_decisions_filtered_${dateStr}.html`
    : `deduplication_decisions_${dateStr}.html`;
  
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}