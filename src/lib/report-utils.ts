import { Transaction, InventoryItem } from './types';
import { format } from 'date-fns';

/**
 * Exports data to a clean Excel file using the xlsx library.
 */
export async function exportToExcel(
  type: string, 
  transactions: Transaction[], 
  inventory: InventoryItem[], 
  range: { start: Date, end: Date },
  businessName: string
) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  
  let sheetData: any[] = [];
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  
  if (type === 'transaction-history' || type === 'profit-loss') {
    sheetData = transactions.map(t => ({
      'Date': format(new Date(t.timestamp), 'yyyy-MM-dd'),
      'Type': t.type.toUpperCase(),
      'Category': t.categoryName || t.category,
      'Description': t.description || '-',
      'Payment Method': t.paymentMethod.toUpperCase(),
      'Amount (₦)': t.amount
    }));

    // Add Financial Summary Rows
    sheetData.push({}); // Spacer
    sheetData.push({ 'Date': 'REPORT SUMMARY', 'Type': 'TOTAL INCOME', 'Amount (₦)': totalIncome });
    sheetData.push({ 'Type': 'TOTAL EXPENSES', 'Amount (₦)': totalExpense });
    sheetData.push({ 'Type': 'NET POSITION', 'Amount (₦)': totalIncome - totalExpense });

  } else if (type === 'income-expense') {
    const categories = Array.from(new Set(transactions.map(t => t.categoryName || t.category))).sort();
    sheetData = categories.map(cat => {
      const amount = transactions.filter(t => (t.categoryName || t.category) === cat).reduce((sum, t) => sum + t.amount, 0);
      const tType = transactions.find(t => (t.categoryName || t.category) === cat)?.type || 'expense';
      return {
        'Category Name': cat,
        'Type': tType.toUpperCase(),
        'Total Amount (₦)': amount,
        '% of Total Activity': ((amount / (totalIncome + totalExpense || 1)) * 100).toFixed(2) + '%'
      };
    });
    sheetData.push({});
    sheetData.push({ 'Category Name': 'TOTALS', 'Total Amount (₦)': totalIncome + totalExpense });

  } else if (type === 'inventory-valuation') {
    sheetData = inventory.filter(i => !i.isArchived).map(i => ({
      'Asset Name': i.itemName,
      'Type': i.type.toUpperCase(),
      'Category': i.category || '-',
      'Current Stock': i.type === 'goods' ? i.currentStock : 'Unlimited',
      'Unit Price/Value (₦)': i.type === 'goods' ? i.unitCost : i.value,
      'Total Asset Value (₦)': i.type === 'goods' ? (i.currentStock || 0) * (i.unitCost || 0) : i.value
    }));
    const totalInvVal = inventory.filter(i => !i.isArchived).reduce((sum, i) => {
      const val = i.type === 'goods' ? (i.currentStock || 0) * (i.unitCost || 0) : (i.value || 0);
      return sum + val;
    }, 0);
    sheetData.push({});
    sheetData.push({ 'Asset Name': 'TOTAL INVENTORY VALUATION', 'Total Asset Value (₦)': totalInvVal });
  }

  const ws = XLSX.utils.json_to_sheet(sheetData);
  
  // Set Column Widths
  ws['!cols'] = [
    { wch: 15 }, // Date / Name
    { wch: 15 }, // Type
    { wch: 25 }, // Category
    { wch: 35 }, // Description
    { wch: 15 }, // Method
    { wch: 20 }  // Amount
  ];

  XLSX.utils.book_append_sheet(wb, ws, type.substring(0, 30));
  
  const fileName = `${businessName.replace(/\s+/g, '_')}_${type.replace('-', '_')}_${format(range.start, 'MMM_yyyy')}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Exports a DOM element to a professional PDF using html2canvas and jspdf.
 */
export async function exportToPDF(element: HTMLElement, fileName: string) {
  const html2canvas = (await import('html2canvas')).default;
  const { jsPDF } = await import('jspdf');

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    windowWidth: 850
  });

  const imgData = canvas.toDataURL('image/jpeg', 1.0);
  const pdf = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(fileName);
}
