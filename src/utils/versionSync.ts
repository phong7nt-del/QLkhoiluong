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
 * So sánh 2 chuỗi phiên bản dạng YYYY.MM.DD.Build hoặc SemVer
 * Trả về:
 *   1: v1 > v2 (v1 mới hơn v2)
 *  -1: v1 < v2 (v1 cũ hơn v2)
 *   0: v1 == v2 (bằng nhau)
 */
export function compareVersions(v1: string, v2: string): number {
  if (!v1 || !v2) return 0;
  const clean1 = v1.trim().replace(/^v/i, '');
  const clean2 = v2.trim().replace(/^v/i, '');
  if (clean1 === clean2) return 0;

  const parts1 = clean1.split('.').map(p => parseInt(p, 10) || 0);
  const parts2 = clean2.split('.').map(p => parseInt(p, 10) || 0);

  const maxLen = Math.max(parts1.length, parts2.length);
  for (let i = 0; i < maxLen; i++) {
    const num1 = parts1[i] !== undefined ? parts1[i] : 0;
    const num2 = parts2[i] !== undefined ? parts2[i] : 0;
    if (num1 > num2) return 1;
    if (num1 < num2) return -1;
  }
  return 0;
}

/**
 * Kiểm tra xem latestVersion có thực sự MỚI HƠN currentVersion không
 */
export function isNewerVersion(latestVersion: string, currentVersion: string): boolean {
  return compareVersions(latestVersion, currentVersion) > 0;
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

  // CHỈ BÁO CÓ BẢN MỚI KHI VÀ CHỈ KHI latestVersion THỰC SỰ LỚN HƠN currentVersion
  // Tuyệt đối không bao giờ báo cập nhật nếu bản trên server cũ hơn (như 2026.10.05.3 < 2026.10.07.1)
  const hasUpdate = isNewerVersion(latestVersion, currentVersion);

  return {
    currentVersion,
    latestVersion,
    hasUpdate,
    details,
  };
}
