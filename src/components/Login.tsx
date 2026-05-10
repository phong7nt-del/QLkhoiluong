import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, KeyRound, AlertCircle, ArrowRight, Zap, Target, TrendingUp, CalendarDays } from 'lucide-react';
import { DataStore, SheetMember } from '../store/DataStore';

interface LoginProps {
  onLoginSuccess: (member: SheetMember) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Attempt to sync master data on mount so we have fresh members list
    const initData = async () => {
      try {
        await DataStore.syncMasterData();
      } catch (err) {
        console.error('Failed to sync during login initialization', err);
      } finally {
        setIsInitializing(false);
      }
    };
    initData();
  }, []);

  const normalizeStr = (str: string) => str.toLowerCase().replace(/\s+/g, '');

  const getMsnv = (member: any): string | null => {
    if (!member) return null;
    for (const key of Object.keys(member)) {
      const k = normalizeStr(key);
      if (k.includes('msnv') || k.includes('manv') || k.includes('mãnv') || k.includes('mãnhânviên') || k.includes('manhanvien') || k === 'password' || k === 'pass') {
        return member[key]?.toString().trim();
      }
    }
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Vui lòng nhập đầy đủ Họ tên và MSNV');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      // Simulate slight network delay for better UX
      await new Promise(resolve => setTimeout(resolve, 800));

      const members = DataStore.getMembers();
      
      const normalizedInputName = normalizeStr(username);
      const normalizedInputPass = password.trim().toLowerCase();

      const foundMember = members.find(m => {
        const mName = normalizeStr(m.name);
        if (mName !== normalizedInputName) return false;
        
        const mMsnv = getMsnv(m);
        // If MSNV exists, it must match. If it doesn't exist, we fallback to comparing it against a default or reject it.
        // Wait, what if the data from sheet doesn't have MSNV yet? Let's check strictly.
        if (mMsnv) {
          return mMsnv.toLowerCase() === normalizedInputPass;
        }

        // If sheet doesn't have an explicit MSNV field, we might fail. Let's just fail them with a specific message.
        return false;
      });

      if (foundMember) {
         // Also check if we found MSNV or not. (Wait, the above `if(mMsnv)` guarantees foundMember has it).
         onLoginSuccess(foundMember);
      } else {
         const nameExists = members.some(m => normalizeStr(m.name) === normalizedInputName);
         if (nameExists) {
             setError('Sai mật khẩu (MSNV). Vui lòng thử lại!');
         } else {
             setError('Không tìm thấy nhân viên này trong danh sách!');
         }
      }
    } catch (err) {
      setError('Đã có lỗi xảy ra. Không thể đăng nhập.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#005B8C]/20 rounded-full blur-[100px] pointer-events-none mix-blend-multiply"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#ED1C24]/10 rounded-full blur-[100px] pointer-events-none mix-blend-multiply"></div>
      
      <div className="max-w-5xl w-full grid md:grid-cols-2 bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 z-10 relative">
        
        {/* Left Section - Graphic/Branding */}
        <div className="bg-gradient-to-br from-[#005B8C] via-[#004B73] to-[#003A5A] p-10 flex flex-col justify-between text-white relative overflow-hidden">
           {/* Abstract grid pattern */}
           <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] bg-[size:40px_40px]"></div>
           
           <div className="relative z-10 flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl border border-white/20">
                <img 
                  src="https://www.evnhcmc.vn/public/images/EVNHCMC2021.svg" 
                  alt="EVNHCMC Logo" 
                  className="w-12 h-12 object-contain" 
                />
              </div>
              <div>
                <h1 className="font-bold tracking-wider text-xl text-[#F7941D]">ĐIỆN LỰC VŨNG TÀU</h1>
                <p className="text-white/80 text-sm font-medium tracking-widest uppercase">Đội QLHTĐĐ</p>
              </div>
           </div>

           <div className="relative z-10 mt-12 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                  <h2 className="text-4xl lg:text-5xl font-black leading-tight mb-6">
                     Hệ Thống Quản Lý <br/>
                     <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F7941D] to-[#ED1C24]">
                       Năng Suất Của Bạn
                     </span>
                  </h2>
                  <p className="text-white/80 text-lg max-w-sm leading-relaxed mb-10">
                     Theo dõi, cập nhật và đo lường hiệu suất làm việc hàng ngày một cách trực quan, chính xác nhất.
                  </p>
              </motion.div>

              <div className="space-y-4">
                 {[
                   { icon: <Target className="w-5 h-5"/>, text: "Ghi nhận khối lượng công việc" },
                   { icon: <TrendingUp className="w-5 h-5"/>, text: "Phân tích và đánh giá năng suất" },
                   { icon: <CalendarDays className="w-5 h-5"/>, text: "Báo cáo thống kê theo chu kỳ" },
                 ].map((feat, idx) => (
                    <motion.div 
                      key={idx}
                      className="flex items-center gap-3 text-white/90 font-medium"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.5 + (idx * 0.1) }}
                    >
                       <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/5">
                          {feat.icon}
                       </div>
                       {feat.text}
                    </motion.div>
                 ))}
              </div>
           </div>

           <div className="relative z-10 text-xs font-mono text-white/60 uppercase tracking-widest">
              Version 2026.5.1 • Secure Login
           </div>
           
           {/* Animated decorative shapes */}
           <motion.div 
              className="absolute top-1/4 right-0 w-64 h-64 bg-[#ED1C24]/20 rounded-full blur-3xl"
              animate={{ 
                x: [0, 50, 0], 
                y: [0, -50, 0],
                scale: [1, 1.2, 1]
              }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
           />
        </div>

        {/* Right Section - Login Form */}
        <div className="p-10 lg:p-14 flex flex-col justify-center">
           <div className="max-w-md w-full mx-auto">
              <div className="mb-10 text-center md:text-left">
                <div className="w-16 h-16 bg-[#005B8C]/10 text-[#005B8C] rounded-2xl flex items-center justify-center mb-6 mx-auto md:mx-0 shadow-sm border border-[#005B8C]/20">
                   <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold text-slate-800 tracking-tight">Đăng nhập</h3>
                <p className="text-slate-500 mt-2">Vui lòng nhập thông tin để truy cập hệ thống</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                 <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                       Họ và tên
                    </label>
                    <div className="relative">
                       <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <User className="w-5 h-5" />
                       </div>
                       <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Nhập họ tên của bạn..."
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#005B8C]/20 focus:border-[#005B8C] transition-all outline-none text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal"
                          disabled={isLoading || isInitializing}
                       />
                    </div>
                    <p className="text-[11px] text-slate-500 pl-1">Không phân biệt hoa thường, khoảng trắng</p>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                       Mật khẩu
                    </label>
                    <div className="relative">
                       <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <KeyRound className="w-5 h-5" />
                       </div>
                       <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Mã số nhân viên (MSNV)"
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#005B8C]/20 focus:border-[#005B8C] transition-all outline-none text-slate-700 font-medium placeholder:text-slate-400 placeholder:font-normal"
                          disabled={isLoading || isInitializing}
                       />
                    </div>
                 </div>

                 <AnimatePresence>
                    {error && (
                       <motion.div 
                         initial={{ opacity: 0, height: 0, y: -10 }}
                         animate={{ opacity: 1, height: 'auto', y: 0 }}
                         exit={{ opacity: 0, height: 0, y: -10 }}
                         className="overflow-hidden"
                       >
                          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium flex items-center gap-2 border border-red-100 mt-2">
                             <AlertCircle className="w-4 h-4 shrink-0" />
                             {error}
                          </div>
                       </motion.div>
                    )}
                 </AnimatePresence>

                 <div className="pt-4">
                    <button
                       type="submit"
                       disabled={isLoading || isInitializing}
                       className="relative w-full bg-[#005B8C] hover:bg-[#004B73] text-white font-bold py-3.5 rounded-xl shadow-[0_4px_14px_0_rgba(0,91,140,0.39)] hover:shadow-[0_6px_20px_rgba(0,91,140,0.23)] hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                    >
                       {isLoading ? (
                          <div className="flex items-center gap-2">
                             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                             <span>Đang xác thực...</span>
                          </div>
                       ) : isInitializing ? (
                          <div className="flex items-center gap-2">
                             <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                             <span>Đang tải dữ liệu gốc...</span>
                          </div>
                       ) : (
                          <>
                             <span>Đăng Nhập Hệ Thống</span>
                             <ArrowRight className="w-5 h-5" />
                          </>
                       )}
                    </button>
                 </div>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                 <div className="text-xs text-slate-400 font-medium">Bảo mật thông tin nội bộ</div>
                 <div className="flex items-center gap-1 text-xs text-[#F7941D] font-semibold bg-[#F7941D]/10 px-2 py-1 rounded-md">
                   <Zap className="w-3 h-3 fill-current" />
                   E-Office Sync
                 </div>
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}
