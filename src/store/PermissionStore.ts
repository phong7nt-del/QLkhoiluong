export type AppRole = 'nhân viên' | 'tổ phó' | 'tổ trưởng' | 'đội phó' | 'đội trưởng' | 'phó giám đốc' | 'giám đốc' | 'DVKH';

export interface RBACConfig {
  tabs: Record<string, AppRole[]>; // tabId -> list of allowed roles
  actions: Record<string, AppRole[]>; // actionId -> list of allowed roles
}

export const ALL_ROLES: AppRole[] = ['nhân viên', 'tổ phó', 'tổ trưởng', 'đội phó', 'đội trưởng', 'phó giám đốc', 'giám đốc', 'DVKH'];
export const STANDARD_ROLES: AppRole[] = ['nhân viên', 'tổ phó', 'tổ trưởng', 'đội phó', 'đội trưởng', 'phó giám đốc', 'giám đốc'];

// Default configuration based on the previous hardcoded logic
export const DEFAULT_RBAC: RBACConfig = {
  tabs: {
    'input': STANDARD_ROLES,
    'report': STANDARD_ROLES,
    'stations': STANDARD_ROLES,
    'analysis': STANDARD_ROLES,
    'disconnect': STANDARD_ROLES,
    'search': STANDARD_ROLES,
    'sangtai': STANDARD_ROLES,
    'progress': ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'],
    'tuti': ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'],
    'plan_progress': ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'],
    'warehouse': ['đội trưởng', 'giám đốc'],
    'kthtdd': STANDARD_ROLES,
    'birthday': STANDARD_ROLES,
    'dvkh': ALL_ROLES, // Tab DVKH: tất cả vai trò, bao gồm DVKH (mặc định người DVKH chỉ xem được tab DVKH)
    'system': ['đội trưởng'], // specifically requested
  },
  actions: {
    'config_system': ['đội trưởng'], // access settings gear
    'edit_others_workload': ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'],
    'bao_cao_ho': ['đội trưởng', 'giám đốc'],
    'view_online_users': ['đội trưởng'], // xem danh sách người dùng online (mặc định Đội trưởng)
    'kthtdd_all_areas': ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'], // Kiện toàn tất cả khu vực (nếu nhân viên không có quyền này thì chỉ kiện toàn ở khu vực quản lý)
    'import_htdd_data': ['đội trưởng'], // Import dữ liệu Quá hạn / Cuối năm (HTDD) - mặc định Đội trưởng
    'sync_doxa_data': ['đội trưởng'], // Đồng bộ dữ liệu Đo xa (MDIS / HES) - mặc định Đội trưởng
  }
};

export const normalizeRoleStr = (str: any) => String(str || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/đ/g, 'd')
  .replace(/Đ/g, 'd')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const RBAC_STORAGE_KEY = 'app_rbac_config_v1';

export const isDvkhStr = (str: any): boolean => {
  if (!str) return false;
  const n = normalizeRoleStr(str);
  const clean = n.replace(/[^a-z0-9]/g, '');
  return (
    clean.includes('dvkh') ||
    clean.includes('dichvukh') ||
    clean.includes('dichvukhachhang') ||
    clean.includes('chamsockhachhang') ||
    clean.includes('cskh') ||
    n.includes('dvkh') ||
    n.includes('dv kh') ||
    n.includes('dich vu kh') ||
    n.includes('dich vu khach hang')
  );
};

export const PermissionStore = {
  isDvkhUser: (userObj?: any, roleString?: string): boolean => {
    // 1. Kiểm tra trực tiếp chuỗi vai trò
    if (roleString && isDvkhStr(roleString)) return true;

    // 2. Lấy đối tượng user từ tham số hoặc sessionStorage
    const u = userObj || (typeof window !== 'undefined' && sessionStorage.getItem('workload_user_session')
      ? JSON.parse(sessionStorage.getItem('workload_user_session') || '{}')
      : null);

    if (!u) return false;

    const rawName = u.name || u.fullName || u.hoTen || '';
    const normName = normalizeRoleStr(rawName);

    // 3. Nhân sự chủ chốt DVKH: Phạm Minh Tiến (Tổ trưởng / Phụ trách DVKH)
    if (
      normName.includes('pham minh tien') ||
      normName.includes('minh tien') ||
      normName === 'tienpm' ||
      (u.email && normalizeRoleStr(u.email).includes('tienpm')) ||
      (u.msnv && String(u.msnv).toLowerCase().trim() === 'dvkh')
    ) {
      return true;
    }

    // 4. Kiểm tra các trường thuộc tính trong đối tượng user
    const checkFields = [
      u.team,
      u.boPhanCongTac,
      u.boPhan,
      u['Bộ phận công tác'],
      u['Bộ phận'],
      u['Phòng Đội'],
      u['Phòng Đội viết tắt'],
      u['Phòng ban/Tổ nhóm'],
      u.department,
      u.role,
      u.chucDanh,
      u.chucVu,
      u.chuc_vu
    ];

    for (const f of checkFields) {
      if (f && isDvkhStr(f)) return true;
    }

    // 5. Tra cứu danh sách thành viên trong cache nếu có tên nhân viên
    if (normName) {
      try {
        const rawMembers = typeof window !== 'undefined' ? localStorage.getItem('sheet_members_v1') : null;
        if (rawMembers) {
          const members = JSON.parse(rawMembers);
          if (Array.isArray(members)) {
            const found = members.find((m: any) => normalizeRoleStr(m.name) === normName);
            if (found) {
              const mFields = [
                found.team,
                found.boPhanCongTac,
                found.boPhan,
                found['Bộ phận công tác'],
                found['Bộ phận'],
                found['Phòng Đội'],
                found['Phòng Đội viết tắt'],
                found['Phòng ban/Tổ nhóm'],
                found.role,
                found.chucDanh,
                found.chucVu
              ];
              for (const mf of mFields) {
                if (mf && isDvkhStr(mf)) return true;
              }
            }
          }
        }
      } catch {}
    }

    return false;
  },

  getConfig: (): RBACConfig => {
    try {
      const stored = localStorage.getItem(RBAC_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as RBACConfig;
        // Merge with default to ensure new tabs/actions are included
        const merged: RBACConfig = {
           tabs: { ...DEFAULT_RBAC.tabs, ...(parsed.tabs || {}) },
           actions: { ...DEFAULT_RBAC.actions, ...(parsed.actions || {}) }
        };
        // Ensure new action view_online_users defaults to Đội trưởng if not explicitly configured
        if (!merged.actions['view_online_users'] || !Array.isArray(merged.actions['view_online_users']) || merged.actions['view_online_users'].length === 0) {
           merged.actions['view_online_users'] = DEFAULT_RBAC.actions['view_online_users'] || ['đội trưởng'];
        }
        // Ensure new action kthtdd_all_areas defaults to management roles if not explicitly configured
        if (!merged.actions['kthtdd_all_areas'] || !Array.isArray(merged.actions['kthtdd_all_areas']) || merged.actions['kthtdd_all_areas'].length === 0) {
           merged.actions['kthtdd_all_areas'] = DEFAULT_RBAC.actions['kthtdd_all_areas'] || ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'];
        }
        // Ensure tab dvkh includes DVKH role
        if (!merged.tabs['dvkh'] || !Array.isArray(merged.tabs['dvkh']) || merged.tabs['dvkh'].length === 0) {
           merged.tabs['dvkh'] = DEFAULT_RBAC.tabs['dvkh'] || ALL_ROLES;
        } else if (!merged.tabs['dvkh'].includes('DVKH')) {
           merged.tabs['dvkh'].push('DVKH');
        }
        return merged;
      }
    } catch (e) {}
    return DEFAULT_RBAC;
  },

  saveConfig: (config: RBACConfig) => {
    try {
      localStorage.setItem(RBAC_STORAGE_KEY, JSON.stringify(config));
      window.dispatchEvent(new CustomEvent('permissions_updated'));
    } catch (e) {}
  },

  getUserRoles: (roleString: string, userObj?: any): AppRole[] => {
    let effectiveRoleStr = roleString || '';
    if (!effectiveRoleStr && userObj) {
      effectiveRoleStr = String(userObj.role || userObj.chucDanh || userObj.chucVu || '');
    }
    const norm = normalizeRoleStr(effectiveRoleStr);

    // Lấy thông tin user từ userObj hoặc session hiện tại
    const u = userObj || (typeof window !== 'undefined' && sessionStorage.getItem('workload_user_session') ? JSON.parse(sessionStorage.getItem('workload_user_session') || '{}') : null);

    // Kiểm tra có phải Lãnh đạo Đội QLHTĐĐ (Đội trưởng Nguyễn Thành Phong) hay không
    const uName = u ? normalizeRoleStr(u.name || u.email || '') : (userObj ? normalizeRoleStr(userObj.name || userObj.email || '') : '');
    const isDoiTruongQlhtdd = (
      norm.includes('nguyen thanh phong') || 
      norm.includes('thanh phong') || 
      norm.includes('phong7nt') ||
      uName.includes('nguyen thanh phong') || 
      uName.includes('thanh phong') || 
      uName.includes('phong7nt')
    );

    // Kiểm tra người dùng thuộc Bộ phận DVKH (bao gồm Phạm Minh Tiến, Tổ/Đội DVKH)
    const isDvkh = PermissionStore.isDvkhUser(u || userObj, effectiveRoleStr);

    // QUY TẮC PHÂN QUYỀN ĐẶC BIỆT CHO BỘ PHẬN DVKH:
    // Bất kỳ ai thuộc bộ phận DVKH (kể cả Tổ trưởng/Tổ phó/Nhân viên của DVKH như Phạm Minh Tiến)
    // trong hệ thống tác nghiệp của Đội QLHTĐĐ chỉ được cấp DUY NHẤT vai trò 'DVKH'.
    // Tuyệt đối KHÔNG gán vai trò 'tổ trưởng', 'tổ phó' hay 'nhân viên' của Đội QLHTĐĐ!
    if (isDvkh && !isDoiTruongQlhtdd) {
      return ['DVKH'];
    }

    const roles: AppRole[] = [];
    if (isDvkh) {
      roles.push('DVKH');
    }

    // Phân quyền cho nhân sự Đội QLHTĐĐ
    if (
      isDoiTruongQlhtdd ||
      norm.includes('doi truong') || 
      norm.includes('truong doi')
    ) {
      roles.push('đội trưởng');
    }
    if (norm.includes('doi pho') || norm.includes('pho doi')) {
      roles.push('đội phó');
    }
    if (norm.includes('giam doc')) {
      roles.push('giám đốc');
    }
    if (norm.includes('pho giam doc') || norm.includes('pgd')) {
      roles.push('phó giám đốc');
    }
    if (norm.includes('to truong') || norm.includes('truong to')) {
      roles.push('tổ trưởng');
    }
    if (norm.includes('to pho') || norm.includes('pho to')) {
      roles.push('tổ phó');
    }
    if (norm.includes('nhan vien') || norm.includes('cong nhan')) {
      roles.push('nhân viên');
    }

    if (roles.length === 0) roles.push('nhân viên'); // fallback
    return roles;
  },

  hasTabAccess: (tabId: string, userRoleString: string, userObj?: any): boolean => {
    const userRoles = PermissionStore.getUserRoles(userRoleString, userObj);
    const config = PermissionStore.getConfig();
    const allowedRoles = config.tabs[tabId] || DEFAULT_RBAC.tabs[tabId] || [];

    // Nếu người dùng thuộc DVKH (vai trò 'DVKH')
    if (userRoles.includes('DVKH')) {
      // Tuân thủ chính xác phân quyền trong Cấu hình hệ thống dành cho DVKH:
      // Tab nào được tích chọn cho vai trò DVKH thì mới được hiển thị.
      // Tuyệt đối không kế thừa các tab của tổ trưởng hay nhân viên QLHTĐĐ.
      return allowedRoles.includes('DVKH');
    }

    return userRoles.some(r => allowedRoles.includes(r));
  },

  hasActionAccess: (actionId: string, userRoleString: string, userObj?: any): boolean => {
    const userRoles = PermissionStore.getUserRoles(userRoleString, userObj);

    // Người dùng thuộc DVKH không có quyền các tác vụ quản trị của QLHTĐĐ
    if (userRoles.length === 1 && userRoles[0] === 'DVKH') {
      return false;
    }

    const config = PermissionStore.getConfig();
    let allowedRoles = config.actions[actionId];
    if (!allowedRoles || !Array.isArray(allowedRoles) || allowedRoles.length === 0) {
      allowedRoles = DEFAULT_RBAC.actions[actionId] || [];
    }
    return userRoles.some(r => allowedRoles.includes(r));
  }
};
