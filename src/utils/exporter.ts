import { toCanvas, toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

export interface ExportOptions {
  title?: string;
  isHandwritten?: boolean;
  elementId?: string;
}

export interface GeneratedPage {
  pageNumber: number;
  totalPages: number;
  dataUrl: string;
}

/**
 * Prepares the element for full capture by ensuring all scrollable parents
 * and children are visible and measuring true scrollHeight.
 */
async function captureFullElementCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  // Ensure the target element is fully laid out and images/fonts are loaded
  const scrollWidth = Math.max(element.scrollWidth, element.offsetWidth, 800);
  const scrollHeight = Math.max(element.scrollHeight, element.offsetHeight, 1000);

  // Use toCanvas with explicit width and height matching scroll dimensions
  try {
    const canvas = await toCanvas(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
      width: scrollWidth,
      height: scrollHeight,
      style: {
        maxHeight: 'none',
        height: 'auto',
        overflow: 'visible',
      },
    });
    return canvas;
  } catch (err) {
    console.warn('Direct toCanvas failed, falling back to toJpeg renderer:', err);
    const dataUrl = await toJpeg(element, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
      width: scrollWidth,
      height: scrollHeight,
    });
    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.drawImage(img, 0, 0);
    return canvas;
  }
}

/**
 * Calculates sliced A4 page canvases from a master canvas
 */
function sliceCanvasIntoPages(masterCanvas: HTMLCanvasElement): HTMLCanvasElement[] {
  // A4 ratio: 210mm wide x 297mm high (1 : 1.4142)
  const a4PageHeightPx = Math.floor((masterCanvas.width * 297) / 210);
  const totalPages = Math.max(1, Math.ceil(masterCanvas.height / a4PageHeightPx));
  const pages: HTMLCanvasElement[] = [];

  for (let page = 0; page < totalPages; page++) {
    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = masterCanvas.width;
    pageCanvas.height = a4PageHeightPx;

    const ctx = pageCanvas.getContext('2d');
    if (!ctx) continue;

    // Crisp white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

    const startY = page * a4PageHeightPx;
    const remainingHeight = masterCanvas.height - startY;
    const sliceHeight = Math.min(a4PageHeightPx, Math.max(0, remainingHeight));

    if (sliceHeight > 0) {
      ctx.drawImage(
        masterCanvas,
        0,
        startY,
        masterCanvas.width,
        sliceHeight,
        0,
        0,
        masterCanvas.width,
        sliceHeight
      );
    }

    // Add crisp page footer numbering
    ctx.fillStyle = '#64748b';
    ctx.font = '600 24px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(
      `Page ${page + 1} of ${totalPages} • StudyBestie`,
      pageCanvas.width - 48,
      pageCanvas.height - 36
    );

    pages.push(pageCanvas);
  }

  return pages;
}

/**
 * Downloads a single continuous long-sheet JPG image containing the entire study material
 */
export async function downloadContinuousJpg(
  element: HTMLElement,
  filename = 'StudyBestie_Complete_Notes.jpg'
): Promise<void> {
  const masterCanvas = await captureFullElementCanvas(element);
  const dataUrl = masterCanvas.toDataURL('image/jpeg', 0.95);

  const link = document.createElement('a');
  link.download = filename.endsWith('.jpg') ? filename : `${filename}.jpg`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Slices the study material into multiple A4 pages and bundles them all into a single .ZIP file
 * so ALL pages download reliably without the browser blocking multi-file downloads!
 */
export async function downloadMultiPageJpgZip(
  element: HTMLElement,
  baseFilename = 'StudyBestie_Notes'
): Promise<{ totalPages: number }> {
  const masterCanvas = await captureFullElementCanvas(element);
  const pages = sliceCanvasIntoPages(masterCanvas);

  const zip = new JSZip();
  const cleanBase = baseFilename.replace(/[\s\W]+/g, '_');

  // Also include the complete continuous master sheet in the zip for convenience
  const continuousDataUrl = masterCanvas.toDataURL('image/jpeg', 0.95);
  const continuousBase64 = continuousDataUrl.replace(/^data:image\/jpeg;base64,/, '');
  zip.file(`${cleanBase}_Full_Continuous.jpg`, continuousBase64, { base64: true });

  // Add every sliced page
  for (let i = 0; i < pages.length; i++) {
    const pageDataUrl = pages[i].toDataURL('image/jpeg', 0.95);
    const base64Data = pageDataUrl.replace(/^data:image\/jpeg;base64,/, '');
    const pageNum = String(i + 1).padStart(2, '0');
    zip.file(`${cleanBase}_Page_${pageNum}_of_${pages.length}.jpg`, base64Data, { base64: true });
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipContent);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${cleanBase}_All_${pages.length}_Pages.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { totalPages: pages.length };
}

/**
 * Downloads a DOM element as a complete multi-page PDF document.
 * Accurately slices the master canvas into sequential A4 pages and appends each page
 * so that no content is cut off or missing.
 */
export async function downloadAsPdf(
  element: HTMLElement,
  filename = 'StudyBestie_Notes.pdf'
): Promise<{ totalPages: number }> {
  const masterCanvas = await captureFullElementCanvas(element);
  const pages = sliceCanvasIntoPages(masterCanvas);

  const a4WidthMm = 210;
  const a4HeightMm = 297;

  const pdf = new jsPDF('p', 'mm', 'a4');

  for (let i = 0; i < pages.length; i++) {
    const pageDataUrl = pages[i].toDataURL('image/jpeg', 0.95);
    if (i > 0) {
      pdf.addPage('a4', 'p');
    }
    pdf.addImage(pageDataUrl, 'JPEG', 0, 0, a4WidthMm, a4HeightMm);
  }

  const pdfFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(pdfFilename);

  return { totalPages: pages.length };
}

/**
 * Downloads as standard JPG - auto selects continuous or multi-page zip depending on options
 */
export async function downloadAsJpg(
  element: HTMLElement,
  filename = 'StudyBestie_Notes.jpg',
  asZip = true
): Promise<void> {
  const masterCanvas = await captureFullElementCanvas(element);
  const a4PageHeightPx = Math.floor((masterCanvas.width * 297) / 210);
  const totalPages = Math.ceil(masterCanvas.height / a4PageHeightPx);

  if (totalPages <= 1 || !asZip) {
    await downloadContinuousJpg(element, filename);
  } else {
    await downloadMultiPageJpgZip(element, filename.replace(/\.jpe?g$/i, ''));
  }
}
