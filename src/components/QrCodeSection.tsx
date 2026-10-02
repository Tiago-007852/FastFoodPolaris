import React, { useEffect, useRef, useState } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { Download, Share2, QrCode } from 'lucide-react';
import { useToast } from './ToastProvider';

/** URL encoded by the QR code */
const QR_URL = 'https://www.polarisfastfood.online/';

/**
 * Polaris logo embedded as an inline SVG data URI.
 * Using a data URI (instead of a remote image) avoids CORS issues when
 * exporting the QR to PNG via canvas.toDataURL().
 */
const LOGO_DATA_URI =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
      `<rect width="64" height="64" rx="14" fill="#dc2626"/>` +
      `<path d="M32 10l2.6 5.9 6.4.6-4.8 4.3 1.4 6.3L32 23.8 26.4 27l1.4-6.3-4.8-4.3 6.4-.6z" fill="#facc15"/>` +
      `<text x="32" y="52" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="bold" fill="#ffffff" text-anchor="middle">P</text>` +
    `</svg>`
  );

/**
 * Feature 5 — Animated QR code for the Contacto section.
 * Built with qr-code-styling: rounded brand-coloured dots, extra-rounded
 * corner squares, the Polaris logo centered, a glow pulse and a scan line.
 * Includes a high-resolution PNG download (1280×1280 via canvas.toDataURL)
 * and Web Share API sharing with clipboard fallback.
 */
export const QrCodeSection: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);
  const { showToast } = useToast();
  const [downloading, setDownloading] = useState(false);

  // Create the QR instance once with the brand styling
  useEffect(() => {
    const qr = new QRCodeStyling({
      width: 260,
      height: 260,
      data: QR_URL,
      image: LOGO_DATA_URI,
      // Rounded dots for a modern look, in the site's primary red
      dotsOptions: { color: '#dc2626', type: 'rounded' },
      backgroundOptions: { color: '#ffffff' },
      // Extra-rounded corner squares ("eyes")
      cornersSquareOptions: { color: '#dc2626', type: 'extra-rounded' },
      cornersDotOptions: { color: '#b91c1c' },
      imageOptions: {
        crossOrigin: 'anonymous',
        margin: 10,
        imageSize: 0.42,
      },
    });
    qrRef.current = qr;
    return () => {
      qrRef.current = null;
    };
  }, []);

  // Mount the QR into the DOM container (StrictMode-safe: clear on cleanup)
  useEffect(() => {
    const container = containerRef.current;
    const qr = qrRef.current;
    if (!container || !qr) return;
    container.innerHTML = '';
    qr.append(container);
    return () => {
      container.innerHTML = '';
    };
  }, []);

  /** Exports a high-resolution PNG (≥1024×1024) using canvas.toDataURL(). */
  const handleDownload = async () => {
    const qr = qrRef.current;
    if (!qr || downloading) return;
    setDownloading(true);
    try {
      const rawData = await qr.getRawData('png');
      if (!rawData) throw new Error('no-data');
      const objectUrl = typeof rawData === 'string' ? rawData : URL.createObjectURL(rawData);

      const img = new Image();
      img.onload = () => {
        const size = 1280; // ≥ 1024×1024 required
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setDownloading(false);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/png');

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = 'polaris-fast-food-qr.png';
        link.click();

        if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl);
        showToast('QR Code baixado com sucesso! 📥', 'success');
        setDownloading(false);
      };
      img.onerror = () => {
        showToast('Não foi possível gerar o PNG.', 'error');
        setDownloading(false);
      };
      img.src = objectUrl;
    } catch {
      showToast('Não foi possível gerar o PNG.', 'error');
      setDownloading(false);
    }
  };

  /** Web Share API with the QR image file when supported; clipboard fallback. */
  const handleShare = async () => {
    const shareData = {
      title: 'Polaris Fast-Food',
      text: 'Visite a Polaris Fast-Food! 🍔🛵',
      url: QR_URL,
    };
    try {
      // Try to share the QR image itself when the browser supports files
      if (typeof navigator.canShare === 'function') {
        const blob = await qrRef.current?.getRawData('png');
        if (blob instanceof Blob) {
          const file = new File([blob], 'polaris-fast-food-qr.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ ...shareData, files: [file] });
            return;
          }
        }
      }
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      throw new Error('share-unsupported');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Fallback: copy the URL
      try {
        await navigator.clipboard.writeText(QR_URL);
        showToast('Link copiado para a área de transferência! 🔗', 'success');
      } catch {
        showToast('Não foi possível partilhar.', 'error');
      }
    }
  };

  return (
    <section className="mt-16">
      <div className="bg-zinc-900 rounded-[40px] p-8 sm:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
        {/* Ambient brand glows */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-secondary/10 rounded-full blur-3xl" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Animated QR visual */}
          <div className="flex justify-center">
            <div className="relative bg-white p-6 rounded-3xl animate-qr-glow">
              <div ref={containerRef} className="rounded-2xl overflow-hidden" />
              {/* Scan line sweeping vertically (CSS animation) */}
              <div className="pointer-events-none absolute left-3 right-3 h-1 rounded-full bg-gradient-to-r from-transparent via-secondary to-transparent animate-qr-scan shadow-[0_0_14px_rgba(250,204,21,0.9)]" />
            </div>
          </div>

          {/* Copy + actions */}
          <div className="space-y-6 text-center lg:text-left">
            <div className="flex justify-center lg:justify-start">
              <div className="p-3.5 bg-primary text-white rounded-2xl shadow-lg shadow-primary/30">
                <QrCode size={26} />
              </div>
            </div>
            <h3 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Leve a Polaris Consigo
            </h3>
            <p className="text-white/60 text-lg max-w-md mx-auto lg:mx-0">
              Aponte a câmera para visitar o nosso site
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/10 rounded-full text-sm font-bold text-secondary">
              {QR_URL}
            </div>
            <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4 pt-2">
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="px-8 py-4 bg-primary hover:bg-primary-hover text-white rounded-full font-bold transition-all shadow-xl shadow-primary/30 flex items-center justify-center gap-3 disabled:opacity-60"
              >
                <Download size={20} />
                {downloading ? 'A gerar PNG...' : 'Baixar QR Code'}
              </button>
              <button
                onClick={handleShare}
                className="px-8 py-4 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-full font-bold transition-all flex items-center justify-center gap-3"
              >
                <Share2 size={20} />
                Partilhar
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
