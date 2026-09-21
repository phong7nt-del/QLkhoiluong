import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCw, Sparkles, CheckCircle2, AlertCircle, X, ArrowUpCircle } from 'lucide-react';
import { checkLatestVersion, forceRefreshApp, CheckVersionResult } from '../utils/versionSync';
import { APP_VERSION } from '../version';

export const VersionUpdateBanner: React.FC = () => {
  const [versionState, setVersionState] = useState<CheckVersionResult>({
    currentVersion: APP_VERSION,
    latestVersion: APP_VERSION,
    hasUpdate: false,
  });
  const [isDismissed, setIsDismissed] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const performCheck = useCallback(async () => {
    const res = await checkLatestVersion();
    if (res.hasUpdate) {
      setVersionState(res);
      setIsDismissed(false); // Luôn nhắc lại nếu có bản mới
    }
  }, []);

  useEffect(() => {
    // 1. Kiểm tra ngay khi khởi động
    performCheck();

    // 2. Kiểm tra khi người dùng quay lại tab (focus / visibilitychange)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performCheck();
      }
    };
    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', performCheck);

    // 3. Tự động kiểm tra định kỳ mỗi 2 phút
    const interval = setInterval(performCheck, 2 * 60 * 1000);

    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', performCheck);
      clearInterval(interval);
    };
  }, [performCheck]);

  const handleUpdate = async () => {
    setIsUpdating(true);
    await forceRefreshApp();
  };

  if (!versionState.hasUpdate || isDismissed) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -60, opacity: 0 }}
        className="fixed top-3 left-1/2 -translate-x-1/2 z-[9999] w-[95%] max-w-xl"
      >
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white p-3 sm:p-4 rounded-2xl shadow-2xl border-2 border-white/40 flex items-center justify-between gap-3 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0 animate-bounce">
              <Sparkles className="w-5 h-5 text-yellow-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-sm sm:text-base leading-tight">
                  Đã có phiên bản mới!
                </span>
                <span className="bg-white text-orange-900 font-mono font-black text-xs px-2 py-0.5 rounded-full shadow-sm">
                  v{versionState.latestVersion}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-white/90 truncate mt-0.5">
                Bản hiện tại: v{versionState.currentVersion}. Bấm cập nhật để đồng bộ ngay.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="px-3.5 py-1.5 bg-white text-orange-600 hover:bg-orange-50 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-75"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isUpdating ? 'animate-spin' : ''}`} />
              <span>{isUpdating ? 'Đang tải...' : 'Cập nhật ngay'}</span>
            </button>
            <button
              onClick={() => setIsDismissed(true)}
              className="p-1.5 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
              title="Để sau"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Nút đồng bộ / kiểm tra phiên bản thủ công có thể đặt ở Header, Footer hoặc màn hình Login
 */
export const VersionSyncButton: React.FC<{
  className?: string;
  showText?: boolean;
  variant?: 'header' | 'footer' | 'pill' | 'button';
}> = ({ className = '', showText = true, variant = 'header' }) => {
  const [isChecking, setIsChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'update' | 'error' } | null>(null);

  const handleManualSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsChecking(true);
    setStatusMsg(null);

    try {
      const res = await checkLatestVersion();
      if (res.hasUpdate) {
        setStatusMsg({
          text: `Phát hiện bản mới v${res.latestVersion}! Đang làm mới...`,
          type: 'update',
        });
        setTimeout(async () => {
          await forceRefreshApp();
        }, 1200);
      } else {
        setStatusMsg({
          text: `Đang ở bản mới nhất v${res.currentVersion}`,
          type: 'success',
        });
        setTimeout(() => setStatusMsg(null), 3000);
      }
    } catch (err) {
      setStatusMsg({
        text: 'Không thể kết nối máy chủ',
        type: 'error',
      });
      setTimeout(() => setStatusMsg(null), 3000);
    } finally {
      setIsChecking(false);
    }
  };

  if (variant === 'pill') {
    return (
      <div className="relative inline-flex items-center">
        <button
          onClick={handleManualSync}
          disabled={isChecking}
          title="Bấm để kiểm tra và đồng bộ phiên bản mới nhất"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono font-bold transition-all ${
            isChecking
              ? 'bg-amber-100 text-amber-800'
              : 'bg-white/15 hover:bg-white/25 text-white border border-white/20 active:scale-95'
          } ${className}`}
        >
          <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin text-amber-500' : 'text-white/80'}`} />
          <span>v{APP_VERSION}</span>
          {showText && <span className="text-[10px] opacity-75 font-sans font-normal">(Đồng bộ)</span>}
        </button>

        <AnimatePresence>
          {statusMsg && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 z-50 whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-sans font-semibold shadow-xl border ${
                statusMsg.type === 'update'
                  ? 'bg-orange-500 text-white border-orange-400'
                  : statusMsg.type === 'success'
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-rose-600 text-white border-rose-500'
              }`}
            >
              {statusMsg.text}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        onClick={handleManualSync}
        disabled={isChecking}
        title="Bấm để kiểm tra và đồng bộ phiên bản mới nhất"
        className={`flex items-center gap-1.5 text-xs font-mono transition-all ${className}`}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-amber-400' : 'opacity-70 group-hover:opacity-100'}`} />
        {showText && <span>{isChecking ? 'Đang kiểm tra...' : 'Đồng bộ phiên bản'}</span>}
      </button>

      <AnimatePresence>
        {statusMsg && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            className={`absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap px-2.5 py-1 rounded-md text-[11px] font-sans font-medium shadow-lg ${
              statusMsg.type === 'update'
                ? 'bg-orange-500 text-white'
                : statusMsg.type === 'success'
                ? 'bg-emerald-600 text-white'
                : 'bg-rose-600 text-white'
            }`}
          >
            {statusMsg.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
