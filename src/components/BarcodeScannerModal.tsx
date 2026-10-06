import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  X,
  Camera,
  RefreshCw,
  Upload,
  AlertCircle,
  ScanBarcode,
  Check,
  Zap,
  ZapOff
} from 'lucide-react';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (scannedText: string) => void;
  title?: string;
  subtitle?: string;
}

// Hàm phát âm thanh Beep báo hiệu đã quét thành công
const playBeep = () => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime); // 1400Hz
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {
    // Ignore audio errors
  }
};

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScan,
  title = 'Quét Barcode Số No Điện Kế',
  subtitle = 'Hướng camera về mã vạch (Barcode / QR) trên mặt đồng hồ điện kế'
}: BarcodeScannerModalProps) {
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [cameras, setCameras] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');
  const [recentScan, setRecentScan] = useState<string>('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerId = 'kthtdd-barcode-viewfinder';

  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      setErrorMsg('');
      setRecentScan('');
      return;
    }

    let isMounted = true;

    const startCamera = async () => {
      try {
        setErrorMsg('');
        const devices = await Html5Qrcode.getCameras();
        if (!isMounted) return;

        if (!devices || devices.length === 0) {
          setErrorMsg('Không tìm thấy camera trên thiết bị này.');
          return;
        }

        setCameras(devices);

        // Ưu tiên camera sau (environment/back)
        const backCamera = devices.find(d => {
          const l = d.label.toLowerCase();
          return l.includes('back') || l.includes('rear') || l.includes('sau') || l.includes('environment');
        }) || devices[devices.length - 1]; // Trên mobile thường camera sau là camera cuối

        const camId = backCamera.id;
        setSelectedCameraId(camId);
        await initScanner(camId);
      } catch (err: any) {
        if (!isMounted) return;
        console.warn('Lỗi mở camera:', err);
        setErrorMsg(
          err.message || 'Không thể truy cập camera. Vui lòng cấp quyền máy ảnh cho trình duyệt.'
        );
      }
    };

    // Đợi DOM render phần tử chứa viewfinder
    const timer = setTimeout(() => {
      startCamera();
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [isOpen]);

  const initScanner = async (cameraId: string) => {
    try {
      await stopScanner();
      const el = document.getElementById(containerId);
      if (!el) return;

      const formatsToSupport = [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.DATA_MATRIX
      ];

      const html5QrCode = new Html5Qrcode(containerId, {
        formatsToSupport,
        verbose: false
      });
      html5QrCodeRef.current = html5QrCode;

      // Cấu hình khung quét ngang chuyên dụng cho mã vạch 1D của điện kế (rộng hơn, thấp hơn)
      const qrboxFunction = (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const boxWidth = Math.floor(minEdge * 0.9);
        const boxHeight = Math.floor(boxWidth * 0.45); // Tỉ lệ khung quét ngang cho Barcode
        return {
          width: Math.max(boxWidth, 240),
          height: Math.max(boxHeight, 110)
        };
      };

      await html5QrCode.start(
        cameraId ? { deviceId: { exact: cameraId } } : { facingMode: 'environment' },
        {
          fps: 20,
          qrbox: qrboxFunction,
          aspectRatio: 1.333333
        },
        (decodedText: string) => {
          handleSuccessScan(decodedText);
        },
        () => {
          // Bỏ qua lỗi nhận diện từng frame
        }
      );

      setIsScanning(true);

      // Kiểm tra hỗ trợ đèn Flash (Torch)
      try {
        const capabilities = html5QrCode.getRunningTrackCapabilities() as any;
        if (capabilities && capabilities.torch) {
          setTorchSupported(true);
        } else {
          setTorchSupported(false);
        }
      } catch {
        setTorchSupported(false);
      }
    } catch (err: any) {
      console.warn('Lỗi khởi động scanner:', err);
      setIsScanning(false);
      setErrorMsg(
        'Không thể khởi động bộ quét: ' + (err.message || 'Lỗi thiết bị')
      );
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping scanner:', e);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  };

  const handleSuccessScan = (text: string) => {
    const clean = text.trim();
    if (!clean) return;

    playBeep();
    if (navigator.vibrate) {
      try {
        navigator.vibrate(80);
      } catch {}
    }

    setRecentScan(clean);

    // Dừng quét và gọi callback
    setTimeout(() => {
      onScan(clean);
      onClose();
    }, 450);
  };

  const toggleTorch = async () => {
    if (!html5QrCodeRef.current || !torchSupported) return;
    try {
      const nextState = !torchOn;
      await html5QrCodeRef.current.applyVideoConstraints({
        advanced: [{ torch: nextState } as any]
      });
      setTorchOn(nextState);
    } catch (err) {
      console.warn('Không thể bật/tắt đèn pin:', err);
    }
  };

  const handleSwitchCamera = async (camId: string) => {
    setSelectedCameraId(camId);
    await initScanner(camId);
  };

  // Quét từ tệp ảnh chụp mã vạch
  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setErrorMsg('Đang nhận diện mã vạch từ hình ảnh...');
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(containerId);
        html5QrCodeRef.current = scanner;
      }
      const decoded = await scanner.scanFile(file, true);
      handleSuccessScan(decoded);
    } catch (err: any) {
      setErrorMsg('Không tìm thấy mã vạch rõ trong hình ảnh này. Vui lòng chụp rõ và thẳng góc hơn.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = manualCode.trim();
    if (!clean) return;
    onScan(clean);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700/80 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-slate-950/80 border-b border-slate-800 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#005a9c] rounded-xl text-white shadow-sm">
              <ScanBarcode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm sm:text-base leading-tight text-white">
                {title}
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {subtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Đóng cửa sổ quét"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Camera Area */}
        <div className="relative flex-1 bg-black min-h-[300px] sm:min-h-[340px] flex items-center justify-center overflow-hidden">
          {/* HTML5 QR Container */}
          <div id={containerId} className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover" />

          {/* Reticle Guide Overlay (Laser scan animation for Barcode 1D) */}
          {isScanning && !recentScan && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              {/* Vùng quét mã vạch */}
              <div className="relative w-[82%] max-w-[320px] h-[130px] rounded-2xl border-2 border-emerald-400/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
                {/* 4 Góc ngắm */}
                <span className="absolute -top-1 -left-1 w-4 h-4 border-t-3 border-l-3 border-emerald-400 rounded-tl" />
                <span className="absolute -top-1 -right-1 w-4 h-4 border-t-3 border-r-3 border-emerald-400 rounded-tr" />
                <span className="absolute -bottom-1 -left-1 w-4 h-4 border-b-3 border-l-3 border-emerald-400 rounded-bl" />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 border-b-3 border-r-3 border-emerald-400 rounded-br" />

                {/* Laser scan line chạy qua lại */}
                <div className="absolute inset-x-2 h-0.5 bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-bounce top-1/2 -translate-y-1/2" />

                <div className="absolute bottom-2 inset-x-0 text-center">
                  <span className="text-[10px] text-emerald-300 font-bold bg-black/60 px-2 py-0.5 rounded-full">
                    Căn mã vạch vào giữa khung
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Flash / Torch Button */}
          {torchSupported && isScanning && (
            <button
              onClick={toggleTorch}
              className={`absolute top-3 right-3 p-2.5 rounded-full z-10 transition-all cursor-pointer shadow-lg ${
                torchOn
                  ? 'bg-amber-400 text-slate-900 shadow-amber-400/50'
                  : 'bg-black/60 text-white hover:bg-black/80'
              }`}
              title={torchOn ? 'Tắt đèn Flash' : 'Bật đèn Flash'}
            >
              {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          {/* Kết quả vừa quét được */}
          {recentScan && (
            <div className="absolute inset-0 bg-emerald-950/85 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95">
              <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white mb-3 shadow-lg shadow-emerald-500/40">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-300">
                Đã nhận diện thành công
              </span>
              <p className="text-xl sm:text-2xl font-black text-white mt-1 select-all font-mono">
                {recentScan}
              </p>
              <span className="text-xs text-emerald-200 mt-2">
                Đang tự động áp dụng vào ô tìm kiếm...
              </span>
            </div>
          )}

          {/* Lỗi Camera */}
          {errorMsg && (
            <div className="absolute inset-4 bg-slate-900/95 border border-rose-500/50 rounded-2xl p-4 flex flex-col items-center justify-center text-center z-10">
              <AlertCircle className="w-10 h-10 text-rose-400 mb-2" />
              <h4 className="text-white text-sm font-bold">Không thể quét bằng Camera</h4>
              <p className="text-xs text-slate-300 mt-1 max-w-xs">{errorMsg}</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Chọn ảnh từ máy</span>
                </button>
                <button
                  onClick={() => selectedCameraId && initScanner(selectedCameraId)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Thử lại</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Controls Footer */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 space-y-3">
          {/* Camera switcher & Image upload */}
          <div className="flex items-center justify-between gap-2">
            {cameras.length > 1 ? (
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <Camera className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={selectedCameraId}
                  onChange={e => handleSwitchCamera(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-2.5 py-1.5 outline-none font-medium truncate"
                >
                  {cameras.map(cam => (
                    <option key={cam.id} value={cam.id}>
                      {cam.label || `Camera ${cam.id}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-[#005a9c]" />
                <span>Camera sau tự động</span>
              </div>
            )}

            {/* Nút tải ảnh hoặc chụp ảnh từ máy */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileScan}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Tải ảnh chụp mã vạch điện kế từ máy"
            >
              <Upload className="w-3.5 h-3.5 text-sky-400" />
              <span>Tải ảnh</span>
            </button>
          </div>

          {/* Nhập thủ công số No nếu mã vạch bị mờ/trầy xước */}
          <form onSubmit={handleManualSubmit} className="flex items-center gap-1.5 pt-1 border-t border-slate-800/80">
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              placeholder="Nhập thủ công Số No nếu mã vạch bị mờ..."
              className="flex-1 bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 text-xs px-3 py-2 rounded-xl outline-none focus:border-[#005a9c] font-medium"
            />
            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="px-3.5 py-2 bg-[#005a9c] hover:bg-[#004a80] disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shrink-0"
            >
              Tìm
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
