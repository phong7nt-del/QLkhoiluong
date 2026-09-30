export type AppRole = 'nhân viên' | 'tổ phó' | 'tổ trưởng' | 'đội phó' | 'đội trưởng' | 'phó giám đốc' | 'giám đốc';

export interface RBACConfig {
  tabs: Record<string, AppRole[]>; // tabId -> list of allowed roles
  actions: Record<string, AppRole[]>; // actionId -> list of allowed roles
}

export const ALL_ROLES: AppRole[] = ['nhân viên', 'tổ phó', 'tổ trưởng', 'đội phó', 'đội trưởng', 'phó giám đốc', 'giám đốc'];

// Default configuration based on the previous hardcoded logic
export const DEFAULT_RBAC: RBACConfig = {
  tabs: {
    'input': ALL_ROLES,
    'report': ALL_ROLES,
    'stations': ALL_ROLES,
    'analysis': ALL_ROLES,
    'disconnect': ALL_ROLES,
    'search': ALL_ROLES,
    'sangtai': ALL_ROLES,
    'progress': ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'],
    'tuti': ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'],
    'plan_progress': ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'],
    'warehouse': ['đội trưởng', 'giám đốc'],
    'birthday': ALL_ROLES,
    'system': ['đội trưởng'], // specifically requested
  },
  actions: {
    'config_system': ['đội trưởng'], // access settings gear
    'edit_others_workload': ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'],
    'bao_cao_ho': ['đội trưởng', 'giám đốc'],
    'view_online_users': ['đội trưởng'], // xem danh sách người dùng online (mặc định Đội trưởng)
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

  getUserRoles: (roleString: string): AppRole[] => {
    if (!roleString) return ['nhân viên'];
    const norm = normalizeRoleStr(roleString);
    const roles: AppRole[] = [];

    // Robust normalized keyword matching (handles both NFC and NFD Unicode from Sheets)
    if (
      norm.includes('doi truong') || 
      norm.includes('truong doi') || 
      norm.includes('nguyen thanh phong') || 
      norm.includes('phong7nt')
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

  hasTabAccess: (tabId: string, userRoleString: string): boolean => {
    const config = PermissionStore.getConfig();
    const allowedRoles = config.tabs[tabId] || DEFAULT_RBAC.tabs[tabId] || [];
    const userRoles = PermissionStore.getUserRoles(userRoleString);
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
