import React, { useState } from 'react';
import { DataStore } from '../store/DataStore';
import { Copy, Check, DownloadCloud, AlertTriangle, X } from 'lucide-react';

const SCRIPT_TEMPLATE = `const SPREADSHEET_ID = '1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ';

function getSheetFlexibly(ss, possibleNames) {
  for (var i=0; i<possibleNames.length; i++) {
    var sheet = ss.getSheetByName(possibleNames[i]);
    if (sheet) return sheet;
  }
  var sheets = ss.getSheets();
  for (var s=0; s<sheets.length; s++) {
    var sn = sheets[s].getName().toLowerCase().trim();
    for (var p=0; p<possibleNames.length; p++) {
       if (sn === possibleNames[p].toLowerCase().trim()) return sheets[s];
    }
  }
  return null;
}

function doGet(e) {
  if (e.parameter.action === 'getData') {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = getSheetFlexibly(ss, ['CongTac', 'Cong Tac', 'Công tác', 'Công Tác', 'Con Tác']);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({error: "Not found sheet CongTac"})).setMimeType(ContentService.MimeType.JSON);
    var data = sheet.getDataRange().getValues();
    
    var nameIdx = -1;
    var teamIdx = -1;
    var startRow = 1;

    for (var r = 0; r < 5 && r < data.length; r++) {
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
    if (teamIdx === -1) { teamIdx = 2; }
    
    var teams = [];
    var members = [];
    
    for (var i = startRow; i < data.length; i++) {
      var name = String(data[i][nameIdx] || '').trim();
      var teamVal = String(data[i][teamIdx] || '').trim();
      
      if (!name || name.toLowerCase().includes('họ và tên') || name.toLowerCase() === 'họ tên') continue;
      
      if (teamVal && teamVal.toLowerCase() !== 'khu vực' && teamVal.toLowerCase() !== 'tổ công tác') {
        if (teams.indexOf(teamVal) === -1) {
           teams.push(teamVal);
        }
        members.push({ team: teamVal, name: name });
      }
    }
    
    // Đọc sheet Tram
    var stations = [];
    var sheetTram = getSheetFlexibly(ss, ['Tram', 'Trạm']);
    if (sheetTram) {
      var tramDataRange = sheetTram.getDataRange();
      var tramData = tramDataRange.getValues();
      var tramBackgrounds = tramDataRange.getBackgrounds();
      
      var tramHeaderRow = 0;
      var idIdx = -1;
      var nameTIdx = -1;
      var typeIdx = -1;
      var areaIdx = -1;
      
      // Tìm dòng Tiêu đề dựa vào các Keyword chuyên biệt
      for (var r = 0; r < Math.min(10, tramData.length); r++) {
        for (var c = 0; c < tramData[r].length; c++) {
          var h = String(tramData[r][c]).toLowerCase().trim();
          if (h.includes('id cũ') || h.includes('id cu') || h === 'mã trạm' || h === 'ma tram') idIdx = c;
          if (h.includes('tên tba đặt lại') || h.includes('tên trạm') || h === 'ten tram' || h === 'tên tba') nameTIdx = c;
          if (h.includes('mã loại trạm chi tiết') || h.includes('loại trạm') || h === 'loai tram') typeIdx = c;
          if (h.includes('khu vực') || h === 'khu vuc' || h.includes('tổ')) areaIdx = c;
        }
        if (idIdx !== -1 || nameTIdx !== -1) {
          tramHeaderRow = r;
          break;
        }
      }
      
      // Fallback fallback fallback
      if (idIdx === -1) idIdx = 0;
      if (nameTIdx === -1) nameTIdx = 1;
      if (typeIdx === -1) typeIdx = 2;
      
      var tramHeaders = tramData[tramHeaderRow] || [];
      var currentFeeder = "Khác";
      
      for (var i = tramHeaderRow + 1; i < tramData.length; i++) {
         var row = tramData[i];
         var bgRow = tramBackgrounds[i];
         var idVal = String(row[idIdx] || '').trim();
         var nameVal = String(row[nameTIdx] || '').trim();
         
         // Kiểm tra xem dòng này có phải là Tuyến Dây không
         // Dòng tuyến được tô vàng
         var isFeederRow = false;
         for (var bc = 0; bc < bgRow.length && bc < 5; bc++) {
            if (bgRow[bc] === '#ffff00' || bgRow[bc] === '#fff2cc' || bgRow[bc] === '#ffeb3b') {
               isFeederRow = true;
               break;
            }
         }
         
         // Cấu trúc khác: Tuyến dây k có mã trạm, chỉ có Tên TBA
         if (!idVal && nameVal && nameVal.toLowerCase().indexOf('tuyến') > -1) {
             isFeederRow = true;
         }
         
         if (isFeederRow) {
             // Lấy tên tuyến, nếu cột name có thì lấy name, ko thì lấy text đầu tiên tìm thấy
             if (nameVal) currentFeeder = nameVal;
             else if (idVal) currentFeeder = idVal;
             else if (String(row[0]).trim()) currentFeeder = String(row[0]).trim();
             continue; // Chuyển sang dòng kế tiếp là trạm
         }
         
         if (!idVal && !nameVal) continue;
         
         var details = {};
         for (var c = 0; c < tramHeaders.length; c++) {
            if (tramHeaders[c]) {
               var headerName = String(tramHeaders[c]);
               var cellValue = String(row[c] || '');
               if (headerName.trim() !== '') {
                  details[headerName] = cellValue;
               }
            }
         }
         
         stations.push({
           id: idVal,
           name: nameVal,
           type: String(row[typeIdx] || '').trim(),
           area: areaIdx !== -1 && String(row[areaIdx]).trim() ? String(row[areaIdx]).trim() : currentFeeder,
           details: details
         });
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      teams: teams,
      members: members,
      stations: stations
    })).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput("Valid Endpoint");
}

function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    if (payload.action === 'add_workload') {
      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
      var sheet = getSheetFlexibly(ss, ['CongTac', 'Cong Tac', 'Công tác', 'Công Tác', 'Con Tác']);
      if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error'})).setMimeType(ContentService.MimeType.JSON);
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
      var dateParts = data.date.split('-'); // data.date format: YYYY-MM-DD
      var targetDateStr = dateParts[2] + '/' + dateParts[1] + '/' + dateParts[0]; // DD/MM/YYYY
      var targetDateStrAlt = dateParts[2] + '/' + dateParts[1]; // DD/MM
      
      var dateColIndex = -1;
      for (var i = 0; i < headers.length; i++) {
         var h = headers[i];
         var cellDateStr = '';
         if (Object.prototype.toString.call(h) === '[object Date]') {
            cellDateStr = Utilities.formatDate(h, Session.getScriptTimeZone(), "dd/MM/yyyy");
         } else {
            cellDateStr = String(h).trim();
         }
         
         if (cellDateStr === targetDateStr || cellDateStr === targetDateStrAlt || cellDateStr === data.date) {
            dateColIndex = i;
            break;
         }
      }
      
      if (dateColIndex === -1) {
         dateColIndex = headers.length; 
         sheet.getRange(headerRowIndex + 1, dateColIndex + 1).setValue("'" + targetDateStr);
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

export default function ConfigModal({ onClose }: { onClose: () => void }) {
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
    <div className="fixed inset-0 bg-[#E4E3E0]/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border-[4px] border-[#141414] shadow-[8px_8px_0_rgba(20,20,20,1)] max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-[#141414] hover:bg-[#E4E3E0] p-2 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="p-6 lg:p-10">
          <h2 className="font-serif italic text-2xl mb-6 pr-12">
             Cấu hình Hệ Thống & Google Scripts
          </h2>
          
          <div className="space-y-6 text-sm font-sans">
            <div className="bg-[#FFF4E5] border border-orange-400 p-4 rounded-none flex gap-3 text-orange-900 border-l-[6px] shadow-[4px_4px_0_rgba(0,0,0,0.1)]">
               <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
               <div>
                  <p className="font-bold mb-1 text-base uppercase">BẮT BUỘC: Cập nhật lại mã nguồn App Script</p>
                  <p className="mb-2">Mã mới đã bổ sung nhận diện <strong>Danh sách Trạm, tổ công tác</strong> và nhóm ngày tháng chuẩn xác.</p>
                  <ul className="list-decimal pl-5 space-y-1 mb-2">
                     <li>Copy toàn bộ mã trong ô màu đen bên dưới.</li>
                     <li>Dán đè vào <a href="https://script.google.com" target="_blank" rel="noreferrer" className="underline font-bold text-blue-700">Google Apps Script</a> của bạn.</li>
                     <li>Bấm <strong>Deploy {'->'} New deployment</strong>. (Không được chọn Manage Deployments bản cũ)</li>
                     <li>Sao chép Web App URL <strong>MỚI NHẤT</strong> và dán vào ô bên dưới rồi TẢI LẠI DỮ LIỆU.</li>
                  </ul>
               </div>
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-mono opacity-50 uppercase font-bold">1. Chép URL App Script Mới cập nhật vào đây (bắt buộc tải lại dữ liệu)</label>
              <input 
                type="text" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://script.google.com/macros/s/..."
                className="w-full bg-[#E4E3E0] bg-opacity-30 border border-[#141414] p-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#141414] font-mono"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
               <button 
                  onClick={handleSaveAndSync}
                  disabled={syncing}
                  className="bg-[#141414] text-[#E4E3E0] px-6 py-3 uppercase font-bold tracking-widest hover:invert transition-all flex items-center gap-2 text-sm disabled:opacity-50"
               >
                  <DownloadCloud className="w-4 h-4" />
                  {syncing ? 'Đang Tải Dữ Liệu...' : 'Lưu URL & Tải Danh Sách Tổ/NV'}
               </button>
               {syncResult === 'success' && <div className="text-green-700 font-bold flex items-center bg-green-50 px-3 py-2 border border-green-200">✓ Đã tải dữ liệu Tổ & NV thành công!</div>}
               {syncResult === 'error' && <div className="text-red-700 font-bold flex items-center bg-red-50 px-3 py-2 border border-red-200">✗ Lỗi tải dữ liệu. Hãy kiểm tra URL hoặc App Script.</div>}
            </div>
            
            <div className="border border-[#141414] mt-8 bg-[#141414] text-[#E4E3E0] shadow-inner">
              <div className="flex justify-between items-center p-3 border-b border-[#E4E3E0]/20 bg-black">
                 <span className="text-[10px] font-mono uppercase opacity-50">2. Mã Code Apps Script Mới (Code.gs)</span>
                 <button onClick={handleCopy} className="text-xs font-mono flex items-center gap-1 hover:text-white transition-colors bg-white/10 px-3 py-1">
                    {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Đã chép' : 'Sao chép mã'}
                 </button>
              </div>
              <pre className="p-4 text-[11px] font-mono overflow-auto max-h-[300px]">
                 <code>{SCRIPT_TEMPLATE}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
