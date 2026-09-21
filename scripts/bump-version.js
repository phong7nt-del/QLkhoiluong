import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Lấy ngày hiện tại theo múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7)
function getCurrentDate() {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const [year, month, day] = formatter.format(now).split('-');
    return { year, month, day, now };
  } catch (e) {
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return { year, month, day, now };
  }
}

function bumpVersion() {
  const args = process.argv.slice(2);
  const isNoBump = args.includes('--no-bump') || args.includes('--sync');

  const { year, month, day, now } = getCurrentDate();
  const versionJsonPath = path.join(rootDir, 'version.json');
  const versionTsPath = path.join(rootDir, 'src', 'version.ts');
  const pkgJsonPath = path.join(rootDir, 'package.json');

  let currentData = { year: '', month: '', day: '', build: 0 };
  if (fs.existsSync(versionJsonPath)) {
    try {
      currentData = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
    } catch (e) {
      console.warn('Could not parse version.json, resetting.');
    }
  }

  let build = 1;
  const isSameDay =
    currentData.year === year &&
    currentData.month === month &&
    currentData.day === day;

  if (isSameDay) {
    if (isNoBump) {
      build = parseInt(currentData.build, 10) || 1;
    } else {
      build = (parseInt(currentData.build, 10) || 0) + 1;
    }
  } else {
    // Sang ngày mới -> số thứ tự bắt đầu từ 1
    build = 1;
  }

  const versionString = `${year}.${month}.${day}.${build}`;

  const formattedTime = now.toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour12: false,
  });

  const versionData = {
    year,
    month,
    day,
    build,
    version: versionString,
    updatedAt: now.toISOString(),
    formattedTime,
  };

  // 1. Ghi version.json
  fs.writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2) + '\n', 'utf8');

  // 2. Ghi src/version.ts
  const tsContent = `// TẬP TIN NÀY ĐƯỢC TẠO TỰ ĐỘNG BỞI scripts/bump-version.js - KHÔNG SỬA THỦ CÔNG
// Cấu trúc phiên bản: Năm.Tháng.Ngày.Số (YYYY.MM.DD.Build)

export const APP_VERSION = '${versionString}';

export const APP_VERSION_DETAILS = {
  year: '${year}',
  month: '${month}',
  day: '${day}',
  build: ${build},
  version: '${versionString}',
  updatedAt: '${now.toISOString()}',
  formattedTime: '${formattedTime}',
};

export default APP_VERSION;
`;
  fs.writeFileSync(versionTsPath, tsContent, 'utf8');

  // 3. Cập nhật trường "version" trong package.json
  if (fs.existsSync(pkgJsonPath)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
      pkg.version = versionString;
      fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    } catch (e) {
      console.warn('Could not update package.json version:', e.message);
    }
  }

  console.log(`[Version System] Phiên bản ứng dụng: ${versionString}`);
  return versionString;
}

bumpVersion();
