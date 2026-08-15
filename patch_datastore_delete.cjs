const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const oldCode = `  syncWorkloadToSheet: async (workloadData: {date: string, members: string[], content: string}) => {`;
const newCode = `  deleteWorkloadGroup: async (data: {date: string, members: string[]}) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'delete_workload_group', data })
      });
      const result = await response.json();
      return result.status === 'success';
    } catch (e) {
      console.error('Error deleting workload group', e);
      return false;
    }
  },

  syncWorkloadToSheet: async (workloadData: {date: string, members: string[], content: string}) => {`;

code = code.replace(oldCode, newCode);
fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
