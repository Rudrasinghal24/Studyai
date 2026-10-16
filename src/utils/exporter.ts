import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export interface ExportOptions {
  title?: string;
  isHandwritten?: boolean;
  elementId?: string;
}

/**
 * Downloads a DOM element as a high-resolution JPG image
 */
export async function downloadAsJpg(element: HTMLElement, filename = 'StudyBestie_Notes.jpg'): Promise<void> {
  // Save original scroll and styles
  const canvas = await html2canvas(element, {
    scale: 2, // 2x resolution for high DPI crispness
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const link = document.createElement('a');
  link.download = filename.endsWith('.jpg') ? filename : `${filename}.jpg`;
  link.href = imgData;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads a DOM element as a formatted PDF document
 */
export async function downloadAsPdf(element: HTMLElement, filename = 'StudyBestie_Notes.pdf'): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgWidth = 210; // A4 width in mm
  const pageHeight = 297; // A4 height in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;

  const pdf = new jsPDF('p', 'mm', 'a4');
  let position = 0;

  // First page
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // Subsequent pages if long document
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

/**
 * Fallback to browser print window for high-fidelity native PDF output
 */
export function openPrintDialog(): void {
  window.print();
}
