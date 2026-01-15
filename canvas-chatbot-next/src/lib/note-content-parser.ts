/**
 * Utility functions to parse note content and detect if it's suitable for graphs or tables
 */

export interface GraphData {
  type: 'bar' | 'line' | 'pie'
  data: Array<{ name: string; value: number }>
  title?: string
}

export interface TableData {
  headers: string[]
  rows: string[][]
  title?: string
}

/**
 * Detects if content contains structured data suitable for a graph
 * Looks for patterns like:
 * - Lists with numbers: "Item A: 50, Item B: 30"
 * - Comparisons: "X has 40%, Y has 60%"
 * - Numbered lists with values
 */
export function detectGraphData(content: string): GraphData | null {
  // Pattern 1: Key-value pairs with numbers (e.g., "Item A: 50, Item B: 30")
  const keyValuePattern = /([^:,\n]+):\s*(\d+(?:\.\d+)?)/g
  const keyValueMatches = Array.from(content.matchAll(keyValuePattern))
  
  if (keyValueMatches.length >= 2) {
    const data = keyValueMatches
      .map(match => ({
        name: match[1].trim(),
        value: parseFloat(match[2])
      }))
      .filter(item => !isNaN(item.value))
    
    if (data.length >= 2) {
      return {
        type: data.length <= 5 ? 'pie' : 'bar',
        data,
        title: 'Data Overview'
      }
    }
  }

  // Pattern 2: Percentage comparisons (e.g., "X: 40%, Y: 60%")
  const percentagePattern = /([^:,\n]+):\s*(\d+(?:\.\d+)?)%/g
  const percentageMatches = Array.from(content.matchAll(percentagePattern))
  
  if (percentageMatches.length >= 2) {
    const data = percentageMatches
      .map(match => ({
        name: match[1].trim(),
        value: parseFloat(match[2])
      }))
      .filter(item => !isNaN(item.value))
    
    if (data.length >= 2) {
      return {
        type: 'pie',
        data,
        title: 'Distribution'
      }
    }
  }

  // Pattern 3: Numbered or bulleted lists with numeric values
  const listPattern = /[-*•]\s*([^:]+):\s*(\d+(?:\.\d+)?)/g
  const listMatches = Array.from(content.matchAll(listPattern))
  
  if (listMatches.length >= 2) {
    const data = listMatches
      .map(match => ({
        name: match[1].trim(),
        value: parseFloat(match[2])
      }))
      .filter(item => !isNaN(item.value))
    
    if (data.length >= 2) {
      return {
        type: data.length <= 5 ? 'pie' : 'bar',
        data,
        title: 'Comparison'
      }
    }
  }

  // Pattern 4: Table-like data in markdown format
  const markdownTablePattern = /\|(.+)\|/g
  const tableMatches = Array.from(content.matchAll(markdownTablePattern))
  
  if (tableMatches.length >= 2) {
    // Try to extract numeric data from markdown table
    const rows = tableMatches.map(match => {
      const cells = match[1].split('|').map(c => c.trim()).filter(c => c)
      return cells
    })
    
    if (rows.length >= 2 && rows[0].length >= 2) {
      // Check if we have numeric data in columns
      const numericData: GraphData['data'] = []
      for (let colIdx = 1; colIdx < rows[0].length; colIdx++) {
        const header = rows[0][colIdx]
        const values = rows.slice(1).map(row => parseFloat(row[colIdx] || '0')).filter(v => !isNaN(v))
        
        if (values.length > 0) {
          // Use first numeric column for graph
          rows.slice(1).forEach((row, idx) => {
            const name = row[0] || `Item ${idx + 1}`
            const value = parseFloat(row[colIdx] || '0')
            if (!isNaN(value)) {
              numericData.push({ name, value })
            }
          })
          break
        }
      }
      
      if (numericData.length >= 2) {
        return {
          type: numericData.length <= 5 ? 'pie' : 'bar',
          data: numericData,
          title: rows[0][0] || 'Data'
        }
      }
    }
  }

  return null
}

/**
 * Detects if content contains structured data suitable for a table
 * Only detects markdown tables - the most reliable indicator of tabular data
 */
export function detectTableData(content: string): TableData | null {
  // Only detect markdown tables - these are clearly structured and intentional
  const markdownTablePattern = /\|(.+)\|/g
  const tableMatches = Array.from(content.matchAll(markdownTablePattern))
  
  if (tableMatches.length >= 2) {
    const rows = tableMatches.map(match => {
      const cells = match[1].split('|').map(c => c.trim()).filter(c => c)
      return cells
    })
    
    // Require at least 2 rows (header + data) and 2 columns
    if (rows.length >= 2 && rows[0].length >= 2) {
      // Skip separator row (usually contains dashes)
      const headerRow = rows[0]
      const isSeparatorRow = (row: string[]) => row.every(cell => /^[-:]+$/.test(cell))
      
      const dataRows = rows.slice(1).filter(row => !isSeparatorRow(row))
      
      // Only create table if we have actual data rows (not just separator)
      if (dataRows.length > 0) {
        return {
          headers: headerRow,
          rows: dataRows,
          title: 'Data Table'
        }
      }
    }
  }

  return null
}

/**
 * Determines if content should be rendered as a graph or table
 * Priority: Table > Graph > Text
 */
export function detectContentType(content: string): 'graph' | 'table' | 'text' {
  const tableData = detectTableData(content)
  if (tableData) return 'table'
  
  const graphData = detectGraphData(content)
  if (graphData) return 'graph'
  
  return 'text'
}
