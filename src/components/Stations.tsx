import { Zap, ShieldAlert, ArrowRight, ExternalLink, ClipboardCheck, Gauge } from 'lucide-react';

export default function Stations() {
  return (
    <div className="flex flex-col items-center justify-center p-4 sm:p-8 min-h-[500px] h-auto lg:h-[calc(100vh-16rem)]">
      
      <div className="text-center mb-12">
        <h2 className="text-4xl font-black mb-4 uppercase tracking-widest text-[#141414]">Liên Kết Báo Cáo</h2>
        <p className="text-[#141414]/70 max-w-xl mx-auto font-medium">Truy cập nhanh các ứng dụng phục vụ quản lý, báo cáo và xử lý công việc.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl relative">
        {/* Card 1: Quản lý Trạm Biến Áp */}
        <a 
          href="https://quan-ly-tram-bien-ap.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block w-full bg-white border-2 border-[#141414] shadow-[8px_8px_0_#141414] overflow-hidden hover:-translate-y-1 hover:shadow-[12px_12px_0_#141414] transition-all duration-300"
        >
          {/* Cover Image or Pattern */}
          <div className="h-48 bg-[#141414] relative overflow-hidden flex items-center justify-center">
            <Zap className="w-24 h-24 text-blue-500/20 absolute -right-4 -bottom-4 transform -rotate-12" />
            <img 
               src="https://images.unsplash.com/photo-1544724569-5f546fd6f2b6?q=80&w=1600&auto=format&fit=crop" 
               className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay group-hover:scale-110 transition-transform duration-700"
               alt="Trạm Biến Áp"
            />
            <div className="relative z-10 bg-[#f5f4f2] p-4 rounded-xl shadow-lg border-2 border-[#141414] group-hover:-rotate-6 transition-transform">
               <Zap className="w-8 h-8 text-[#141414]" />
            </div>
          </div>
          
          <div className="p-8 pb-16 relative">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-2xl font-black text-[#141414] uppercase tracking-normal">Trạm Biến Áp</h3>
              <ExternalLink className="w-5 h-5 text-[#141414]/40 group-hover:text-[#141414] transition-colors flex-shrink-0" />
            </div>
            <p className="text-[#141414]/70 font-medium mb-6">Truy cập hệ thống quản lý chi tiết thông tin, sơ đồ và thông số vận hành của các trạm biến áp.</p>
            
            <div className="absolute bottom-8 left-8 inline-flex items-center gap-2 font-bold text-[#141414] group-hover:gap-4 transition-all uppercase text-sm tracking-wider">
               Truy cập <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </a>

        {/* Card 2: Xử lý đấu tắt */}
        <a 
          href="https://xu-ly-tam-pcvt.vercel.app/#/login"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block w-full bg-white border-2 border-[#141414] shadow-[8px_8px_0_#141414] overflow-hidden hover:-translate-y-1 hover:shadow-[12px_12px_0_#141414] transition-all duration-300"
        >
          {/* Cover Image or Pattern */}
          <div className="h-48 bg-[#141414] relative overflow-hidden flex items-center justify-center">
             <ShieldAlert className="w-24 h-24 text-red-500/20 absolute -left-4 -bottom-4 transform rotate-12" />
             <img 
               src="https://images.unsplash.com/photo-1627914371465-d0c3ebbbabfc?fm=jpg&q=80&w=1600&fit=crop" 
               className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay group-hover:scale-110 transition-transform duration-700"
               alt="Xử lý đấu tắt"
             />
             <div className="relative z-10 bg-[#f5f4f2] p-4 rounded-xl shadow-lg border-2 border-[#141414] group-hover:rotate-6 transition-transform">
                <ShieldAlert className="w-8 h-8 text-[#141414]" />
             </div>
          </div>

          <div className="p-8 pb-16 relative">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-2xl font-black text-[#141414] uppercase tracking-normal">Xử lý đấu tắt</h3>
              <ExternalLink className="w-5 h-5 text-[#141414]/40 group-hover:text-[#141414] transition-colors flex-shrink-0" />
            </div>
            <p className="text-[#141414]/70 font-medium mb-6">Phần mềm hỗ trợ phát hiện, lập biên bản và theo dõi quy trình xử lý các sự cố đấu tắt an toàn.</p>
            
            <div className="absolute bottom-8 left-8 inline-flex items-center gap-2 font-bold text-[#141414] group-hover:gap-4 transition-all uppercase text-sm tracking-wider">
               Truy cập <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </a>

        {/* Card 3: Xử lý tồn tại sau KT */}
        <a 
          href="https://ket-qua-xu-ly-htdd.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block w-full bg-white border-2 border-[#141414] shadow-[8px_8px_0_#141414] overflow-hidden hover:-translate-y-1 hover:shadow-[12px_12px_0_#141414] transition-all duration-300"
        >
          <div className="h-48 bg-[#141414] relative overflow-hidden flex items-center justify-center">
             <ClipboardCheck className="w-24 h-24 text-emerald-500/20 absolute -right-4 -top-4 transform -rotate-12" />
             <img 
               src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=1600&auto=format&fit=crop" 
               className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay group-hover:scale-110 transition-transform duration-700"
               alt="Xử lý tồn tại"
             />
             <div className="relative z-10 bg-[#f5f4f2] p-4 rounded-xl shadow-lg border-2 border-[#141414] group-hover:-rotate-6 transition-transform">
                <ClipboardCheck className="w-8 h-8 text-[#141414]" />
             </div>
          </div>

          <div className="p-8 pb-16 relative">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-2xl font-black text-[#141414] uppercase tracking-normal">Xử lý tồn tại sau KT</h3>
              <ExternalLink className="w-5 h-5 text-[#141414]/40 group-hover:text-[#141414] transition-colors flex-shrink-0" />
            </div>
            <p className="text-[#141414]/70 font-medium mb-6">Báo cáo kết quả xử lý các tồn tại sau kiểm tra, theo dõi tiến độ khắc phục đo đếm.</p>
            
            <div className="absolute bottom-8 left-8 inline-flex items-center gap-2 font-bold text-[#141414] group-hover:gap-4 transition-all uppercase text-sm tracking-wider">
               Truy cập <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </a>

        {/* Card 4: Tiến độ thay 3 giá */}
        <a 
          href="https://tiendo-thaycongto3gia.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block w-full bg-white border-2 border-[#141414] shadow-[8px_8px_0_#141414] overflow-hidden hover:-translate-y-1 hover:shadow-[12px_12px_0_#141414] transition-all duration-300"
        >
          <div className="h-48 bg-[#141414] relative overflow-hidden flex items-center justify-center">
             <Gauge className="w-24 h-24 text-blue-500/20 absolute -right-4 -top-4 transform -rotate-12" />
             <img 
               src="https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=1600&auto=format&fit=crop" 
               className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay group-hover:scale-110 transition-transform duration-700"
               alt="Tiến độ thay 3 giá"
             />
             <div className="relative z-10 bg-[#f5f4f2] p-4 rounded-xl shadow-lg border-2 border-[#141414] group-hover:-rotate-6 transition-transform">
                <Gauge className="w-8 h-8 text-[#141414]" />
             </div>
          </div>

          <div className="p-8 pb-16 relative">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-2xl font-black text-[#141414] uppercase tracking-normal">Tiến độ thay 3 giá</h3>
              <ExternalLink className="w-5 h-5 text-[#141414]/40 group-hover:text-[#141414] transition-colors flex-shrink-0" />
            </div>
            <p className="text-[#141414]/70 font-medium mb-6">Theo dõi tiến độ, số lượng và thông tin chi tiết quá trình thay thế công tơ 3 giá.</p>
            
            <div className="absolute bottom-8 left-8 inline-flex items-center gap-2 font-bold text-[#141414] group-hover:gap-4 transition-all uppercase text-sm tracking-wider">
               Truy cập <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </a>
      </div>
    </div>
  );
}
