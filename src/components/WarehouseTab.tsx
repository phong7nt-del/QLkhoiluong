import { motion } from 'motion/react';
import React, { useState, useEffect, useRef } from 'react';
import { DataStore } from '../store/DataStore';
import { Plus, Trash2, X, Settings, Package, Info, Upload, Save, Printer, Zap, Box, Wrench, Monitor, Activity, Shield, Flame, Battery, Cpu, Cable, GripHorizontal } from 'lucide-react';

const getCategoryIcon = (category: string) => {
   const lower = category.toLowerCase();
   if (lower.includes('đk') || lower.includes('đo đếm')) return <Activity className="w-4 h-4 text-slate-600" />;
   if (lower.includes('tu') || lower.includes('ti')) return <Cpu className="w-4 h-4 text-slate-600" />;
   if (lower.includes('cáp') || lower.includes('dây')) return <Cable className="w-4 h-4 text-slate-600" />;
   if (lower.includes('điện') || lower.includes('tụ')) return <Zap className="w-4 h-4 text-slate-600" />;
   if (lower.includes('thiết bị')) return <Monitor className="w-4 h-4 text-slate-600" />;
   if (lower.includes('phụ kiện') || lower.includes('cơ')) return <Wrench className="w-4 h-4 text-slate-600" />;
   if (lower.includes('an toàn')) return <Shield className="w-4 h-4 text-slate-600" />;
   if (lower.includes('chống sét')) return <Flame className="w-4 h-4 text-slate-600" />;
   if (lower.includes('bình') || lower.includes('pin')) return <Battery className="w-4 h-4 text-slate-600" />;
   return <Box className="w-4 h-4 text-slate-600" />;
};

const zoneColors = [
  'from-blue-100 to-blue-50 border-blue-400 shadow-blue-900/20 text-blue-900',
  'from-emerald-100 to-emerald-50 border-emerald-400 shadow-emerald-900/20 text-emerald-900',
  'from-purple-100 to-purple-50 border-purple-400 shadow-purple-900/20 text-purple-900',
  'from-amber-100 to-amber-50 border-amber-400 shadow-amber-900/20 text-amber-900',
  'from-rose-100 to-rose-50 border-rose-400 shadow-rose-900/20 text-rose-900',
  'from-cyan-100 to-cyan-50 border-cyan-400 shadow-cyan-900/20 text-cyan-900',
];
import * as XLSX from 'xlsx';

const PIXELS_PER_METER = 20;

interface Zone {
  id: string;
  code: string;
  x: number; // in meters
  y: number; // in meters
  width: number; // in meters
  height: number; // in meters
  categories: string[];
}

export default function WarehouseTab() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  const [warehouseWidth, setWarehouseWidth] = useState(40); // 40m
  const [warehouseHeight, setWarehouseHeight] = useState(30); // 30m
  
  const [vttbData, setVttbData] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const khoFromStore = DataStore.getKho();
    let loadedZones = false;
    if (khoFromStore && khoFromStore.length > 0) {
       const sizeRow = khoFromStore.find(r => r.type === 'SIZE');
       if (sizeRow) {
          setWarehouseWidth(parseFloat(sizeRow.width) || 40);
          setWarehouseHeight(parseFloat(sizeRow.height) || 30);
       }
       const zoneRows = khoFromStore.filter(r => r.type === 'ZONE');
       if (zoneRows.length > 0) {
          setZones(zoneRows.map(r => ({
             id: r.id,
             code: r.code,
             x: parseFloat(r.x) || 0,
             y: parseFloat(r.y) || 0,
             width: parseFloat(r.width) || 5,
             height: parseFloat(r.height) || 5,
             categories: r.categories ? String(r.categories).split(',').map((c: string) => c.trim()).filter(Boolean) : []
          })));
          loadedZones = true;
       }
    }
    
    if (!loadedZones) {
        const savedZones = localStorage.getItem('warehouse_zones_v1');
        if (savedZones) {
          try {
            setZones(JSON.parse(savedZones));
          } catch(e) {}
        }
        const savedSize = localStorage.getItem('warehouse_size_v1');
        if (savedSize) {
          try {
            const parsed = JSON.parse(savedSize);
            if (parsed.w) setWarehouseWidth(parsed.w);
            if (parsed.h) setWarehouseHeight(parsed.h);
          } catch(e) {}
        }
    }
    
    setVttbData(DataStore.getVTTB());
  }, []);

  const saveKhoToLocal = (newZones: Zone[], w: number, h: number) => {
    setZones(newZones);
    setWarehouseWidth(w);
    setWarehouseHeight(h);
    localStorage.setItem('warehouse_zones_v1', JSON.stringify(newZones));
    localStorage.setItem('warehouse_size_v1', JSON.stringify({ w, h }));
  };

  const addZone = () => {
    const newZone: Zone = {
      id: Math.random().toString(36).substr(2, 9),
      code: `Khu-${zones.length + 1}`,
      x: 1,
      y: 1,
      width: 5,
      height: 5,
      categories: []
    };
    saveKhoToLocal([...zones, newZone], warehouseWidth, warehouseHeight);
  };

  const deleteZone = (id: string) => {
    saveKhoToLocal(zones.filter(z => z.id !== id), warehouseWidth, warehouseHeight);
    if (selectedZone?.id === id) {
      setSelectedZone(null);
      setSelectedCategory(null);
    }
  };

  const updateZone = (id: string, updates: Partial<Zone>) => {
    saveKhoToLocal(zones.map(z => z.id === id ? { ...z, ...updates } : z), warehouseWidth, warehouseHeight);
  };

  const [dragInfo, setDragInfo] = useState<{id: string, startX: number, startY: number, initialX: number, initialY: number} | null>(null);

  const handlePointerDown = (e: React.PointerEvent, zone: Zone) => {
    if (!isEditMode) {
      setSelectedZone(zone);
      setSelectedCategory(null);
      return;
    }
    setDragInfo({
      id: zone.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: zone.x,
      initialY: zone.y
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragInfo || !isEditMode) return;
    const dx = (e.clientX - dragInfo.startX) / PIXELS_PER_METER;
    const dy = (e.clientY - dragInfo.startY) / PIXELS_PER_METER;
    
    // Snap to 0.5m grid
    let newX = Math.round((dragInfo.initialX + dx) * 2) / 2;
    let newY = Math.round((dragInfo.initialY + dy) * 2) / 2;
    
    const zone = zones.find(z => z.id === dragInfo.id);
    if (zone) {
        newX = Math.max(0, Math.min(newX, warehouseWidth - zone.width));
        newY = Math.max(0, Math.min(newY, warehouseHeight - zone.height));
        updateZone(dragInfo.id, { x: newX, y: newY });
    }
  };

  const handlePointerUp = () => {
    setDragInfo(null);
  };
  
  const getItemsInCategory = (category: string) => {
    return vttbData.filter(item => {
        const itemCat = item['chủng loại'] || item['Chủng loại'] || item['Chung loai'] || item['chung loai'] || '';
        return String(itemCat).trim().toLowerCase() === category.trim().toLowerCase();
    });
  };

  const [newCatName, setNewCatName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVttb, setNewVttb] = useState({ma: '', ten: '', sl: '', soNo: '', tinhTrang: 'mới'});
  
  const isSpecialCategory = (catName: string) => {
     if (!catName) return false;
     const upper = catName.trim().toUpperCase();
     return upper.startsWith('ĐK') || upper.startsWith('TU') || upper.startsWith('TI');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedCategory) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
       const bstr = evt.target?.result;
       const wb = XLSX.read(bstr, { type: 'binary' });
       const wsname = wb.SheetNames[0];
       const ws = wb.Sheets[wsname];
       const data = XLSX.utils.sheet_to_json(ws);
       
       if (data && data.length > 0) {
           const newItems = data.map((row: any) => ({
              'mã vttb': row['Mã VTTB'] || row['Mã'] || row['ma vttb'] || '',
              'tên vttb': row['Tên VTTB'] || row['Tên'] || row['ten vttb'] || '',
              'số lượng': row['Số Lượng'] || row['SL'] || row['Số lượng'] || row['số lượng'] || 1,
              'số no': row['Số No'] || row['Số NO'] || row['so no'] || '',
              'tình trạng': row['Tình Trạng'] || row['Tình trạng'] || row['tinh trang'] || 'mới',
              'chủng loại': selectedCategory
           }));
           
           const updatedVttb = [...vttbData, ...newItems];
           setVttbData(updatedVttb);
           try {
              localStorage.setItem('sheet_vttb_v1', JSON.stringify(updatedVttb));
           } catch(e) {}
           
           setIsSaving(true);
           await DataStore.syncVttbToSheet(updatedVttb);
           setIsSaving(false);
           alert(`Đã import thành công ${newItems.length} VTTB!`);
       }
       if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };
  
  const saveVttb = async (newItem: any) => {
     const updatedVttb = [...vttbData, newItem];
     setVttbData(updatedVttb);
     try {
        localStorage.setItem('sheet_vttb_v1', JSON.stringify(updatedVttb));
     } catch(e) {}
     setShowAddForm(false);
     setNewVttb({ma: '', ten: '', sl: '', soNo: '', tinhTrang: 'mới'});
     
     setIsSaving(true);
     const success = await DataStore.syncVttbToSheet(updatedVttb);
     setIsSaving(false);
     if (success) {
        alert("Đã lưu VTTB lên hệ thống!");
     } else {
        alert("Đã lưu nội bộ, nhưng đồng bộ lên Google Sheet thất bại (cần cấu hình API).");
     }
  };

  const handleSaveAll = async () => {
     setIsSaving(true);
     await DataStore.syncVttbToSheet(vttbData);
     const khoRows = [
       { id: 'WAREHOUSE_SIZE', type: 'SIZE', code: 'MAIN', x: 0, y: 0, width: warehouseWidth, height: warehouseHeight, categories: '' },
       ...zones.map(z => ({
           id: z.id,
           type: 'ZONE',
           code: z.code,
           x: z.x,
           y: z.y,
           width: z.width,
           height: z.height,
           categories: z.categories.join(', ')
       }))
     ];
     await DataStore.syncKhoToSheet(khoRows);
     setIsSaving(false);
     alert("Đã đồng bộ lên hệ thống!");
  };

  return (
    <div className="h-[calc(100vh-140px)] flex gap-4 overflow-hidden p-4 print:p-0 print:h-auto print:overflow-visible">
      <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative print:border-none print:shadow-none">
        <div className="p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden">
          <h2 className="font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" />
            Sơ đồ Kho VTTB
          </h2>
          <div className="flex items-center gap-2">
                        <button 
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors flex items-center"
            >
              <Printer className="w-4 h-4 mr-1" /> In sơ đồ
            </button>
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-1" /> {isSaving ? 'Đang lưu...' : 'Đồng bộ'}
            </button>
            <button 
              onClick={() => setIsEditMode(!isEditMode)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${isEditMode ? 'bg-blue-600 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
            >
              <Settings className="w-4 h-4 inline mr-1" />
              {isEditMode ? 'Hoàn tất chỉnh sửa' : 'Chỉnh sửa sơ đồ'}
            </button>
            {isEditMode && (
               <button 
                 onClick={addZone}
                 className="px-3 py-1.5 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center"
               >
                 <Plus className="w-4 h-4 mr-1" /> Thêm khu vực
               </button>
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-start justify-start relative print:bg-white print:p-0 print:overflow-visible">
           <div 
             className="bg-white border-2 border-slate-300 shadow-sm relative origin-top-left bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]"
             style={{ width: warehouseWidth * PIXELS_PER_METER, height: warehouseHeight * PIXELS_PER_METER }}
           >
              {zones.map((zone, idx) => {
                 const colorClass = zoneColors[idx % zoneColors.length];
                 return (
                 <motion.div
                   layoutId={zone.id}
                   initial={{ opacity: 0, scale: 0.8 }}
                   animate={{ opacity: 1, scale: 1 }}
                   whileHover={{ scale: isEditMode ? 1.02 : 1.05 }}
                   transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                   key={zone.id}
                   onPointerDown={(e) => handlePointerDown(e, zone)}
                   onPointerMove={handlePointerMove}
                   onPointerUp={handlePointerUp}
                   onPointerCancel={handlePointerUp}
                   className={`absolute flex flex-col justify-start items-center text-center rounded-lg transition-all
                     ${isEditMode ? 'cursor-move ring-2 ring-blue-500/50 hover:ring-blue-500' : 'cursor-pointer hover:-translate-y-1'}
                     ${selectedZone?.id === zone.id ? 'ring-4 ring-blue-600 z-10' : 'z-0 shadow-lg'}
                     bg-gradient-to-br border-2 ${colorClass} overflow-hidden
                   `}
                   style={{
                        left: zone.x * PIXELS_PER_METER,
                        top: zone.y * PIXELS_PER_METER,
                        width: zone.width * PIXELS_PER_METER,
                        height: zone.height * PIXELS_PER_METER,
                        touchAction: 'none'
                    }}
                 >
                    {isEditMode && (
                        <div className="w-full bg-black/5 flex justify-center py-1 cursor-move" title="Kéo thả để di chuyển">
                           <GripHorizontal className="w-4 h-4 opacity-50" />
                        </div>
                    )}
                    <div className={`flex-1 w-full flex flex-col items-center ${isEditMode ? 'pt-1' : 'justify-center'} p-2`}>
                        <span className="font-bold block text-sm drop-shadow-sm mb-1">{zone.code}</span>
                        {zone.categories.length > 0 && (
                            <div className="flex flex-wrap justify-center gap-1 mt-1">
                                {zone.categories.slice(0, 4).map((cat, i) => (
                                    <div key={i} title={cat} className="bg-white/60 p-1 rounded-md shadow-sm border border-white/40">
                                        {getCategoryIcon(cat)}
                                    </div>
                                ))}
                                {zone.categories.length > 4 && (
                                    <div className="bg-white/60 px-1.5 py-0.5 rounded-md shadow-sm border border-white/40 text-[10px] font-bold flex items-center">
                                        +{zone.categories.length - 4}
                                    </div>
                                )}
                            </div>
                        )}
                        {zone.categories.length === 0 && !isEditMode && (
                           <span className="text-[10px] opacity-70 mt-1">Trống</span>
                        )}
                    </div>
                 </motion.div>
              )})}
           </div>
        </div>
      </div>
      
      {/* Right Sidebar for Details */}
      {(selectedZone || isEditMode) && (
        <div className="w-[420px] bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0 print:hidden">
          <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
             <h3 className="font-bold text-slate-800">
               {isEditMode ? 'Tùy chỉnh' : selectedZone ? `Chi tiết: ${selectedZone.code}` : ''}
             </h3>
             <button onClick={() => { setSelectedZone(null); setSelectedCategory(null); }} className="text-slate-400 hover:text-slate-600">
               <X className="w-5 h-5" />
             </button>
          </div>
          
          <div className="flex-1 overflow-auto p-4 space-y-4">
             {isEditMode && selectedZone ? (
               <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã khu vực</label>
                    <input 
                      type="text" 
                      value={selectedZone.code} 
                      onChange={e => updateZone(selectedZone.id, { code: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chiều rộng (m)</label>
                      <input 
                        type="number" 
                        value={selectedZone.width} 
                        onChange={e => updateZone(selectedZone.id, { width: parseFloat(e.target.value) || 1 })}
                        step="0.5"
                        min="0.5"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:bg-white focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chiều dài (m)</label>
                      <input 
                        type="number" 
                        value={selectedZone.height} 
                        onChange={e => updateZone(selectedZone.id, { height: parseFloat(e.target.value) || 1 })}
                        step="0.5"
                        min="0.5"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:bg-white focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Các chủng loại lưu tại đây</label>
                    <div className="flex gap-2 mb-2">
                      <input 
                        type="text" 
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        placeholder="Nhập tên chủng loại..."
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm focus:bg-white focus:border-blue-500"
                      />
                      <button 
                        onClick={() => {
                          if (newCatName.trim() && !selectedZone.categories.includes(newCatName.trim())) {
                             updateZone(selectedZone.id, { categories: [...selectedZone.categories, newCatName.trim()] });
                             setNewCatName('');
                          }
                        }}
                        className="px-3 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                      >
                        Thêm
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                       {selectedZone.categories.map(cat => (
                         <div key={cat} className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-md text-sm border border-slate-200">
                            <span>{cat}</span>
                            <button 
                              onClick={() => updateZone(selectedZone.id, { categories: selectedZone.categories.filter(c => c !== cat) })}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="w-3 h-3" />
                            </button>
                         </div>
                       ))}
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteZone(selectedZone.id)}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-md text-sm font-bold border border-red-100 hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    Xóa khu vực này
                  </button>
               </div>
             ) : isEditMode && !selectedZone ? (
               <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kích thước nhà kho (mét)</label>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[10px] text-slate-400">Rộng (m)</span>
                        <input 
                          type="number" 
                          value={warehouseWidth} 
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 40;
                            saveKhoToLocal(zones, val, warehouseHeight);
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm"
                        />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400">Dài (m)</span>
                        <input 
                          type="number" 
                          value={warehouseHeight} 
                          onChange={e => {
                            const val = parseFloat(e.target.value) || 30;
                            saveKhoToLocal(zones, warehouseWidth, val);
                          }}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                       if (window.confirm("Bạn có chắc muốn reset toàn bộ sơ đồ kho?")) {
                          saveKhoToLocal([], warehouseWidth, warehouseHeight);
                       }
                    }}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-md text-sm font-bold border border-red-100 hover:bg-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    Làm trống sơ đồ
                  </button>
               </div>
             ) : selectedZone ? (
                selectedCategory ? (
                   <div>
                      <div className="flex justify-between items-center mb-3">
                        <button onClick={() => setSelectedCategory(null)} className="text-blue-600 text-sm font-medium hover:underline flex items-center">
                           ← Quay lại danh sách
                        </button>
                        {isSpecialCategory(selectedCategory) && (
                          <label className="cursor-pointer px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-md text-xs font-bold hover:bg-green-100 flex items-center gap-1">
                            <Upload className="w-3 h-3" /> Import Excel
                            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" ref={fileInputRef} onChange={handleFileUpload} />
                          </label>
                        )}
                      </div>
                      <h4 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100">
                         Chủng loại: {selectedCategory}
                      </h4>
                      
                      <div className="space-y-2">
                         {getItemsInCategory(selectedCategory).length > 0 ? (
                            getItemsInCategory(selectedCategory).map((item, idx) => (
                               <div key={idx} className="bg-slate-50 border border-slate-200 p-2 rounded-md text-sm">
                                  <div className="font-bold text-slate-700">{item['tên vttb'] || item['Tên VTTB'] || item['ten vttb'] || JSON.stringify(item)}</div>
                                  <div className="text-xs text-slate-500 mt-1 flex justify-between items-center">
                                     <span>Mã: {item['mã vttb'] || item['Mã VTTB'] || '-'}</span>
                                     <span className="font-bold text-blue-600">SL: {item['số lượng'] || item['Số lượng'] || item['Số Lượng'] || '-'}</span>
                                  </div>
                                  {isSpecialCategory(selectedCategory) && (
                                     <div className="text-xs text-slate-500 mt-1 flex justify-between items-center pt-1 border-t border-slate-200/60">
                                        <span>Số No: <span className="font-medium text-slate-700">{item['số no'] || item['Số No'] || item['Số NO'] || '-'}</span></span>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                          (item['tình trạng'] || item['Tình trạng'] || '').toLowerCase().includes('mới') ? 'bg-green-100 text-green-700' :
                                          (item['tình trạng'] || item['Tình trạng'] || '').toLowerCase().includes('hư') ? 'bg-red-100 text-red-700' :
                                          (item['tình trạng'] || item['Tình trạng'] || '').toLowerCase().includes('kiểm định') ? 'bg-amber-100 text-amber-700' :
                                          'bg-blue-100 text-blue-700'
                                        }`}>
                                          {item['tình trạng'] || item['Tình trạng'] || 'mới'}
                                        </span>
                                     </div>
                                  )}
                               </div>
                            ))
                         ) : (
                            <div className="text-center py-6 text-slate-500 text-sm">
                               Chưa có VTTB nào thuộc chủng loại này.
                            </div>
                         )}
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-slate-100">
                         {showAddForm ? (
                            <div className="space-y-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
                               <h5 className="text-xs font-bold text-blue-800 uppercase">Thêm VTTB Mới</h5>
                               <div>
                                 <label className="block text-xs text-slate-600 mb-1">Mã VTTB</label>
                                 <input type="text" value={newVttb.ma} onChange={e => setNewVttb({...newVttb, ma: e.target.value})} className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm" />
                               </div>
                               <div>
                                 <label className="block text-xs text-slate-600 mb-1">Tên VTTB</label>
                                 <input type="text" value={newVttb.ten} onChange={e => setNewVttb({...newVttb, ten: e.target.value})} className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm" />
                               </div>
                               <div className="grid grid-cols-2 gap-2">
                                 <div>
                                   <label className="block text-xs text-slate-600 mb-1">Số lượng</label>
                                   <input type="number" value={newVttb.sl} onChange={e => setNewVttb({...newVttb, sl: e.target.value})} className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm" />
                                 </div>
                                 {isSpecialCategory(selectedCategory) && (
                                   <div>
                                     <label className="block text-xs text-slate-600 mb-1">Số No</label>
                                     <input type="text" value={newVttb.soNo} onChange={e => setNewVttb({...newVttb, soNo: e.target.value})} className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm" />
                                   </div>
                                 )}
                               </div>
                               {isSpecialCategory(selectedCategory) && (
                                 <div>
                                   <label className="block text-xs text-slate-600 mb-1">Tình trạng</label>
                                   <select value={newVttb.tinhTrang} onChange={e => setNewVttb({...newVttb, tinhTrang: e.target.value})} className="w-full px-2 py-1.5 rounded border border-slate-200 text-sm bg-white">
                                      <option value="mới">Mới</option>
                                      <option value="hư">Hư</option>
                                      <option value="thu hồi chờ kiểm định">Thu hồi chờ kiểm định</option>
                                      <option value="sử dụng lại">Sử dụng lại</option>
                                   </select>
                                 </div>
                               )}
                               <div className="flex gap-2 pt-2">
                                 <button onClick={() => setShowAddForm(false)} className="flex-1 bg-white border border-slate-300 text-slate-700 py-1.5 rounded text-sm font-medium hover:bg-slate-50 transition-colors">Hủy</button>
                                 <button 
                                   onClick={() => {
                                      if (newVttb.ma && newVttb.ten) {
                                         const newItem: any = {
                                           'mã vttb': newVttb.ma,
                                           'tên vttb': newVttb.ten,
                                           'chủng loại': selectedCategory,
                                           'số lượng': newVttb.sl || 1
                                         };
                                         if (isSpecialCategory(selectedCategory)) {
                                            newItem['số no'] = newVttb.soNo;
                                            newItem['tình trạng'] = newVttb.tinhTrang;
                                         }
                                         saveVttb(newItem);
                                      } else {
                                         alert('Vui lòng nhập Mã và Tên VTTB');
                                      }
                                   }} 
                                   className="flex-1 bg-blue-600 text-white py-1.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
                                 >
                                   Lưu
                                 </button>
                               </div>
                            </div>
                         ) : (
                           <button onClick={() => setShowAddForm(true)} className="w-full bg-blue-50 text-blue-600 border border-blue-200 py-2 rounded-md text-sm font-bold hover:bg-blue-100 transition-colors flex justify-center items-center gap-1">
                              <Plus className="w-4 h-4" /> Thêm VTTB mới
                           </button>
                         )}
                      </div>
                   </div>
                ) : (
                   <div>
                      <h4 className="font-bold text-slate-800 mb-4 pb-2 border-b border-slate-100 flex items-center justify-between">
                         Danh mục VTTB
                         <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">{selectedZone.categories.length}</span>
                      </h4>
                      
                      {selectedZone.categories.length > 0 ? (
                         <div className="space-y-2">
                            {selectedZone.categories.map(cat => {
                               const items = getItemsInCategory(cat);
                               return (
                                 <div 
                                   key={cat} 
                                   onClick={() => setSelectedCategory(cat)}
                                   className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-400 hover:shadow-sm cursor-pointer transition-all group"
                                 >
                                    <div className="font-medium text-slate-700 group-hover:text-blue-700">{cat}</div>
                                    <div className="flex gap-2 items-center">
                                      {isSpecialCategory(cat) && <span className="text-[10px] bg-amber-100 text-amber-700 px-1 rounded uppercase font-bold">Chi tiết</span>}
                                      <div className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-md group-hover:bg-blue-50">
                                         {items.length} món
                                      </div>
                                    </div>
                                 </div>
                               )
                            })}
                         </div>
                      ) : (
                         <div className="text-center py-8 text-slate-500 text-sm">
                            <Info className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                            Khu vực này chưa được cấu hình chủng loại VTTB nào.
                         </div>
                      )}
                   </div>
                )
             ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
