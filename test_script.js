6-// CHỈ DÁN ĐOẠN MÃ DƯỚI ĐÂY VÀO:
7-var SPREADSHEET_ID = '1WyhxKyJ85WjighfivYGflfFXbpX4RpzVMlZ1biPKCAQ';
8-
9-function getSheetFlexibly(ss, possibleNames) {
10-  if (!ss || !possibleNames || !possibleNames.length) return null;
11-  for (var i=0; i<possibleNames.length; i++) {
12-    var sheet = ss.getSheetByName(possibleNames[i]);
13-    if (sheet) return sheet;
14-  }
15-  var sheets = ss.getSheets();
16-  if (!sheets) return null;
17-  for (var s=0; s<sheets.length; s++) {
18-    var sn = sheets[s].getName().toLowerCase().trim();
19-    for (var p=0; p<possibleNames.length; p++) {
20-       if (sn === possibleNames[p].toLowerCase().trim()) return sheets[s];
21-    }
22-  }
23-  return null;
24-}
25-
26-function doGet(e) {
27-  try {
28-    if (e.parameter.action === 'getData') {
29-      var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
30-      var sheet = getSheetFlexibly(ss, ['CongTac', 'Cong Tac', 'Công tác', 'Công Tác', 'Con Tác']);
31-      if (!sheet) return ContentService.createTextOutput(JSON.stringify({ spreadsheetId: SPREADSHEET_ID, error: "Not found sheet CongTac"})).setMimeType(ContentService.MimeType.JSON);
32-      var data = sheet.getDataRange().getValues();
33-      
34-      var nameIdx = -1;
35-      var teamIdx = -1;
36-      var startRow = 1;
37-
38-      for (var r = 0; r < 5 && r < data.length; r++) {
39-        for (var c = 0; c < data[r].length; c++) {
40-          var val = String(data[r][c]).toLowerCase().trim();
41-          if (val.includes('họ và tên') || val === 'họ tên') nameIdx = c;
42-          if (val.includes('khu vực') || val === 'khu vuc' || val.includes('tổ công tác') || val.includes('bộ phận công tác')) teamIdx = c;
43-        }
44-        if (nameIdx !== -1 && teamIdx !== -1) {
45-          startRow = r + 1;
46-          break;
47-        }
48-      }
49-      
50-      if (nameIdx === -1) { nameIdx = 1; startRow = 2; }
51-      if (teamIdx === -1) { teamIdx = 2; }
52-      
53-      var teams = [];
54-      var members = [];
55-      var memberTeamMap = {};
56-      var currentTeam = '';
57-      
58-      for (var i = startRow; i < data.length; i++) {
59-        var name = String(data[i][nameIdx] || '').trim();
60-        var teamVal = String(data[i][teamIdx] || '').trim();
61-        
62-        if (teamVal && teamVal.toLowerCase() !== 'khu vực' && teamVal.toLowerCase() !== 'tổ công tác' && teamVal.toLowerCase() !== 'bộ phận công tác') {
63-            currentTeam = teamVal;
64-        }
65-        
66-        if (!name || name.toLowerCase().includes('họ và tên') || name.toLowerCase() === 'họ tên') continue;
67-        
68-        var assignTeam = currentTeam || 'Không xác định';
69-        
70-        if (assignTeam && assignTeam.toLowerCase() !== 'khu vực' && assignTeam.toLowerCase() !== 'tổ công tác' && assignTeam.toLowerCase() !== 'bộ phận công tác') {
71-          if (teams.indexOf(assignTeam) === -1) {
72-             teams.push(assignTeam);
73-          }
74-          var msnv = msnvIdx !== -1 ? String(data[i][msnvIdx]).trim() : '';
75-        var role = roleIdx !== -1 ? String(data[i][roleIdx]).trim() : '';
76-        members.push({ team: assignTeam, name: name, msnv: msnv, role: role });
77-          memberTeamMap[name] = assignTeam;
78-        }
79-      }
80-      
81-      var workloads = [];
82-      var dateCols = [];
83-      var headerRowIndex = startRow - 1;
84-      if (headerRowIndex >= 0) {
85-         var headers = data[headerRowIndex] || [];
86-         for (var c = nameIdx + 1; c < headers.length; c++) {
87-            if (c === teamIdx) continue;
88-            var h = headers[c];
89-            var dateStr = '';
90-            if (Object.prototype.toString.call(h) === '[object Date]') {
91-               dateStr = Utilities.formatDate(h, Session.getScriptTimeZone(), "yyyy-MM-dd");
92-            } else {
93-               var s = String(h).replace(/'/g, '').trim();
94-               var p1 = s.split('/');
95-               if (p1.length === 3) {
96-                  dateStr = p1[2] + '-' + (p1[1].length===1?'0'+p1[1]:p1[1]) + '-' + (p1[0].length===1?'0'+p1[0]:p1[0]);
97-               } else if (p1.length === 2) {
98-                  var year = new Date().getFullYear();
99-                  dateStr = year + '-' + (p1[1].length===1?'0'+p1[1]:p1[1]) + '-' + (p1[0].length===1?'0'+p1[0]:p1[0]);
100-               } else if (s.indexOf('-') > -1) {
101-                  dateStr = s; 
102-               }
103-            }
104-            if (dateStr && dateStr.length >= 8 && dateStr.indexOf('-') > -1) {
105-               dateCols.push({ colIdx: c, date: dateStr });
106-            }
107-         }
108-         
109-         for (var i = startRow; i < data.length; i++) {
110-           var name = String(data[i][nameIdx] || '').trim();
111-           if (!name || name.toLowerCase().includes('họ và tên') || name.toLowerCase() === 'họ tên') continue;
112-           var foundTeam = memberTeamMap[name] || '';
113-           for (var d = 0; d < dateCols.length; d++) {
114-              var val = String(data[i][dateCols[d].colIdx] || '').trim();
115-              if (val) {
116-                 workloads.push({
117-                    id: 'sheet_' + i + '_' + dateCols[d].colIdx,
118-                    team: foundTeam,
119-                    members: [name],
120-                    content: val,
121-                    date: dateCols[d].date,
122-                    timestamp: new Date().getTime()
123-                 });
124-              }
125-           }
126-         }
127-      }
128-      
129-      // Đọc sheet Tram
130-      var stations = [];
131-      var sheetTram = getSheetFlexibly(ss, ['Tram', 'Trạm']);
132-      if (sheetTram) {
133-        var tramDataRange = sheetTram.getDataRange();
134-        var tramData = tramDataRange.getValues();
135-        var tramBackgrounds = tramDataRange.getBackgrounds();
136-        
137-        var tramHeaderRow = 0;
138-        var idIdx = -1;
139-        var nameTIdx = -1;
140-        var typeIdx = -1;
141-        var areaIdx = -1;
142-        
143-        for (var r = 0; r < Math.min(10, tramData.length); r++) {
144-          for (var c = 0; c < tramData[r].length; c++) {
145-            var h = String(tramData[r][c]).toLowerCase().trim();
146-            if (h.includes('id cũ') || h.includes('id cu') || h === 'mã trạm' || h === 'ma tram') idIdx = c;
147-            if (h.includes('tên tba đặt lại') || h.includes('tên trạm') || h === 'ten tram' || h === 'tên tba') nameTIdx = c;
148-            if (h.includes('mã loại trạm chi tiết') || h.includes('loại trạm') || h === 'loai tram') typeIdx = c;
149-            if (h.includes('khu vực') || h === 'khu vuc' || h.includes('tổ')) areaIdx = c;
150-          }
151-          if (idIdx !== -1 || nameTIdx !== -1) {
152-            tramHeaderRow = r;
153-            break;
154-          }
155-        }
156-        
157-        if (idIdx === -1) idIdx = 0;
158-        if (nameTIdx === -1) nameTIdx = 1;
159-        if (typeIdx === -1) typeIdx = 2;
160-        
161-        var tramHeaders = tramData[tramHeaderRow] || [];
162-        var currentFeeder = "Khác";
163-        
164-        for (var i = tramHeaderRow + 1; i < tramData.length; i++) {
165-           var row = tramData[i];
166-           var bgRow = tramBackgrounds[i];
167-           var idVal = String(row[idIdx] || '').trim();
168-           var nameVal = String(row[nameTIdx] || '').trim();
169-           
170-           var isFeederRow = false;
171-           for (var bc = 0; bc < bgRow.length && bc < 5; bc++) {
172-              var color = bgRow[bc] ? bgRow[bc].toLowerCase() : '#ffffff';
173-              if (color !== '#ffffff' && color !== '#000000' && color.startsWith('#')) {
174-                 isFeederRow = true;
175-                 break;
176-              }
177-           }
178-           
179-           if (!idVal && nameVal && (nameVal.toLowerCase().indexOf('tuyến') > -1 || nameVal.toLowerCase().indexOf('trục') > -1 || nameVal.toLowerCase().indexOf('nhánh') > -1)) {
180-               isFeederRow = true;
181-           }
182-           
183-           if (isFeederRow) {
184-               if (nameVal) currentFeeder = nameVal;
185-               else if (idVal) currentFeeder = idVal;
186-               else if (String(row[0]).trim()) currentFeeder = String(row[0]).trim();
187-               continue;
188-           }
189-           
190-           if (!idVal && !nameVal) continue;
191-           
192-           var details = {};
193-           for (var c = 0; c < tramHeaders.length; c++) {
194-              if (tramHeaders[c]) {
195-                 var headerName = String(tramHeaders[c]);
196-                 var cellValue = String(row[c] || '');
197-                 if (headerName.trim() !== '') {
198-                    details[headerName] = cellValue;
199-                 }
200-              }
201-           }
202-           
203-           stations.push({
204-             id: idVal,
205-             name: nameVal,
206-             type: String(row[typeIdx] || '').trim(),
207-             area: areaIdx !== -1 && String(row[areaIdx]).trim() ? String(row[areaIdx]).trim() : currentFeeder,
208-             details: details
209-           });
210-        }
211-      }
212-      
213-      // Đọc sheet DinhMuc
214-      var dinhMucList = [];
215-      var sheetDinhMuc = getSheetFlexibly(ss, ['DinhMuc', 'Định Mức', 'Dinh muc', 'Định mức']);
216-      if (sheetDinhMuc) {
217-        var dmData = sheetDinhMuc.getDataRange().getValues();
218-        var headers = dmData[0] || [];
219-        var nameCol = -1;
220-        var quotaCol = -1;
221-        for (var j = 0; j < headers.length; j++) {
222-           var h = String(headers[j]).toLowerCase();
223-           if (h.indexOf('nội dung') > -1 || h.indexOf('danh mục') > -1 || h.indexOf('tên') > -1) {
224-               if (nameCol === -1) nameCol = j;
225-           }
226-           if (h.indexOf('định mức') > -1 || h.indexOf('khối lượng') > -1 || h.indexOf('chỉ tiêu') > -1) {
227-               quotaCol = j;
228-           }
229-        }
230-        if (nameCol === -1) nameCol = 0;
231-        if (quotaCol === -1 && dmData[0].length > 1) quotaCol = 1;
232-        
233-        for (var d = 1; d < dmData.length; d++) {
234-           var val1 = String(dmData[d][nameCol] || '').trim();
235-           var val2 = quotaCol > -1 ? Number(dmData[d][quotaCol]) : 0;
236-           if (isNaN(val2)) val2 = 0;
237-           
238-           if (val1 && val1.toLowerCase() !== 'stt') {
239-              dinhMucList.push({ name: val1, quota: val2 });
240-           }
241-        }
242-      }
243-      
244-      // Đọc sheet TUTI
245-      var tutiList = [];
246-      var sheetTuti = getSheetFlexibly(ss, ['TUTI', 'Tuti', 'TuTi', 'tu ti']);
247-      if (sheetTuti) {
248-         var tData = sheetTuti.getDataRange().getValues();
249-         var tHeaders = tData[0] || [];
250-         var thm = {};
251-         for (var c = 0; c < tHeaders.length; c++) {
252-            var rawH = String(tHeaders[c]).toLowerCase().trim();
253-            var h = rawH.normalize('NFD').replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/s+/g, ' ');
254-            if (h === 'ma tram') thm.maTramCol = c;
255-            if (h === 'ten diem do' || h === 'ten tram') thm.tenDiemDoCol = c;
256-            if (h.indexOf('thong so tu') > -1 || h === 'tu') thm.tuCol = c;
257-            if (h.indexOf('thong so ti') > -1 || h === 'ti') thm.tiCol = c;
258-            if (h.indexOf('kiem tra tu') > -1) thm.ktTuCol = c;
259-            if (h.indexOf('kiem tra ti') > -1) thm.ktTiCol = c;
260-            if (h === 'khac') thm.khacCol = c;
261-            if (h === 'ket luan') thm.ketLuanCol = c;
262-            if (h.indexOf('ngay cap nhat') > -1 || h.indexOf('ngay kiem tra') > -1) thm.ngayKiemTraCol = c;
263-            if (h.indexOf('ngay dua len') > -1) thm.ngayDuaLenCol = c;
264-            if (h.indexOf('nguoi dua len') > -1) thm.nguoiDuaLenCol = c;
265-            if (h.indexOf('nguoi kiem tra') > -1) thm.nguoiKiemTraCol = c;
266-         }
267-         
268-         for (var t = 1; t < tData.length; t++) {
269-             var mTram = thm.maTramCol !== undefined ? String(tData[t][thm.maTramCol] || '') : '';
270-             var tDiem = thm.tenDiemDoCol !== undefined ? String(tData[t][thm.tenDiemDoCol] || '') : '';
271-             if (mTram || tDiem) {
272-                 tutiList.push({
273-                     maTram: mTram,
274-                     tenDiemDo: tDiem,
275-                     thongSoTU: thm.tuCol !== undefined ? String(tData[t][thm.tuCol] || '') : '',
276-                     thongSoTI: thm.tiCol !== undefined ? String(tData[t][thm.tiCol] || '') : '',
277-                     kiemTraTU: thm.ktTuCol !== undefined ? String(tData[t][thm.ktTuCol] || '') : '',
278-                     kiemTraTI: thm.ktTiCol !== undefined ? String(tData[t][thm.ktTiCol] || '') : '',
279-                     khac: thm.khacCol !== undefined ? String(tData[t][thm.khacCol] || '') : '',
280-                     ketLuan: thm.ketLuanCol !== undefined ? String(tData[t][thm.ketLuanCol] || '') : '',
281-                     ngayCapNhat: thm.ngayKiemTraCol !== undefined ? String(tData[t][thm.ngayKiemTraCol] || '') : '',
282-                     ngayDuaLen: thm.ngayDuaLenCol !== undefined ? String(tData[t][thm.ngayDuaLenCol] || '') : '',
283-                     nguoiDuaLen: thm.nguoiDuaLenCol !== undefined ? String(tData[t][thm.nguoiDuaLenCol] || '') : '',
284-                     nguoiKiemTra: thm.nguoiKiemTraCol !== undefined ? String(tData[t][thm.nguoiKiemTraCol] || '') : ''
285-                 });
286-             }
287-         }
288-      }
289-      
290-      // Đọc sheet ChiTietMKN/MatKetNoi
291-      var matKetNoiList = [];
292-      var sheetMatKetNoi = getSheetFlexibly(ss, ['ChiTietMKN', 'Chi Tiet MKN', 'Chi Tiết MKN', 'MatKetNoi', 'Mat Ket Noi', 'Mất Kết Nối', 'Mất kết nối', 'matketnoi']);
293-      if (sheetMatKetNoi) {
294-         var mknData = sheetMatKetNoi.getDataRange().getValues();
295-         var mknHeaders = mknData[0] || [];
296-         
297-         for (var t = 1; t < mknData.length; t++) {
298-             var rowInfo = {};
299-             for (var c = 0; c < mknHeaders.length; c++) {
300-                 var headerStr = String(mknHeaders[c]).trim();
301-                 if (headerStr) {
302-                     rowInfo[headerStr] = String(mknData[t][c] || '');
303-                 }
304-             }
305-             if (Object.keys(rowInfo).length > 0) {
306-                 matKetNoiList.push(rowInfo);
307-             }
308-         }
309-      }
310-      
311-      return ContentService.createTextOutput(JSON.stringify({
312-        status: 'success',
313-        teams: teams,
314-        members: members,
315-        stations: stations,
316-        workloads: workloads,
317-        dinhMuc: dinhMucList,
318-        tuti: tutiList,
319-        matKetNoi: matKetNoiList
320-      })).setMimeType(ContentService.MimeType.JSON);
321-    }
322-  } catch (err) {
323-    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: err.toString() })).setMimeType(ContentService.MimeType.JSON);
324-  }
325-  return ContentService.createTextOutput("Valid Endpoint");
326-}
327-
328-function doPost(e) {
329-  try {
330-    var payload;
331-    try {
332-      payload = JSON.parse(e.postData.contents);
333-    } catch (parseError) {
334-      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: "Invalid JSON format" })).setMimeType(ContentService.MimeType.JSON);
335-    }
336-
337-    var action = payload.action;
338-    if (action === 'savePlan') {
339-       var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
340-       var sheet = getSheetFlexibly(ss, ['Nhật ký/CongTac', 'Nhat ky/CongTac', 'CongTac', 'Cong Tac', 'Công tác']);
341-       if (!sheet) return ContentService.createTextOutput(JSON.stringify({status: 'error', message: 'Not found'})).setMimeType(ContentService.MimeType.JSON);
342-       
343-       var data = sheet.getDataRange().getValues();
344-       var nameIdx = -1;
345-       var startRow = 1;
346-       for (var r = 0; r < 5 && r < data.length; r++) {
347-         for (var c = 0; c < data[r].length; c++) {
348-           var val = String(data[r][c]).toLowerCase().trim();
349-           if (val.includes('họ và tên') || val === 'họ tên') nameIdx = c;
350-         }
351-         if (nameIdx !== -1) { startRow = r + 1; break; }
352-       }
353-       if (nameIdx === -1) { nameIdx = 1; startRow = 2; }
354-       
355-       var dateCols = {};
356-       var headerRowIndex = startRow - 1;
357-       if (headerRowIndex >= 0) {
358-          var headers = data[headerRowIndex] || [];
359-          for (var c = nameIdx + 1; c < headers.length; c++) {
360-             var h = headers[c];
361-             var dateStr = '';
362-             if (Object.prototype.toString.call(h) === '[object Date]') {
363-                dateStr = Utilities.formatDate(h, Session.getScriptTimeZone(), "yyyy-MM-dd");
364-             } else {
365-                var s = String(h).replace(/'/g, '').trim();
366-                var p1 = s.split('/');
367-                if (p1.length === 3) {
368-                   dateStr = p1[2] + '-' + (p1[1].length===1?'0'+p1[1]:p1[1]) + '-' + (p1[0].length===1?'0'+p1[0]:p1[0]);
369-                } else if (p1.length === 2) {
370-                   var year = new Date().getFullYear();
371-                   dateStr = year + '-' + (p1[1].length===1?'0'+p1[1]:p1[1]) + '-' + (p1[0].length===1?'0'+p1[0]:p1[0]);
372-                } else if (s.indexOf('-') > -1) {
373-                   dateStr = s; 
374-                }
375-             }
376-             if (dateStr && dateStr.length >= 8 && dateStr.indexOf('-') > -1) {
377-                dateCols[dateStr] = c;
378-             }
379-          }
380-       }
381-       
382-       var workloads = payload.workloads || [];
383-       for (var i = 0; i < workloads.length; i++) {
384-          var wl = workloads[i];
385-          var dateCol = dateCols[wl.date];
386-          if (dateCol !== undefined) {
387-             for (var r = startRow; r < data.length; r++) {
388-                var rowName = String(data[r][nameIdx] || '').trim();
389-                if (rowName === wl.members[0]) {
390-                   sheet.getRange(r + 1, dateCol + 1).setValue(wl.content);
391-                   break;
392-                }
393-             }
394-          }
395-       }
396-       return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
397-    }
398-
399-
400-    // ======== CẬP NHẬT KẾ HOẠCH THÁNG (ĐỊNH MỨC) ========
401-    if (action === "update_plan_month") {
402-      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Định mức") || SpreadsheetApp.getActiveSpreadsheet().getSheetByName("DinhMuc") || SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Định Mức");
403-      
404-      if (!sheet) {
405-         return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Không tìm thấy sheet Định mức" })).setMimeType(ContentService.MimeType.JSON);
406-      }
407-      
408-      var monthYear = payload.monthYear;
409-      var items = payload.items;
410-      
411-      if (!monthYear || !items) {
412-         return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Thiếu monthYear hoặc items" })).setMimeType(ContentService.MimeType.JSON);
413-      }
414-      
415-      var dataRange = sheet.getDataRange();
416-      var dataValues = dataRange.getValues();
417-      var headers = dataValues.length > 0 ? dataValues[0] : [];
418-      
419-      var colIndex = -1;
420-      if (headers.length > 0) {
421-          for (var i = 0; i < headers.length; i++) {
422-             if (String(headers[i]).trim().toLowerCase() === String(monthYear).trim().toLowerCase()) {
423-                 colIndex = i;
424-                 break;
425-             }
426-          }
427-      }
428-      
429-      if (colIndex === -1) {
430-          colIndex = sheet.getLastColumn();
431-          sheet.getRange(1, colIndex + 1).setValue(monthYear);
432-          sheet.getRange(1, colIndex + 1).setFontWeight("bold");
433-      }
434-      
435-      var nameCol = -1;
436-      if (headers.length > 0) {
437-          for (var c = 0; c < headers.length; c++) {
438-              var hStr = String(headers[c]).toLowerCase();
439-              if (hStr.indexOf("nội dung") !== -1 || hStr.indexOf("tên") !== -1 || hStr.indexOf("noi dung") !== -1 || hStr.indexOf("ten") !== -1) {
440-                  nameCol = c;
441-                  break;
442-              }
443-          }
444-      }
445-      if (nameCol === -1) nameCol = 0;
446-      
447-      // Cập nhật từng item
448-      for (var k = 0; k < items.length; k++) {
449-          var item = items[k];
450-          var rowIndex = -1;
451-          for (var r = 1; r < dataValues.length; r++) {
452-             if (dataValues[r] && dataValues[r].length > nameCol && String(dataValues[r][nameCol]).trim().toLowerCase() === String(item.name).trim().toLowerCase()) {
453-                 rowIndex = r;
454-                 break;
455-             }
456-          }
457-          if (rowIndex !== -1) {
458-              sheet.getRange(rowIndex + 1, colIndex + 1).setValue(item.quantity);
459-          } else {
460-              var newRow = sheet.getLastRow();
461-              sheet.getRange(newRow + 1, nameCol + 1).setValue(item.name);
462-              sheet.getRange(newRow + 1, colIndex + 1).setValue(item.quantity);
463-              
464-              var arr = [];
465-              arr[nameCol] = item.name;
466-              dataValues.push(arr);
467-          }
468-      }
469-      
470-      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
471-    }
472-
473-    // ======== XỬ LÝ ĐỒNG BỘ SƠ ĐỒ KHO ========
474-    if (action === 'update_kho') {
475-      var data = payload.data;
476-      var sheetName = "Kho";
477-      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
478-      if (!sheet) {
479-        sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(sheetName);
480-      }
481-      sheet.clearContents(); // Xóa dữ liệu cũ
482-      
483-      if (data && data.length > 0) {
484-        var headers = Object.keys(data[0]);
485-        var rows = [headers];
486-        for (var i = 0; i < data.length; i++) {
487-          var row = [];
488-          for (var j = 0; j < headers.length; j++) {
489-            row.push(data[i][headers[j]]);
490-          }
491-          rows.push(row);
492-        }
493-        sheet.getRange(1, 1, rows.length, headers.length).setValues(rows);
494-      }
495-      
496-      return ContentService.createTextOutput(JSON.stringify({status: "success", message: "Đã cập nhật Kho"}))
497-        .setMimeType(ContentService.MimeType.JSON);
498-    }
499-    
500-    // ======== XỬ LÝ ĐỒNG BỘ DANH SÁCH VTTB ========
501-    if (action === 'update_vttb') {
502-      var data = payload.data;
503-      var sheetName = "VTTB";
504-      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
