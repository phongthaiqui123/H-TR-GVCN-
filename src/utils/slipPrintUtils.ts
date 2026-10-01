import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Escapes HTML characters for safe template rendering
 */
export function escapeHtml(str: string | number | undefined | null): string {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Converts modern CSS colors (oklch, color(), lab, lch) to standard rgb/hex using canvas 2D
 */
function convertOklchColor(colorStr: string, ctx?: CanvasRenderingContext2D | null): string {
  if (
    !colorStr ||
    (!colorStr.includes('oklch') &&
      !colorStr.includes('color(') &&
      !colorStr.includes('lab') &&
      !colorStr.includes('lch'))
  ) {
    return colorStr;
  }
  try {
    if (!ctx) {
      const c = document.createElement('canvas');
      ctx = c.getContext('2d');
    }
    if (ctx) {
      ctx.fillStyle = '#000000';
      ctx.fillStyle = colorStr;
      return ctx.fillStyle;
    }
  } catch {}
  return '#1e293b';
}

/**
 * Native browser SVG foreignObject rasterizer.
 * Completely immune to oklch / CSS parsing bugs as it uses native browser rendering.
 */
async function renderHtmlViaSvg(htmlContent: string, width = 794): Promise<HTMLCanvasElement> {
  // 1. Measure content height in offscreen div
  const measureDiv = document.createElement('div');
  measureDiv.style.position = 'fixed';
  measureDiv.style.left = '-9999px';
  measureDiv.style.top = '0';
  measureDiv.style.width = `${width}px`;
  measureDiv.style.visibility = 'hidden';
  measureDiv.innerHTML = htmlContent;
  document.body.appendChild(measureDiv);
  const measuredHeight = Math.max(measureDiv.offsetHeight + 60, 1123);
  document.body.removeChild(measureDiv);

  const cleanXhtml = htmlContent
    .replace(/&(?!(amp;|lt;|gt;|quot;|#039;|#\d+;))/g, '&amp;')
    .replace(/<br>/gi, '<br/>')
    .replace(/<hr>/gi, '<hr/>')
    .replace(/<img([^>]+)(?<!\/)>/gi, '<img$1/>');

  const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${measuredHeight}">
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="background:#ffffff; color:#0f172a; font-family:'Times New Roman', Times, serif; font-size:13px; line-height:1.45; padding:24px; box-sizing:border-box;">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .slip-card { border: 1.5px solid #1e293b; border-radius: 8px; padding: 20px 24px; background: #ffffff; margin-bottom: 24px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th, td { border: 1px solid #475569; padding: 6px 10px; font-size: 12.5px; }
        th { background-color: #f1f5f9; font-weight: bold; }
      </style>
      ${cleanXhtml}
    </div>
  </foreignObject>
</svg>`;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width * 2;
        canvas.height = measuredHeight * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Cannot get canvas 2d context');

        ctx.scale(2, 2);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, measuredHeight);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = e => {
      URL.revokeObjectURL(url);
      reject(e);
    };

    img.src = url;
  });
}

/**
 * Renders HTML via an isolated iframe to prevent html2canvas from reading parent Tailwind oklch styles.
 */
async function renderHtmlViaIsolatedIframe(htmlContent: string): Promise<HTMLCanvasElement> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-9999px';
  iframe.style.top = '0';
  iframe.style.width = '794px';
  iframe.style.height = '1123px';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!iframeDoc) throw new Error('Could not access iframe document');

    iframeDoc.open();
    iframeDoc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #ffffff; color: #0f172a; font-family: 'Times New Roman', Times, serif; font-size: 13px; line-height: 1.45; padding: 24px; width: 794px; }
    .slip-card { border: 1.5px solid #1e293b; border-radius: 8px; padding: 20px 24px; background: #ffffff; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
    th, td { border: 1px solid #475569; padding: 6px 10px; font-size: 12.5px; }
    th { background-color: #f1f5f9; font-weight: bold; }
  </style>
</head>
<body>
  ${htmlContent}
</body>
</html>`);
    iframeDoc.close();

    // Small delay to ensure layout is computed inside iframe
    await new Promise(res => setTimeout(res, 120));

    const canvas = await html2canvas(iframeDoc.body, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 794,
    });

    return canvas;
  } finally {
    if (iframe.parentNode) {
      iframe.parentNode.removeChild(iframe);
    }
  }
}

/**
 * Converts pure HTML content into a high-resolution PDF file.
 * Guaranteed immune to oklch errors by isolating styles from the main Tailwind document.
 */
export async function exportHtmlToPdf(
  htmlContent: string,
  filename: string,
  onProgress?: (status: string) => void
): Promise<boolean> {
  try {
    if (onProgress) onProgress('Đang chuẩn bị trang in...');

    let canvas: HTMLCanvasElement | null = null;

    // Strategy 1: Isolated iframe (no parent Tailwind oklch styles present)
    try {
      if (onProgress) onProgress('Đang xử lý hình ảnh độ nét cao...');
      canvas = await renderHtmlViaIsolatedIframe(htmlContent);
    } catch (err) {
      console.warn('Isolated iframe render notice, trying native SVG rasterizer:', err);
    }

    // Strategy 2: Native SVG foreignObject rasterizer fallback
    if (!canvas) {
      try {
        if (onProgress) onProgress('Đang xử lý bản vẽ qua SVG...');
        canvas = await renderHtmlViaSvg(htmlContent);
      } catch (svgErr) {
        console.warn('SVG rasterizer fallback notice:', svgErr);
      }
    }

    // If both canvas strategies failed, trigger automatic standalone HTML download
    if (!canvas) {
      if (onProgress) onProgress('Đang chuyển sang tải file in HTML...');
      downloadStandaloneHtmlSlip('Phiếu báo vi phạm', htmlContent, filename);
      return true;
    }

    if (onProgress) onProgress('Đang đóng gói file PDF chuẩn A4...');

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const printableWidth = pageWidth - margin * 2;
    const totalImgHeight = (canvas.height * printableWidth) / canvas.width;
    const printableHeight = pageHeight - margin * 2;

    if (totalImgHeight <= printableHeight) {
      pdf.addImage(imgData, 'JPEG', margin, margin, printableWidth, totalImgHeight);
    } else {
      let heightLeft = totalImgHeight;
      let position = margin;

      pdf.addImage(imgData, 'JPEG', margin, position, printableWidth, totalImgHeight);
      heightLeft -= printableHeight;

      while (heightLeft > 0) {
        position = heightLeft - totalImgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, printableWidth, totalImgHeight);
        heightLeft -= printableHeight;
      }
    }

    const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(finalName);
    return true;
  } catch (err) {
    console.error('exportHtmlToPdf fatal error:', err);
    // Ultimate graceful fallback: download HTML print file
    downloadStandaloneHtmlSlip('Phiếu báo vi phạm', htmlContent, filename);
    return true;
  }
}

/**
 * Converts a DOM element into a high-resolution PDF file and downloads it,
 * with automatic oklch color sanitization to prevent html2canvas crashes.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
  onProgress?: (status: string) => void
): Promise<boolean> {
  try {
    // If element has innerHTML, delegate directly to the oklch-immune exportHtmlToPdf
    if (element.innerHTML) {
      return await exportHtmlToPdf(element.innerHTML, filename, onProgress);
    }

    if (onProgress) onProgress('Đang chuẩn bị trang in PDF...');

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: 1024,
      onclone: (clonedDoc, clonedElement) => {
        try {
          const helperCanvas = clonedDoc.createElement('canvas');
          const ctx = helperCanvas.getContext('2d');
          const allElements = [clonedElement, ...Array.from(clonedElement.querySelectorAll('*'))] as HTMLElement[];

          for (const el of allElements) {
            try {
              const computed = window.getComputedStyle(el);
              const colorProps = ['color', 'backgroundColor', 'borderColor', 'outlineColor'] as const;

              for (const prop of colorProps) {
                const val = computed[prop];
                if (
                  val &&
                  (val.includes('oklch') || val.includes('color(') || val.includes('lab') || val.includes('lch'))
                ) {
                  el.style.setProperty(prop, convertOklchColor(val, ctx), 'important');
                }
              }

              if (computed.boxShadow && computed.boxShadow.includes('oklch')) {
                el.style.boxShadow = 'none';
              }
            } catch {}
          }
        } catch (e) {
          console.warn('onclone color sanitizer notice:', e);
        }
      },
    });

    if (onProgress) onProgress('Đang tạo tệp PDF A4...');
    const imgData = canvas.toDataURL('image/jpeg', 0.95);

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
      compress: true,
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 12;
    const printableWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * printableWidth) / canvas.width;

    if (imgHeight <= pageHeight - margin * 2) {
      pdf.addImage(imgData, 'JPEG', margin, margin, printableWidth, imgHeight);
    } else {
      let heightLeft = imgHeight;
      let position = margin;
      const printableHeight = pageHeight - margin * 2;

      pdf.addImage(imgData, 'JPEG', margin, position, printableWidth, imgHeight);
      heightLeft -= printableHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', margin, position, printableWidth, imgHeight);
        heightLeft -= printableHeight;
      }
    }

    const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(finalName);
    return true;
  } catch (err) {
    console.error('exportElementToPdf error:', err);
    return false;
  }
}

/**
 * Downloads a standalone printable HTML file that automatically triggers print when opened
 */
export function downloadStandaloneHtmlSlip(title: string, bodyContent: string, filename: string) {
  const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(title)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: 'Times New Roman', Times, serif;
      margin: 0;
      padding: 20px;
      color: #0f172a;
      background: #f8fafc;
      font-size: 13px;
      line-height: 1.45;
    }
    .slip-container {
      max-width: 800px;
      margin: 0 auto;
    }
    .slip-card {
      border: 1.5px solid #1e293b;
      border-radius: 8px;
      padding: 20px 24px;
      background: #ffffff;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: always;
      break-after: page;
      margin-bottom: 24px;
      box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
    }
    .slip-card:last-child {
      page-break-after: auto;
      break-after: auto;
      margin-bottom: 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
    }
    th, td {
      border: 1px solid #475569;
      padding: 6px 10px;
      font-size: 12.5px;
    }
    th {
      background-color: #f1f5f9;
      font-weight: bold;
    }
    .print-bar {
      max-width: 800px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 18px;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }
    .btn-print {
      background: #4f46e5;
      color: #ffffff;
      font-weight: bold;
      padding: 8px 18px;
      border-radius: 8px;
      border: none;
      cursor: pointer;
      font-size: 13px;
    }
    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      .print-bar {
        display: none !important;
      }
      .slip-card {
        box-shadow: none;
        border: 1.5px solid #000000;
        margin-bottom: 0;
      }
    }
  </style>
</head>
<body>
  <div class="print-bar">
    <div style="font-weight: bold; color: #1e293b; font-size: 14px;">
      📄 Bản in phiếu thông báo vi phạm nề nếp thi đua
    </div>
    <button class="btn-print" onclick="window.print()">🖨️ Bấm vào đây để In ngay</button>
  </div>
  <div class="slip-container">
    ${bodyContent}
  </div>
  <script>
    // Auto trigger print dialog after document is loaded
    window.addEventListener('load', function() {
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 500);
    });
  </script>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Attempts to trigger browser print.
 * Returns { success: true } if print ran without error,
 * or { success: false, blockedBySandbox: true, error } if blocked by sandbox.
 */
export function executeBrowserPrint(): { success: boolean; blockedBySandbox: boolean; error?: any } {
  try {
    window.print();
    return { success: true, blockedBySandbox: false };
  } catch (err: any) {
    const isSandboxBlock =
      err?.name === 'SecurityError' ||
      err?.message?.includes('sandbox') ||
      err?.message?.includes('allow-modals');
    return { success: false, blockedBySandbox: isSandboxBlock, error: err };
  }
}
