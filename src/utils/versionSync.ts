import { APP_VERSION, APP_VERSION_DETAILS } from '../version';

export interface VersionInfo {
  version: string;
  year?: string;
  month?: string;
  day?: string;
  build?: number;
  updatedAt?: string;
  formattedTime?: string;
}

export interface CheckVersionResult {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  details?: VersionInfo;
}

/**
 * Xóa toàn bộ Cache của trình duyệt (CacheStorage, ServiceWorker) và ép tải lại ứng dụng
 */
export async function forceRefreshApp(): Promise<void> {
  try {
    // 1. Xóa Cache Storage của trình duyệt nếu có
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }

    // 2. Hủy đăng ký ServiceWorker cũ nếu có
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }
  } catch (err) {
    console.warn('[VersionSync] Lỗi khi dọn dẹp cache:', err);
  }

  // 3. Ép tải lại trang web với tham số phá cache
  const url = new URL(window.location.href);
  url.searchParams.set('_v', Date.now().toString());
  window.location.replace(url.toString());
}

/**
 * Kiểm tra phiên bản mới nhất từ server
 */
export async function checkLatestVersion(): Promise<CheckVersionResult> {
  const currentVersion = APP_VERSION;
  let latestVersion = currentVersion;
  let details: VersionInfo | undefined;

  const timestamp = Date.now();
  // Thử kiểm tra qua /api/version trước, nếu không được thì fallback sang /version.json
  const endpoints = [`/api/version?_t=${timestamp}`, `/version.json?_t=${timestamp}`];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.version === 'string') {
          latestVersion = data.version.trim();
          details = data;
          break;
        }
      }
    } catch (e) {
      // Tiếp tục thử endpoint tiếp theo
    }
  }

  const hasUpdate = latestVersion !== currentVersion && Boolean(latestVersion);

  return {
    currentVersion,
    latestVersion,
    hasUpdate,
    details,
  };
}
