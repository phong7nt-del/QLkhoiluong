import fs from 'fs';

let code = fs.readFileSync('src/components/WarehouseTab.tsx', 'utf-8');

// 1. Add Icons to import
code = code.replace("import { Plus, Trash2, X, Settings, Package, Info, Upload, Save } from 'lucide-react';", 
"import { Plus, Trash2, X, Settings, Package, Info, Upload, Save, Printer, Zap, Box, Wrench, Monitor, Activity, Shield, Flame, Battery, Cpu, Cable, GripHorizontal } from 'lucide-react';\n\nconst getCategoryIcon = (category: string) => {\n   const lower = category.toLowerCase();\n   if (lower.includes('đk') || lower.includes('đo đếm')) return <Activity className=\"w-4 h-4 text-slate-600\" />;\n   if (lower.includes('tu') || lower.includes('ti')) return <Cpu className=\"w-4 h-4 text-slate-600\" />;\n   if (lower.includes('cáp') || lower.includes('dây')) return <Cable className=\"w-4 h-4 text-slate-600\" />;\n   if (lower.includes('điện') || lower.includes('tụ')) return <Zap className=\"w-4 h-4 text-slate-600\" />;\n   if (lower.includes('thiết bị')) return <Monitor className=\"w-4 h-4 text-slate-600\" />;\n   if (lower.includes('phụ kiện') || lower.includes('cơ')) return <Wrench className=\"w-4 h-4 text-slate-600\" />;\n   if (lower.includes('an toàn')) return <Shield className=\"w-4 h-4 text-slate-600\" />;\n   if (lower.includes('chống sét')) return <Flame className=\"w-4 h-4 text-slate-600\" />;\n   if (lower.includes('bình') || lower.includes('pin')) return <Battery className=\"w-4 h-4 text-slate-600\" />;\n   return <Box className=\"w-4 h-4 text-slate-600\" />;\n};\n\nconst zoneColors = [\n  'from-blue-100 to-blue-50 border-blue-400 shadow-blue-900/20 text-blue-900',\n  'from-emerald-100 to-emerald-50 border-emerald-400 shadow-emerald-900/20 text-emerald-900',\n  'from-purple-100 to-purple-50 border-purple-400 shadow-purple-900/20 text-purple-900',\n  'from-amber-100 to-amber-50 border-amber-400 shadow-amber-900/20 text-amber-900',\n  'from-rose-100 to-rose-50 border-rose-400 shadow-rose-900/20 text-rose-900',\n  'from-cyan-100 to-cyan-50 border-cyan-400 shadow-cyan-900/20 text-cyan-900',\n];");

// 2. Hide things in print, add Print Button
code = code.replace("className=\"h-[calc(100vh-140px)] flex gap-4 overflow-hidden p-4\"", "className=\"h-[calc(100vh-140px)] flex gap-4 overflow-hidden p-4 print:p-0 print:h-auto print:overflow-visible\"");

code = code.replace("className=\"flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative\"", "className=\"flex-1 flex flex-col bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative print:border-none print:shadow-none\"");

code = code.replace("className=\"p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50\"", "className=\"p-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 print:hidden\"");

code = code.replace("onClick={handleSaveAll}", "onClick={handleSaveAll}"); // Keep it

const printButton = `            <button 
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-md text-sm font-medium bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors flex items-center"
            >
              <Printer className="w-4 h-4 mr-1" /> In sơ đồ
            </button>
            <button`;
code = code.replace("<button \n              onClick={handleSaveAll}", printButton + "\n              onClick={handleSaveAll}");

code = code.replace("className=\"flex-1 overflow-auto bg-slate-100 p-4 flex items-start justify-start relative\"", "className=\"flex-1 overflow-auto bg-slate-100 p-4 flex items-start justify-start relative print:bg-white print:p-0 print:overflow-visible\"");

// 3. Make the zones lively and add icons
const zoneRender = `{zones.map((zone, idx) => {
                 const colorClass = zoneColors[idx % zoneColors.length];
                 return (
                 <div
                   key={zone.id}
                   onPointerDown={(e) => handlePointerDown(e, zone)}
                   onPointerMove={handlePointerMove}
                   onPointerUp={handlePointerUp}
                   onPointerCancel={handlePointerUp}
                   className={\`absolute flex flex-col justify-start items-center text-center rounded-lg transition-all
                     \${isEditMode ? 'cursor-move ring-2 ring-blue-500/50 hover:ring-blue-500' : 'cursor-pointer hover:-translate-y-1'}
                     \${selectedZone?.id === zone.id ? 'ring-4 ring-blue-600 z-10' : 'z-0 shadow-lg'}
                     bg-gradient-to-br border-2 \${colorClass} overflow-hidden
                   \`}
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
                    <div className={\`flex-1 w-full flex flex-col items-center \${isEditMode ? 'pt-1' : 'justify-center'} p-2\`}>
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
                 </div>
              )})}`;

code = code.replace(/\{zones\.map\(zone => \([\s\S]*?\)\)\}/, zoneRender);

// hide sidebar in print
code = code.replace("className=\"w-[420px] bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0\"", "className=\"w-[420px] bg-white rounded-lg shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0 print:hidden\"");

fs.writeFileSync('src/components/WarehouseTab.tsx', code);
