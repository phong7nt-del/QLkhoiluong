const fs = require('fs');
let content = fs.readFileSync('src/components/DcuTab.tsx', 'utf8');

const oldFormStart = `<form onSubmit={handleSubmit} className="space-y-4">`;
const oldFormEndRegex = /<div className="w-5 h-5 border-2 border-white\/30 border-t-white rounded-full animate-spin" \/>\s*\) : \(\s*<Save className="w-5 h-5" \/>\s*\)\}\s*<span>\{isSubmitting \? 'Đang lưu\.\.\.' : 'Lưu Thông Tin'\}<\/span>\s*<\/button>\s*<\/div>\s*<\/form>/s;

const newForm = `<form onSubmit={handleSubmit} className="space-y-5">
                {/* Group 1: Thông tin cơ bản */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><Fingerprint className="w-3.5 h-3.5"/> Thông tin cơ bản</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">ID *</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Fingerprint className="h-4 w-4 text-slate-400" />
                                </div>
                                <input type="text" value={id} onChange={e => setId(e.target.value)} required disabled={isUpdateMode} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 disabled:opacity-60 disabled:bg-slate-100 transition-shadow placeholder-slate-300" placeholder="Mã DCU..." />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Tên DCU *</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FileText className="h-4 w-4 text-slate-400" />
                                </div>
                                <input type="text" value={ten} onChange={e => setTen(e.target.value)} required className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 transition-shadow placeholder-slate-300" placeholder="Tên trạm..." />
                            </div>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Địa chỉ</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Map className="h-4 w-4 text-slate-400" />
                                </div>
                                <input type="text" value={diaChi} onChange={e => setDiaChi(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 transition-shadow placeholder-slate-300" placeholder="Số nhà, đường, phường/xã, quận/huyện..." />
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Group 2: Định vị & Hình ảnh */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5"><Navigation className="w-3.5 h-3.5"/> Định vị tọa độ & Hình ảnh</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Tọa độ X (Vĩ độ)</label>
                                <input type="text" value={toadoX} onChange={e => setToadoX(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 transition-shadow placeholder-slate-300" placeholder="VD: 10.762622" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">Tọa độ Y (Kinh độ)</label>
                                <div className="flex gap-2">
                                    <input type="text" value={toadoY} onChange={e => setToadoY(e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 transition-shadow placeholder-slate-300" placeholder="VD: 106.660172" />
                                    <button type="button" onClick={handleGetLocation} className="shrink-0 bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-2 rounded-lg border border-blue-200 transition-colors flex items-center justify-center font-medium shadow-sm gap-1.5" title="Lấy tọa độ hiện tại">
                                        <MapPin className="w-4 h-4" /> <span className="text-xs hidden sm:inline">Lấy tọa độ</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1.5">Hình ảnh minh chứng</label>
                            <div className="flex items-start gap-4">
                                <div className="w-28 h-28 bg-white border-2 border-dashed border-slate-300 rounded-xl overflow-hidden flex items-center justify-center relative shadow-sm group">
                                    {imagePreview ? (
                                        <>
                                            <img src={getDriveImageUrl(imagePreview)} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                            <button type="button" onClick={() => {setImagePreview(null); setImageFile(null);}} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <X className="w-3 h-3" />
                                            </button>
                                        </>
                                    ) : (
                                        <div className="text-center text-slate-400">
                                            <ImageIcon className="w-6 h-6 mx-auto mb-1 opacity-50" />
                                            <span className="text-[10px] font-medium">Trống</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-2 flex-1">
                                    <label className="cursor-pointer bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-700 px-3 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm">
                                        <Camera className="w-4 h-4" />
                                        <span>Tải ảnh lên</span>
                                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
                                    </label>
                                    <p className="text-[10px] text-slate-500 leading-tight">Hỗ trợ định dạng JPG, PNG, WEBP. Ảnh sẽ được tự động tối ưu hóa kích thước.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Group 3: Ghi chú */}
                <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100">
                    <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5"/> Ghi chú</label>
                    <textarea value={ghiChu} onChange={e => setGhiChu(e.target.value)} rows={2} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-800 transition-shadow resize-none placeholder-slate-300" placeholder="Các thông tin bổ sung khác..." />
                </div>
                
                <div className="pt-2 flex justify-end">
                    <button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full md:w-auto bg-slate-800 hover:bg-slate-700 text-white font-bold py-2.5 px-8 rounded-lg flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg"
                    >
                        {isSubmitting ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        <span>{isSubmitting ? 'Đang lưu...' : (isUpdateMode ? 'Lưu cập nhật' : 'Lưu Thông Tin')}</span>
                    </button>
                </div>
            </form>`;

const match = content.match(oldFormEndRegex);
if(match) {
    const fullOldForm = content.substring(content.indexOf(oldFormStart), match.index + match[0].length);
    content = content.replace(fullOldForm, newForm);
    fs.writeFileSync('src/components/DcuTab.tsx', content, 'utf8');
    console.log("Form updated!");
} else {
    console.log("Could not match old form end");
}
