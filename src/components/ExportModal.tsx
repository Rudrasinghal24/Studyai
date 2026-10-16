import React, { useState, useRef } from 'react';
import {
  X,
  FileText,
  Image as ImageIcon,
  PenTool,
  Printer,
  Download,
  Check,
  Sparkles,
  BookOpen,
  FolderArchive,
  Layers,
} from 'lucide-react';
import {
  paginateStudyMaterial,
  downloadPagesAsPdf,
  downloadPagesAsJpgZip,
  downloadPagesIndividually,
  downloadContinuousJpg,
} from '../utils/exporter';
import { renderMarkdown } from '../utils/lessonParser';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  markdown: string;
  notes?: string;
  title?: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  markdown,
  notes,
  title = 'StudyBestie Notes',
}) => {
  const [styleMode, setStyleMode] = useState<'standard' | 'handwritten'>('handwritten');
  const [paperType, setPaperType] = useState<'lined' | 'grid' | 'cream'>('lined');
  const [inkColor, setInkColor] = useState<'blue' | 'black' | 'pink'>('blue');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [copiedMd, setCopiedMd] = useState(false);

  const pagesContainerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);

  if (!isOpen) return null;

  const cleanTitle = title || 'StudyBestie Notes';
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Divide notes into balanced multi-page A4 sheets
  const paginatedPages = paginateStudyMaterial(markdown, notes);
  const totalPagesCount = paginatedPages.length;

  const getValidPageElements = (): HTMLElement[] => {
    return pageRefs.current.filter((el): el is HTMLDivElement => el !== null);
  };

  const handleDownloadPdf = async () => {
    const elements = getValidPageElements();
    if (elements.length === 0) return;

    setIsExporting(true);
    setExportError(null);
    setExportStatus(`Compiling complete ${elements.length}-page A4 PDF...`);
    try {
      const filename = `StudyBestie_${styleMode === 'handwritten' ? 'Handwritten_' : ''}${cleanTitle.replace(/\s+/g, '_')}.pdf`;
      const res = await downloadPagesAsPdf(elements, filename);
      setExportStatus(`Downloaded complete ${res.totalPages}-page PDF! ✓`);
      setTimeout(() => setExportStatus(null), 4000);
    } catch (err: any) {
      console.error('Failed to export multi-page PDF:', err);
      setExportError(err?.message || 'Failed to generate PDF. You can also use the "Print" button to save as PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadAllPagesZip = async () => {
    const elements = getValidPageElements();
    if (elements.length === 0) return;

    setIsExporting(true);
    setExportError(null);
    setExportStatus(`Rendering all ${elements.length} pages and packaging into ZIP...`);
    try {
      const baseFilename = `StudyBestie_${styleMode === 'handwritten' ? 'Handwritten_' : ''}${cleanTitle.replace(/\s+/g, '_')}`;
      const res = await downloadPagesAsJpgZip(elements, baseFilename);
      setExportStatus(`Downloaded all ${res.totalPages} pages in ZIP package! ✓`);
      setTimeout(() => setExportStatus(null), 4000);
    } catch (err: any) {
      console.error('Failed to export JPG ZIP:', err);
      setExportError(err?.message || 'Failed to export pages as ZIP.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadEachPageDirect = async () => {
    const elements = getValidPageElements();
    if (elements.length === 0) return;

    setIsExporting(true);
    setExportError(null);
    setExportStatus(`Downloading ${elements.length} individual page JPGs...`);
    try {
      const baseFilename = `StudyBestie_${styleMode === 'handwritten' ? 'Handwritten_' : ''}${cleanTitle.replace(/\s+/g, '_')}`;
      const res = await downloadPagesIndividually(elements, baseFilename);
      setExportStatus(`Downloaded ${res.totalPages} page JPGs! ✓`);
      setTimeout(() => setExportStatus(null), 4000);
    } catch (err: any) {
      console.error('Failed to export individual JPGs:', err);
      setExportError(err?.message || 'Failed to download pages individually. Try the ZIP download.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadContinuousJpg = async () => {
    if (!pagesContainerRef.current) return;
    setIsExporting(true);
    setExportError(null);
    setExportStatus('Rendering full continuous master JPG sheet...');
    try {
      const filename = `StudyBestie_${styleMode === 'handwritten' ? 'Handwritten_' : ''}${cleanTitle.replace(/\s+/g, '_')}_Full.jpg`;
      await downloadContinuousJpg(pagesContainerRef.current, filename);
      setExportStatus('Full continuous long sheet downloaded as JPG! ✓');
      setTimeout(() => setExportStatus(null), 4000);
    } catch (err: any) {
      console.error('Failed to export continuous JPG:', err);
      setExportError(err?.message || 'Failed to export continuous JPG.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadMarkdown = () => {
    const text = `# ${cleanTitle}\nDate: ${currentDate}\n\n${markdown}${notes ? `\n\n## 📌 Scratchpad Notes\n${notes}` : ''}`;
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `StudyBestie_${cleanTitle.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleNativePrint = () => {
    window.print();
  };

  // Determine ink style
  const getInkClass = () => {
    if (styleMode !== 'handwritten') return 'text-slate-800';
    if (inkColor === 'blue') return 'text-[#1e3a8a]';
    if (inkColor === 'black') return 'text-[#1e293b]';
    return 'text-[#9d174d]';
  };

  const getPaperBgClass = () => {
    if (styleMode !== 'handwritten') return 'bg-white';
    if (paperType === 'lined') return 'notebook-paper';
    if (paperType === 'grid') return 'notebook-paper-grid';
    return 'bg-[#FFFDF5] border border-amber-100';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[94vh] flex flex-col border border-pink-100 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-pink-50/50 to-teal-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#FF4D94] text-white flex items-center justify-center shadow-xs">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>Download Study Materials</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-pink-100 text-pink-700 font-extrabold flex items-center gap-1">
                  <Layers className="w-3 h-3 text-pink-600" />
                  <span>{totalPagesCount} Pages Ready</span>
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Multi-page A4 PDF & high-resolution individual page JPGs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="p-3 sm:px-6 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Style Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
              Style:
            </span>
            <div className="flex bg-white rounded-xl p-1 border border-slate-200 shadow-2xs">
              <button
                type="button"
                onClick={() => setStyleMode('handwritten')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  styleMode === 'handwritten'
                    ? 'bg-[#FF4D94] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>✍️ Handwritten Notes</span>
              </button>
              <button
                type="button"
                onClick={() => setStyleMode('standard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  styleMode === 'standard'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>📄 Clean Masterclass</span>
              </button>
            </div>
          </div>

          {/* Handwritten Sub-options */}
          {styleMode === 'handwritten' && (
            <div className="flex flex-wrap items-center gap-3 text-xs">
              {/* Paper type */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-semibold">Paper:</span>
                <select
                  value={paperType}
                  onChange={(e) => setPaperType(e.target.value as any)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 font-medium outline-none"
                >
                  <option value="lined">Lined Notebook 📓</option>
                  <option value="grid">Graph Grid 📐</option>
                  <option value="cream">Cream Pad 📜</option>
                </select>
              </div>

              {/* Ink color */}
              <div className="flex items-center gap-1">
                <span className="text-slate-500 font-semibold">Ink:</span>
                <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setInkColor('blue')}
                    title="Royal Blue Ballpoint"
                    className={`w-5 h-5 rounded-md bg-[#1e3a8a] ${
                      inkColor === 'blue' ? 'ring-2 ring-offset-1 ring-blue-500' : 'opacity-70'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setInkColor('black')}
                    title="Gel Black Pen"
                    className={`w-5 h-5 rounded-md bg-[#1e293b] ${
                      inkColor === 'black' ? 'ring-2 ring-offset-1 ring-slate-700' : 'opacity-70'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setInkColor('pink')}
                    title="Bestie Pink Pen"
                    className={`w-5 h-5 rounded-md bg-[#FF4D94] ${
                      inkColor === 'pink' ? 'ring-2 ring-offset-1 ring-pink-500' : 'opacity-70'
                    }`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Document Multi-Page Preview Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-200/70 flex flex-col items-center gap-6">
          <div ref={pagesContainerRef} className="w-full flex flex-col items-center gap-6 max-w-2xl">
            {paginatedPages.map((pageMarkdown, index) => {
              const pageNum = index + 1;
              const isFirst = pageNum === 1;
              const isLast = pageNum === totalPagesCount;

              return (
                <div
                  key={`page-${index}`}
                  className="w-full flex flex-col items-center gap-2"
                >
                  {/* Page Indicator Pill */}
                  <div className="flex items-center justify-between w-full px-2 text-xs font-mono font-bold text-slate-500">
                    <span className="flex items-center gap-1.5 bg-white/80 px-2.5 py-1 rounded-full border border-slate-300/80 shadow-2xs">
                      <span>📄 Page {pageNum} of {totalPagesCount}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">A4 Printable Sheet</span>
                  </div>

                  {/* Individual Page DOM Container */}
                  <div
                    ref={(el) => {
                      pageRefs.current[index] = el;
                    }}
                    id={`export-page-${index}`}
                    className={`export-page w-full rounded-2xl p-6 sm:p-10 shadow-md transition-all ${getPaperBgClass()} ${
                      styleMode === 'handwritten' ? 'font-handwritten' : ''
                    }`}
                    style={{ minHeight: '820px' }}
                  >
                    {/* Header on Page 1 */}
                    {isFirst ? (
                      styleMode === 'handwritten' ? (
                        <div className="border-b-2 border-rose-300 pb-4 mb-6">
                          <div className="flex items-center justify-between text-xs sm:text-sm font-bold text-slate-600 mb-2 font-caveat">
                            <div className="flex items-center gap-2">
                              <span className="bg-yellow-200 text-amber-900 px-2 py-0.5 rounded-sm transform -rotate-1 font-bold">
                                STUDYBESTIE NOTEBOOK 📖
                              </span>
                              <span className="text-rose-500 font-bold">★ Topper Edition</span>
                            </div>
                            <div>
                              <span>Date: {currentDate}</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-xs font-caveat text-slate-500">
                            <span>Subject: Masterclass Notes</span>
                            <span>Mentor: Your Bestie ("Mai Samjha Dunga!")</span>
                          </div>

                          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1e3a8a] mt-3 font-handwritten tracking-wide">
                            {cleanTitle}
                          </h1>
                        </div>
                      ) : (
                        <div className="border-b border-slate-200 pb-4 mb-6 flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-gradient-logo font-extrabold text-xl font-sans">
                                StudyBestie
                              </span>
                              <span className="px-2 py-0.5 rounded-md bg-pink-100 text-pink-700 text-[10px] font-bold uppercase">
                                Official Notes
                              </span>
                            </div>
                            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                              {cleanTitle}
                            </h1>
                          </div>
                          <div className="text-right text-xs text-slate-400 font-mono-code">
                            <div>{currentDate}</div>
                            <div className="text-emerald-600 font-semibold">Feynman Verified ✓</div>
                          </div>
                        </div>
                      )
                    ) : (
                      /* Header on Subsequent Pages */
                      <div className="border-b border-slate-200/80 pb-2.5 mb-5 flex items-center justify-between text-xs text-slate-500 font-mono-code">
                        <span className="font-bold text-slate-700 truncate max-w-[280px]">
                          StudyBestie • {cleanTitle}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-600">
                          Page {pageNum} of {totalPagesCount}
                        </span>
                      </div>
                    )}

                    {/* Page 1 Sticky Bestie Reminder Note */}
                    {isFirst && styleMode === 'handwritten' && (
                      <div className="mb-6 p-3.5 bg-yellow-100/95 border-l-4 border-yellow-400 text-amber-950 rounded-r-xl shadow-xs transform -rotate-0.5 font-handwritten text-sm">
                        <div className="flex items-center gap-1 font-bold text-amber-900 mb-1">
                          <span>✨ Bestie Reminder:</span>
                        </div>
                        <p className="leading-snug">
                          "Tension mat le bestie! Revise the analogies, check the diagrams, and you are 100% ready to smash this exam."
                        </p>
                      </div>
                    )}

                    {/* Page Body Markdown */}
                    <div
                      className={`${
                        styleMode === 'handwritten'
                          ? 'handwritten-content leading-loose tracking-wide'
                          : 'markdown-body'
                      } ${getInkClass()}`}
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(pageMarkdown) }}
                    />

                    {/* Page Footer */}
                    <div className="mt-8 pt-4 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-400 font-mono-code">
                      <span>Prepared with StudyBestie • AI Learning Companion</span>
                      <span className="font-bold text-slate-600">
                        Page {pageNum} of {totalPagesCount}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 bg-white border-t border-slate-100 flex flex-col gap-2.5 shrink-0">
          {exportError && (
            <div className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2.5 rounded-xl flex items-center justify-between">
              <span>{exportError}</span>
              <button
                type="button"
                onClick={handleNativePrint}
                className="font-bold underline text-rose-700 ml-2 cursor-pointer hover:text-rose-900"
              >
                Use Print Dialog Instead
              </button>
            </div>
          )}

          {exportStatus && (
            <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 p-2 rounded-xl flex items-center gap-1.5 animate-in fade-in">
              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{exportStatus}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-pink-500" />
              <span>High-resolution {totalPagesCount}-page vector export for mobile, print & iPad</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* 1. Multi-Page PDF Button */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#FF4D94] hover:bg-[#E62E76] text-white text-xs font-bold transition-all shadow-md shadow-pink-200 cursor-pointer disabled:opacity-50"
                title={`Download complete ${totalPagesCount}-page A4 PDF document`}
              >
                <FileText className="w-4 h-4" />
                <span>{isExporting ? 'Generating...' : `Download PDF (${totalPagesCount} Pages)`}</span>
              </button>

              {/* 2. All Pages JPGs (ZIP) */}
              <button
                type="button"
                onClick={handleDownloadAllPagesZip}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                title={`Download all ${totalPagesCount} pages as JPG images packaged in a .ZIP archive`}
              >
                <FolderArchive className="w-3.5 h-3.5 text-emerald-600" />
                <span>All Pages JPG (.ZIP)</span>
              </button>

              {/* 3. Download Each JPG directly */}
              <button
                type="button"
                onClick={handleDownloadEachPageDirect}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                title="Download each page as separate JPG files"
              >
                <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                <span>Each Page JPG</span>
              </button>

              {/* 4. Full Sheet Long JPG */}
              <button
                type="button"
                onClick={handleDownloadContinuousJpg}
                disabled={isExporting}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-50 text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
                title="Download continuous single long scroll JPG"
              >
                <span>Full Sheet</span>
              </button>

              {/* 5. Print */}
              <button
                type="button"
                onClick={handleNativePrint}
                disabled={isExporting}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                title="Open browser print dialog"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Print</span>
              </button>

              {/* 6. Markdown */}
              <button
                type="button"
                onClick={handleDownloadMarkdown}
                className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-slate-500 hover:text-slate-800 text-xs font-semibold hover:bg-slate-50 transition-all cursor-pointer"
                title="Download raw Markdown"
              >
                {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <span>.md</span>}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
