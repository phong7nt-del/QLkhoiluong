import React, { useState, useEffect } from 'react';
import { DataStore } from '../store/DataStore';
import { Copy, Check, DownloadCloud, AlertTriangle } from 'lucide-react';

const SCRIPT_TEMPLATE = `const SPREADSHEET_ID = '1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ';
const SHEET_NAME = 'CongTac';

function doGet(e) {
  if (e.parameter.action === 'getData') {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({error: "Not found sheet"})).setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getDataRange().getValues();
    
    var nameIdx = -1;
    var teamIdx = -1;
    var startRow = 1;

    for (var r = 0; r < 3 && r < data.length; r++) {
      for (var c = 0; c < data[r].length; c++) {
        var val = String(data[r][c]).toLowerCase().trim();
        if (val.includes('họ và tên') || val === 'họ tên') nameIdx = c;
        if (val.includes('khu vực') || val === 'khu vuc' || val.includes('tổ công tác')) teamIdx = c;
      }
      if (nameIdx !== -1 && teamIdx !== -1) {
        startRow = r + 1;
        break;
      }
    }
    
    if (nameIdx === -1) { nameIdx = 1; startRow = 2; }
    if (teamIdx === -1) { teamIdx = 2; } // Default if "khu vực" not found
    
    var teams = [];
    var members = [];
    var currentTeam = "";
    
    for (var i = startRow; i < data.length; i++) {
      var name = String(data[i][nameIdx] || '').trim();
      var teamVal = String(data[i][teamIdx] || '').trim();
      
      if (!name || name.toLowerCase().includes('họ và tên')) continue;
      
      if (teamVal && teamVal.toLowerCase() !== 'khu vực') {
        currentTeam = teamVal;
        if (teams.indexOf(currentTeam) === -1) {
          teams.push(currentTeam);
        }
      }
      
      if (currentTeam) {
        members.push({ team: currentTeam, name: name });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      teams: teams,
      members: members
    })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput("Valid Endpoint");
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    if (payload.action === 'add_workload') {
      var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
      var data = payload.data;
      var sheetData = sheet.getDataRange().getValues();
      
      var nameIdx = -1;
      var headerRowIndex = 0;
      for (var r = 0; r < 3 && r < sheetData.length; r++) {
        for (var c = 0; c < sheetData[r].length; c++) {
          var val = String(sheetData[r][c]).toLowerCase().trim();
          if (val.includes('họ và tên') || val === 'họ tên') {
             nameIdx = c;
             headerRowIndex = r;
             break;
          }
        }
        if (nameIdx !== -1) break;
      }
      if (nameIdx === -1) { nameIdx = 1; headerRowIndex = 1; }
      
      var headers = sheetData[headerRowIndex] || [];
      var dateParts = data.date.split('-');
      var targetDateStr = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0];
      
      var dateColIndex = -1;
      for (var i = 0; i < headers.length; i++) {
         var h = headers[i];
         if (h instanceof Date) {
            var d = ('0' + h.getDate()).slice(-2);
            var m = ('0' + (h.getMonth() + 1)).slice(-2);
            var y = h.getFullYear();
            if (d + '/' + m + '/' + y === targetDateStr) { dateColIndex = i; break; }
         } else if (String(h).trim() === targetDateStr) {
            dateColIndex = i; break;
         }
      }
      
      if (dateColIndex === -1) {
         dateColIndex = headers.length; 
         sheet.getRange(headerRowIndex + 1, dateColIndex + 1).setValue(targetDateStr);
      }
      
      for (var m = 0; m < data.members.length; m++) {
        var memberName = data.members[m];
        var rowIndex = -1;
        for(var r = headerRowIndex + 1; r < sheetData.length; r++) {
           if(String(sheetData[r][nameIdx]).trim() === memberName.trim()) {
              rowIndex = r; break;
           }
        }
        
        if (rowIndex !== -1) {
           var cell = sheet.getRange(rowIndex + 1, dateColIndex + 1);
           var currentVal = String(cell.getValue() || '');
           var newVal = currentVal ? currentVal + "\\n- " + data.content : "- " + data.content;
           cell.setValue(newVal);
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

export default function Settings() {
  const [url, setUrl] = useState(DataStore.getAppScriptUrl());
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(SCRIPT_TEMPLATE);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSaveAndSync = async () => {
    DataStore.setAppScriptUrl(url);
    setSyncing(true);
    setSyncResult(null);
    const success = await DataStore.syncMasterData();
    setSyncing(false);
    if (success) {
       setSyncResult('success');
    } else {
       setSyncResult('error');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="bg-white border border-[#141414] shadow-[4px_4px_0_#141414] sm:shadow-[8px_8px_0_#141414] p-6 lg:p-8">
        <h2 className="font-serif italic text-2xl mb-6 flex items-center gap-3">
          Cấu Hình Google App Script (Bắt Buộc)
        </h2>
        
        <div className="space-y-6 text-sm font-sans">
          <div className="bg-[#FFF4E5] border border-orange-400 p-4 rounded-none flex gap-3 text-orange-900">
             <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
             <div>
               <p className="font-bold mb-1">Ứng dụng cần 1 API để cập nhật dữ liệu vào Google Sheet!</p>
               <p>Hãy dán đoạn mã bên dưới vào Google Apps Script của bạn và triển khai dưới dạng Web App, sau đó chép liên kết dán vào ô thiết lập.</p>
             </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-mono opacity-50 uppercase font-bold">1. URL App Script</label>
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/..."
              className="w-full bg-[#E4E3E0] bg-opacity-30 border border-[#141414] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414] font-mono"
            />
          </div>

          <div className="flex gap-4">
             <button 
                onClick={handleSaveAndSync}
                disabled={syncing}
                className="bg-[#141414] text-[#E4E3E0] px-6 py-3 uppercase font-bold tracking-widest hover:invert transition-all flex items-center gap-2 text-sm disabled:opacity-50"
             >
                <DownloadCloud className="w-4 h-4" />
                {syncing ? 'Đang Tải Dữ Liệu...' : 'Lưu URL & Tải Danh Sách Tổ/NV'}
             </button>
             {syncResult === 'success' && <div className="text-green-700 font-bold flex items-center">✓ Đã tải dữ liệu Tổ & NV thành công!</div>}
             {syncResult === 'error' && <div className="text-red-700 font-bold flex items-center">✗ Lỗi tải dữ liệu. Hãy kiểm tra URL hoặc App Script.</div>}
          </div>
          
          <div className="border border-[#141414] mt-8 bg-[#141414] text-[#E4E3E0]">
            <div className="flex justify-between items-center p-3 border-b border-[#E4E3E0]/20">
               <span className="text-[10px] font-mono uppercase opacity-50">2. Mã Code Apps Script (Code.gs)</span>
               <button onClick={handleCopy} className="text-xs font-mono flex items-center gap-1 hover:text-white transition-colors">
                  {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Đã chép' : 'Sao chép mã'}
               </button>
            </div>
            <pre className="p-4 text-[11px] font-mono overflow-auto max-h-[400px]">
               <code>{SCRIPT_TEMPLATE}</code>
            </pre>
          </div>
          
          <div className="text-xs space-y-2 mt-4 opacity-80 pt-4 border-t border-[#141414]/10">
            <p className="font-bold">Các bước thực hiện trên Google Sheet:</p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
               <li>Vào <b>Tiện ích mở rộng (Extensions)</b> {`>`} <b>Apps Script</b>.</li>
               <li>Xóa code cũ, dán đoạn code phía trên vào.</li>
               <li>Nhấn <b>Lưu (Ctrl+S)</b>.</li>
               <li>Chọn <b>Triển khai (Deploy)</b> {`>`} <b>Tùy chọn triển khai mới (New deployment)</b>.</li>
               <li>Chọn loại: <b>Ứng dụng web (Web app)</b>.</li>
               <li>Quyền truy cập: <b>Bất kỳ ai (Anyone)</b>. Nhấn Deploy và Cấp quyền truy cập nếu được hỏi.</li>
               <li>Copy Web App URL và dán vào ô số 1 ở trên.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
