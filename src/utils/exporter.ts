import { toCanvas, toJpeg } from 'html-to-image';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';

export interface GeneratedPage {
  pageNumber: number;
  totalPages: number;
  dataUrl: string;
}

/**
 * Intelligently divides study material and notes into clean, beautifully balanced
 * multi-page A4 sheets so that sections and equations never get clipped mid-line.
 */
export function paginateStudyMaterial(markdownText: string, notes?: string): string[] {
  if (!markdownText || !markdownText.trim()) {
    return [notes && notes.trim() ? `## 📌 Scratchpad Notes\n\n${notes.trim()}` : 'No study material provided.'];
  }

  const clean = markdownText.trim();

  // Check for the standard 5-pillar StudyBestie headers
  // Split on level 1 or 2 markdown headers
  const headerSplit = clean.split(/(?=^#{1,2}\s+)/m).map((s) => s.trim()).filter(Boolean);

  let pages: string[] = [];

  if (headerSplit.length >= 3) {
    if (headerSplit.length === 3) {
      // 3 sections -> 2 or 3 pages
      pages = [
        headerSplit[0],
        headerSplit[1],
        notes && notes.trim()
          ? `${headerSplit[2]}\n\n## 📌 Scratchpad Notes\n\n${notes.trim()}`
          : headerSplit[2],
      ];
    } else if (headerSplit.length === 4) {
      pages = [
        [headerSplit[0], headerSplit[1]].join('\n\n'),
        headerSplit[2],
        notes && notes.trim()
          ? `${headerSplit[3]}\n\n## 📌 Scratchpad Notes\n\n${notes.trim()}`
          : headerSplit[3],
      ];
    } else {
      // 5 or more sections (e.g. Asli Mudda, Dimaag Mein Fit, Desi Analogy, Exam Fodna, Test Yourself)
      // Page 1: Asli Mudda (1) + Key Concepts (2)
      // Page 2: Ek Dum Desi Analogy (3) + Exam & Real-Life Practical Application (4)
      // Page 3: Test Yourself Yaar! (5) + Scratchpad Notes
      const page1 = [headerSplit[0], headerSplit[1]].filter(Boolean).join('\n\n');
      const page2 = [headerSplit[2], headerSplit[3]].filter(Boolean).join('\n\n');
      const remainingSections = headerSplit.slice(4).join('\n\n');
      const page3 = notes && notes.trim()
        ? `${remainingSections}\n\n## 📌 Scratchpad Notes\n\n${notes.trim()}`
        : remainingSections;

      pages = [page1, page2, page3];
    }
  } else {
    // If no distinct ## headers, paginate by natural paragraph blocks
    const paragraphs = clean.split(/\n\s*\n/);
    let currentPage = '';
    const targetLength = 1200; // character budget per page for comfortable A4 reading

    for (const p of paragraphs) {
      if ((currentPage + '\n\n' + p).length > targetLength && currentPage.length > 350) {
        pages.push(currentPage.trim());
        currentPage = p;
      } else {
        currentPage = currentPage ? `${currentPage}\n\n${p}` : p;
      }
    }
    if (currentPage.trim()) {
      pages.push(currentPage.trim());
    }

    if (notes && notes.trim()) {
      if (pages.length > 0) {
        pages[pages.length - 1] += `\n\n## 📌 Scratchpad Notes\n\n${notes.trim()}`;
      } else {
        pages.push(`## 📌 Scratchpad Notes\n\n${notes.trim()}`);
      }
    }
  }

  // Guarantee at least 1 page
  if (pages.length === 0) {
    pages = [clean];
  }

  return pages;
}

/**
 * Prepares and renders a specific DOM element (like an individual page or master container)
 * into a high-resolution canvas.
 */
export async function captureElementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const scrollWidth = Math.max(element.scrollWidth, element.offsetWidth, 700);
  const scrollHeight = Math.max(element.scrollHeight, element.offsetHeight, 900);

  // Attempt 1: html-to-image with skipFonts: true (prevents SecurityError on remote cssRules)
  try {
    const canvas = await toCanvas(element, {
      backgroundColor: '#ffffff',
      pixelRatio: 2,
      cacheBust: true,
      skipFonts: true,
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
    console.warn('toCanvas failed, falling back to html2canvas:', err);
    try {
      // Attempt 2: html2canvas with scale: 2 and useCORS
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: scrollWidth,
      });
      return canvas;
    } catch (h2cErr) {
      console.warn('html2canvas failed, falling back to toJpeg renderer with skipFonts:', h2cErr);
      const dataUrl = await toJpeg(element, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        skipFonts: true,
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
}

/**
 * Downloads a complete multi-page PDF document where each page element
 * is mapped 1:1 to an A4 page without slicing text or leaving content out.
 */
export async function downloadPagesAsPdf(
  pageElements: HTMLElement[],
  filename = 'StudyBestie_Notes.pdf'
): Promise<{ totalPages: number }> {
  if (!pageElements || pageElements.length === 0) {
    throw new Error('No page elements provided for PDF export');
  }

  const pdf = new jsPDF('p', 'mm', 'a4');
  const a4WidthMm = 210;
  const a4HeightMm = 297;

  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i];
    const canvas = await captureElementToCanvas(el);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    if (i > 0) {
      pdf.addPage('a4', 'p');
    }
    pdf.addImage(dataUrl, 'JPEG', 0, 0, a4WidthMm, a4HeightMm);
  }

  const pdfFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  pdf.save(pdfFilename);

  return { totalPages: pageElements.length };
}

/**
 * Downloads all individual pages as JPG images bundled into a single .ZIP file
 */
export async function downloadPagesAsJpgZip(
  pageElements: HTMLElement[],
  baseFilename = 'StudyBestie_Notes'
): Promise<{ totalPages: number }> {
  if (!pageElements || pageElements.length === 0) {
    throw new Error('No page elements provided for JPG ZIP export');
  }

  const zip = new JSZip();
  const cleanBase = baseFilename.replace(/[\s\W]+/g, '_');

  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i];
    const canvas = await captureElementToCanvas(el);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const base64Data = dataUrl.replace(/^data:image\/jpeg;base64,/, '');
    const pageNum = String(i + 1).padStart(2, '0');
    const totalPagesStr = String(pageElements.length).padStart(2, '0');

    zip.file(`${cleanBase}_Page_${pageNum}_of_${totalPagesStr}.jpg`, base64Data, { base64: true });
  }

  const zipContent = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipContent);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${cleanBase}_All_${pageElements.length}_Pages.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { totalPages: pageElements.length };
}

/**
 * Downloads each individual page directly as separate JPG files
 */
export async function downloadPagesIndividually(
  pageElements: HTMLElement[],
  baseFilename = 'StudyBestie_Notes'
): Promise<{ totalPages: number }> {
  if (!pageElements || pageElements.length === 0) {
    throw new Error('No page elements provided for individual JPG export');
  }

  const cleanBase = baseFilename.replace(/[\s\W]+/g, '_');

  for (let i = 0; i < pageElements.length; i++) {
    const el = pageElements[i];
    const canvas = await captureElementToCanvas(el);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

    const link = document.createElement('a');
    const pageNum = String(i + 1).padStart(2, '0');
    link.download = `${cleanBase}_Page_${pageNum}.jpg`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Stagger downloads slightly so browser doesn't block parallel trigger
    if (i < pageElements.length - 1) {
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  return { totalPages: pageElements.length };
}

/**
 * Captures the entire continuous multi-page element as one single scrollable master JPG
 */
export async function downloadContinuousJpg(
  containerElement: HTMLElement,
  filename = 'StudyBestie_Complete_Notes.jpg'
): Promise<void> {
  const masterCanvas = await captureElementToCanvas(containerElement);
  const dataUrl = masterCanvas.toDataURL('image/jpeg', 0.95);

  const link = document.createElement('a');
  link.download = filename.endsWith('.jpg') ? filename : `${filename}.jpg`;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
