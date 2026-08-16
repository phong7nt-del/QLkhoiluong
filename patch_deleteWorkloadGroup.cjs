const fs = require('fs');
let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const newMethod = `  deleteWorkloadGroup: async (data: { date: string, members: string[] }) => {
    try {
      const url = DataStore.getAppScriptUrl();
      if (!url) throw new Error('No Apps Script URL configured');
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action: 'delete_workload_group', data }),
      });
      const result = await response.json();
      return result.status === 'success';
    } catch (error: any) {
      console.warn('Error deleting workload group:', error);
      return false;
    }
  },`;

code = code.replace(
  `updateEntry: (id: string, updates: Partial<WorkloadEntry>) => {`,
  newMethod + `\n  updateEntry: (id: string, updates: Partial<WorkloadEntry>) => {`
);

fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
