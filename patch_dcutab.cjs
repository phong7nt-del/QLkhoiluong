const fs = require('fs');
let content = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

content = content.replace(
    "import { Camera, MapPin, Search, SortAsc, SortDesc, Save, AlertCircle, CheckCircle2, Image as ImageIcon } from 'lucide-react';",
    "import { Camera, MapPin, Search, SortAsc, SortDesc, Save, AlertCircle, CheckCircle2, Image as ImageIcon, ZoomIn, ZoomOut, X } from 'lucide-react';"
);

const stateInsert = `  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Zoom Image State
  const [viewImage, setViewImage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
  const closeZoom = () => {
      setViewImage(null);
      setZoomLevel(1);
  };`;

content = content.replace(
    "  const [imageFile, setImageFile] = useState<File | null>(null);\n  const [imagePreview, setImagePreview] = useState<string | null>(null);",
    stateInsert
);

const imageViewerInsert = `      {/* Image Viewer Modal */}
      {viewImage && (
        <div className="fixed inset-0 z-[100] bg-black/90 flex flex-col items-center justify-center">
            <div className="absolute top-4 right-4 flex gap-4 z-50">
                <button onClick={handleZoomOut} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors">
                    <ZoomOut className="w-6 h-6" />
                </button>
                <button onClick={handleZoomIn} className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-full transition-colors">
                    <ZoomIn className="w-6 h-6" />
                </button>
                <button onClick={closeZoom} className="bg-white/20 hover:bg-red-500/80 text-white p-2 rounded-full transition-colors ml-4">
                    <X className="w-6 h-6" />
                </button>
            </div>
            <div className="flex-1 w-full flex items-center justify-center overflow-auto p-4">
                <img 
                    src={viewImage} 
                    alt="Phóng to" 
                    style={{ transform: \`scale(\${zoomLevel})\`, transition: 'transform 0.2s ease-out', cursor: zoomLevel > 1 ? 'grab' : 'default' }}
                    className="max-w-full max-h-[90vh] object-contain origin-center"
                />
            </div>
        </div>
      )}

      {/* Form and Table... */}`;

content = content.replace(
    "  return (\n    <div className=\"space-y-6\">",
    "  return (\n    <div className=\"space-y-6\">\n" + imageViewerInsert
);

const oldImgRender = `                                    {row.hinhAnh ? (
                                        <a href={row.hinhAnh} target="_blank" rel="noreferrer" className="inline-block">
                                            <div className="w-8 h-8 rounded bg-slate-200 overflow-hidden border border-slate-300">
                                                <img src={row.hinhAnh} alt="DCU" className="w-full h-full object-cover" />
                                            </div>
                                        </a>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}`;

const newImgRender = `                                    {row.hinhAnh ? (
                                        <button onClick={() => setViewImage(row.hinhAnh)} className="inline-block">
                                            <div className="w-8 h-8 rounded bg-slate-200 overflow-hidden border border-slate-300 cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all">
                                                <img src={row.hinhAnh} alt="DCU" className="w-full h-full object-cover" />
                                            </div>
                                        </button>
                                    ) : (
                                        <span className="text-slate-400">-</span>
                                    )}`;

content = content.replace(oldImgRender, newImgRender);

fs.writeFileSync('src/components/DcuTab.tsx', content, 'utf8');
console.log('Patched DcuTab.tsx image viewer');
