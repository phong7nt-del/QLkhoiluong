const fs = require('fs');

let code = fs.readFileSync('src/store/DataStore.ts', 'utf8');

const oldCheck = `deleteWorkloadGroup: async (data: { date: string, members: string[] }) => {
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
      return result;
    } catch (error: any) {
      console.warn('Error deleting workload group:', error);
      return false;
    }
  },`;
  
const newCheck = `deleteWorkloadGroup: async (data: { date: string, members: string[] }) => {
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
      
      const rawText = await response.text();
      try {
          return JSON.parse(rawText);
      } catch (parseError) {
          console.error("Non-JSON response from GS:", rawText);
          return { status: 'error', reason: 'html_response', text: rawText };
      }
    } catch (error: any) {
      console.warn('Error deleting workload group:', error);
      return { status: 'error', reason: 'network_error', text: error.message };
    }
  },`;

if (code.includes(oldCheck)) {
    code = code.replace(oldCheck, newCheck);
    fs.writeFileSync('src/store/DataStore.ts', code, 'utf8');
    console.log("Fixed delete error handling");
} else {
    console.log("Could not find the target codeblock");
}
