const fs = require('fs');

const code = `import React, { useState, useEffect, useRef } from 'react';
import { DataStore, SheetMember } from '../store/DataStore';
import { Gift, Cake, Sparkles, Calendar, Music, PartyPopper } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';

const calculateAge = (dobString: string | undefined | null) => {
    if (!dobString) return null;
    const parts = String(dobString).split('/');
    if (parts.length < 3) return null;
    const year = parseInt(parts[2], 10);
    if (isNaN(year) || year < 1900 || year > new Date().getFullYear()) return null;
    return new Date().getFullYear() - year;
};

const getWishForAge = (age: number | null) => {
    if (age === null) return "Chúc đồng chí một tuổi mới ngập tràn niềm vui, sức khỏe và hạnh phúc!";
    if (age < 30) return \`Chúc mừng sinh nhật tuổi \${age}! Chúc đồng chí luôn trẻ trung, năng động, đầy nhiệt huyết và gặt hái nhiều thành công rực rỡ!\`;
    if (age < 45) return \`Chúc mừng sinh nhật lần thứ \${age}! Chúc đồng chí sự nghiệp không ngừng thăng tiến, gia đình viên mãn và luôn giữ vững phong độ tuyệt vời!\`;
    if (age < 60) return \`Chúc mừng tuổi \${age}! Chúc đồng chí luôn dồi dào sức khỏe, an nhiên tự tại và tiếp tục là chỗ dựa vững chắc cho tập thể và gia đình!\`;
    return \`Chúc mừng tuổi \${age}! Kính chúc đồng chí sức khỏe dồi dào, vạn sự như ý, luôn tươi trẻ và hạnh phúc đong đầy!\`;
};

export default function BirthdayTab() {
  const [members, setMembers] = useState<SheetMember[]>([]);
  const [todayBirthdays, setTodayBirthdays] = useState<SheetMember[]>([]);
  const [monthBirthdays, setMonthBirthdays] = useState<SheetMember[]>([]);
  const [isCakeCut, setIsCakeCut] = useState(false);
  
  useEffect(() => {
    const allMembers = DataStore.getMembers();
    setMembers(allMembers);
    
    const today = new Date();
    const currDay = today.getDate();
    const currMonth = today.getMonth() + 1;
    
    const todayList: SheetMember[] = [];
    const monthList: SheetMember[] = [];
    
    allMembers.forEach(m => {
       if (m.sinhNhat) {
           const parts = String(m.sinhNhat).split('/');
           if (parts.length >= 2) {
               const d = parseInt(parts[0], 10);
               const mnt = parseInt(parts[1], 10);
               
               if (mnt === currMonth) {
                   monthList.push(m);
                   if (d === currDay) {
                       todayList.push(m);
                   }
               }
           }
       }
    });
    
    monthList.sort((a, b) => {
        const da = parseInt(String(a.sinhNhat).split('/')[0], 10) || 0;
        const db = parseInt(String(b.sinhNhat).split('/')[0], 10) || 0;
        return da - db;
    });
    
    setTodayBirthdays(todayList);
    setMonthBirthdays(monthList.filter(m => !todayList.includes(m)));
    
    // Trigger confetti if ANY birthday exists (today or month)
    if (todayList.length > 0 || monthList.length > 0) {
        setTimeout(() => {
            const duration = 4 * 1000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 5, angle: 60, spread: 55, origin: { x: 0 }, zIndex: 10000,
                    colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
                });
                confetti({
                    particleCount: 5, angle: 120, spread: 55, origin: { x: 1 }, zIndex: 10000,
                    colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
                });

                if (Date.now() < end) {
                    requestAnimationFrame(frame);
                }
            };
            frame();
        }, 500);
    }
  }, []);

  const handleCakeClick = () => {
      if (isCakeCut) return;
      setIsCakeCut(true);
      
      // Fire extra confetti from the cake
      confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 10000
      });
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full gap-6 overflow-y-auto custom-scrollbar relative">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-rose-100 rounded-xl">
          <PartyPopper className="w-6 h-6 text-rose-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Chúc Mừng Sinh Nhật</h2>
          <p className="text-sm text-slate-500">Góc kỷ niệm và tri ân các thành viên trong Đội</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
           {todayBirthdays.length > 0 && (
               <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600 p-1 rounded-3xl shadow-xl overflow-hidden relative">
                   <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                   <div className="bg-white/10 backdrop-blur-sm p-8 md:p-12 rounded-[22px] flex flex-col items-center justify-center text-center relative z-10 border border-white/20 h-full min-h-[350px]">
                        
                        <div 
                            onClick={handleCakeClick}
                            className="relative cursor-pointer group mb-6"
                            title="Bấm để cắt bánh!"
                        >
                            <AnimatePresence mode="wait">
                                {!isCakeCut ? (
                                    <motion.div 
                                        key="whole-cake"
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        exit={{ scale: 0, opacity: 0, rotate: 90 }}
                                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                        className="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md border border-white/30 group-hover:scale-110 transition-transform"
                                    >
                                        <Cake className="w-14 h-14 text-white drop-shadow-md" />
                                        {/* Knife Hint */}
                                        <motion.div 
                                            animate={{ y: [0, -10, 0] }}
                                            transition={{ repeat: Infinity, duration: 1.5 }}
                                            className="absolute -top-4 -right-4 text-3xl opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            🔪
                                        </motion.div>
                                    </motion.div>
                                ) : (
                                    <motion.div 
                                        key="sliced-cake"
                                        initial={{ scale: 0, rotate: -45 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        className="w-28 h-28 flex items-center justify-center"
                                    >
                                        <span className="text-7xl drop-shadow-2xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">🍰</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        <motion.h3 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-3xl md:text-5xl font-black text-white mb-6 drop-shadow-lg font-serif"
                        >
                            Happy Birthday!
                        </motion.h3>
                        
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="space-y-4 w-full max-w-lg mx-auto"
                        >
                            {todayBirthdays.map((m, idx) => {
                                const age = calculateAge(m.sinhNhat);
                                return (
                                <div key={idx} className="bg-white/20 p-5 rounded-2xl backdrop-blur-md border border-white/30 shadow-lg text-left relative overflow-hidden group">
                                   <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                                   <div className="flex justify-between items-start mb-2">
                                       <div>
                                           <p className="text-2xl md:text-3xl font-bold text-white drop-shadow-sm">{m.name}</p>
                                           <p className="text-xs md:text-sm font-medium text-pink-100 uppercase tracking-widest">{m.team}</p>
                                       </div>
                                       {age !== null && (
                                           <div className="bg-white/30 px-3 py-1 rounded-full text-white font-bold border border-white/40 shadow-sm">
                                               {age} Tuổi
                                           </div>
                                       )}
                                   </div>
                                   <div className="mt-3 p-3 bg-black/10 rounded-xl border border-white/10">
                                       <p className="text-sm md:text-base text-white/95 font-medium italic leading-relaxed">
                                           "{getWishForAge(age)}"
                                       </p>
                                   </div>
                                </div>
                            )})}
                        </motion.div>
                   </div>
               </div>
           )}

           {monthBirthdays.length > 0 && (
               <div className="relative bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-500 p-1 rounded-3xl shadow-xl overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="bg-white/10 backdrop-blur-sm p-8 rounded-[22px] border border-white/20">
                        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-20 rounded-full blur-3xl mix-blend-overlay"></div>
                        
                        <div className="relative z-10 flex flex-col items-center text-center mb-8">
                            <motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                                className="w-16 h-16 bg-white/20 rounded-2xl rotate-3 flex items-center justify-center mb-4 shadow-xl backdrop-blur-md border border-white/30"
                            >
                                <Calendar className="w-8 h-8 text-white -rotate-3" />
                            </motion.div>

                            <motion.h3 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-2xl md:text-4xl font-black text-white drop-shadow-md"
                            >
                                Sinh Nhật Tập Thể Tháng {new Date().getMonth() + 1}
                            </motion.h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {monthBirthdays.map((m, idx) => {
                                const age = calculateAge(m.sinhNhat);
                                return (
                                <motion.div 
                                    key={idx} 
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 + idx * 0.1 }}
                                    className="bg-white/10 p-5 rounded-2xl backdrop-blur-sm border border-white/20 shadow-md flex flex-col relative overflow-hidden group hover:bg-white/20 transition-colors"
                                >
                                   <div className="absolute -right-4 -top-4 text-white/5 text-6xl rotate-12 group-hover:scale-110 transition-transform"><Gift /></div>
                                   <div className="flex justify-between items-start mb-3 relative z-10">
                                       <div className="text-left">
                                           <p className="text-xl font-bold text-white drop-shadow-sm leading-tight">{m.name}</p>
                                           <p className="text-xs font-medium text-blue-100 uppercase tracking-wider">{m.team}</p>
                                       </div>
                                       <div className="flex flex-col items-end gap-1">
                                            <div className="bg-white/20 px-2.5 py-1 rounded-lg border border-white/30 text-white font-bold text-sm whitespace-nowrap shadow-sm">
                                                Ngày {String(m.sinhNhat).split('/')[0]}
                                            </div>
                                            {age !== null && (
                                                <span className="text-xs text-blue-100 font-bold bg-black/20 px-2 py-0.5 rounded-full">{age} tuổi</span>
                                            )}
                                       </div>
                                   </div>
                                   <div className="mt-auto pt-3 border-t border-white/10 relative z-10">
                                       <p className="text-sm text-white/90 italic font-medium">"{getWishForAge(age)}"</p>
                                   </div>
                                </motion.div>
                            )})}
                        </div>
                   </div>
               </div>
           )}

           {todayBirthdays.length === 0 && monthBirthdays.length === 0 && (
               <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                       <Calendar className="w-10 h-10 text-slate-300" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-400 mb-2">Tháng này không có sinh nhật nào</h3>
                   <p className="text-slate-500 max-w-md">Hãy cùng chờ đón và chúc mừng các thành viên vào những tháng tiếp theo nhé!</p>
               </div>
           )}
        </div>

        {/* Sidebar: Audio */}
        <div className="space-y-6">
            {/* Audio Card */}
            <div className="bg-gradient-to-br from-amber-100 to-orange-100 p-6 rounded-3xl shadow-sm border border-amber-200 text-center relative overflow-hidden flex flex-col items-center justify-center">
                <Music className="w-32 h-32 absolute -bottom-6 -right-6 text-amber-500/10 rotate-12" />
                <div className="w-14 h-14 bg-amber-200/50 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600 shadow-inner">
                    <Music className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-amber-800 text-lg mb-4 font-serif relative z-10">Giai Điệu Chúc Mừng</h3>
                <div className="relative z-10 w-full flex justify-center">
                    <audio 
                        controls 
                        className="h-10 rounded-full w-full max-w-[220px]"
                        src="https://github.com/BaseMax/happy-birth-letter/raw/main/happy-birthday.mp3"
                    >
                        Trình duyệt của bạn không hỗ trợ thẻ audio.
                    </audio>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/components/BirthdayTab.tsx', code);
