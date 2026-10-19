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

export const PermissionStore = {
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
      effectiveRoleStr = String(userObj.role || userObj.chucVu || userObj.chucDanh || '');
    }
    const norm = normalizeRoleStr(effectiveRoleStr);
    const roles: AppRole[] = [];

    // Check DVKH department / role from string or user object
    let isDvkh = norm.includes('dvkh') || norm.includes('dich vu khach hang');
    if (!isDvkh) {
      try {
        const u = userObj || (typeof window !== 'undefined' && sessionStorage.getItem('workload_user_session') ? JSON.parse(sessionStorage.getItem('workload_user_session') || '{}') : null);
        if (u) {
          const bp = normalizeRoleStr(u.boPhanCongTac || u.boPhan || u['Bộ phận công tác'] || u['Bộ phận'] || u.department);
          const tm = normalizeRoleStr(u.team);
          if (bp.includes('dvkh') || bp.includes('dich vu khach hang') || tm.includes('dvkh') || tm.includes('dich vu khach hang')) {
            isDvkh = true;
          }
        }
      } catch {}
    }

    if (isDvkh) {
      roles.push('DVKH');
    }

    // Robust normalized keyword matching (handles both NFC and NFD Unicode from Sheets)
    const uName = userObj ? normalizeRoleStr(userObj.name || userObj.email || '') : '';
    let isLeader = false;
    if (
      norm.includes('doi truong') || 
      norm.includes('truong doi') || 
      norm.includes('nguyen thanh phong') || 
      norm.includes('thanh phong') ||
      norm.includes('phong7nt') ||
      uName.includes('nguyen thanh phong') ||
      uName.includes('thanh phong') ||
      uName.includes('phong7nt')
    ) {
      roles.push('đội trưởng');
      isLeader = true;
    }
    if (norm.includes('doi pho') || norm.includes('pho doi')) {
      roles.push('đội phó');
      isLeader = true;
    }
    if (norm.includes('giam doc')) {
      roles.push('giám đốc');
      isLeader = true;
    }
    if (norm.includes('pho giam doc') || norm.includes('pgd')) {
      roles.push('phó giám đốc');
      isLeader = true;
    }
    if (norm.includes('to truong') || norm.includes('truong to')) {
      roles.push('tổ trưởng');
      isLeader = true;
    }
    if (norm.includes('to pho') || norm.includes('pho to')) {
      roles.push('tổ phó');
      isLeader = true;
    }
    // Chức danh thuộc DVKH: chỉ có thể sử dụng tab DVKH, các tab khác mặc định là không thấy
    // Do đó, nếu là nhân sự thuộc DVKH (và không phải lãnh đạo Đội QLHTĐĐ), KHÔNG gán role 'nhân viên'
    if (!isDvkh && (norm.includes('nhan vien') || norm.includes('cong nhan'))) {
      roles.push('nhân viên');
    }

    if (roles.length === 0) roles.push(isDvkh ? 'DVKH' : 'nhân viên'); // fallback
    return roles;
  },

  hasTabAccess: (tabId: string, userRoleString: string, userObj?: any): boolean => {
    const config = PermissionStore.getConfig();
    const allowedRoles = config.tabs[tabId] || DEFAULT_RBAC.tabs[tabId] || [];
    const userRoles = PermissionStore.getUserRoles(userRoleString, userObj);
    return userRoles.some(r => allowedRoles.includes(r));
  },

  hasActionAccess: (actionId: string, userRoleString: string): boolean => {
    const config = PermissionStore.getConfig();
    let allowedRoles = config.actions[actionId];
    if (!allowedRoles || !Array.isArray(allowedRoles) || allowedRoles.length === 0) {
      allowedRoles = DEFAULT_RBAC.actions[actionId] || [];
    }
    const userRoles = PermissionStore.getUserRoles(userRoleString);
    return userRoles.some(r => allowedRoles.includes(r));
  }
};
