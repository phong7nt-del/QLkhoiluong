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
    'system': ['đội trưởng'], // specifically requested
  },
  actions: {
    'config_system': ['đội trưởng'], // access settings gear
    'edit_others_workload': ['đội trưởng', 'giám đốc', 'đội phó', 'tổ trưởng', 'tổ phó'],
    // more can be added later
  }
};

const RBAC_STORAGE_KEY = 'app_rbac_config_v1';

export const PermissionStore = {
  getConfig: (): RBACConfig => {
    try {
      const stored = localStorage.getItem(RBAC_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored) as RBACConfig;
      }
    } catch (e) {}
    return DEFAULT_RBAC;
  },

  saveConfig: (config: RBACConfig) => {
    try {
      localStorage.setItem(RBAC_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {}
  },

  getUserRoles: (roleString: string): AppRole[] => {
    if (!roleString) return ['nhân viên'];
    const lower = roleString.toLowerCase();
    const roles: AppRole[] = [];
    ALL_ROLES.forEach(r => {
      if (lower.includes(r)) roles.push(r);
    });
    if (roles.length === 0) roles.push('nhân viên'); // fallback
    return roles;
  },

  hasTabAccess: (tabId: string, userRoleString: string): boolean => {
    const config = PermissionStore.getConfig();
    const allowedRoles = config.tabs[tabId] || [];
    const userRoles = PermissionStore.getUserRoles(userRoleString);
    return userRoles.some(r => allowedRoles.includes(r));
  },

  hasActionAccess: (actionId: string, userRoleString: string): boolean => {
    const config = PermissionStore.getConfig();
    const allowedRoles = config.actions[actionId] || [];
    const userRoles = PermissionStore.getUserRoles(userRoleString);
    return userRoles.some(r => allowedRoles.includes(r));
  }
};
