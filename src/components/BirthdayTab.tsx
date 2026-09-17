import React, { useState, useEffect, useRef } from 'react';
import { DataStore, SheetMember } from '../store/DataStore';
import { Gift, Cake, Sparkles, Calendar, Music } from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';

export default function BirthdayTab() {
  const [members, setMembers] = useState<SheetMember[]>([]);
  const [todayBirthdays, setTodayBirthdays] = useState<SheetMember[]>([]);
  const [monthBirthdays, setMonthBirthdays] = useState<SheetMember[]>([]);
  
  useEffect(() => {
    const allMembers = DataStore.getMembers();
    setMembers(allMembers);
    
    const today = new Date();
    const currDay = today.getDate();
    const currMonth = today.getMonth() + 1; // 1-12
    
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
    
    // Sort monthList by day
    monthList.sort((a, b) => {
        const da = parseInt(String(a.sinhNhat).split('/')[0], 10) || 0;
        const db = parseInt(String(b.sinhNhat).split('/')[0], 10) || 0;
        return da - db;
    });
    
    setTodayBirthdays(todayList);
    setMonthBirthdays(monthList.filter(m => !todayList.includes(m))); // Don't duplicate if they are today
    
    if (todayList.length > 0) {
        // Trigger confetti with a slight delay to ensure UI is mounted
        setTimeout(() => {
            const duration = 4 * 1000;
            const end = Date.now() + duration;

            const frame = () => {
                confetti({
                    particleCount: 5,
                    angle: 60,
                    spread: 55,
                    origin: { x: 0 },
                    zIndex: 10000,
                    colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
                });
                confetti({
                    particleCount: 5,
                    angle: 120,
                    spread: 55,
                    origin: { x: 1 },
                    zIndex: 10000,
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

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full gap-6 overflow-y-auto custom-scrollbar relative">
      <div className="flex items-center gap-3">
        <div className="p-3 bg-rose-100 rounded-xl">
          <Cake className="w-6 h-6 text-rose-600" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">Chúc Mừng Sinh Nhật</h2>
          <p className="text-sm text-slate-500">Góc kỷ niệm và tri ân các thành viên trong Đội</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Birthdays (Featured) */}
        <div className="lg:col-span-2 space-y-6">
           {todayBirthdays.length > 0 ? (
               <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600 p-1 rounded-3xl shadow-xl overflow-hidden relative">
                   <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20"></div>
                   <div className="bg-white/10 backdrop-blur-sm p-8 md:p-12 rounded-[22px] flex flex-col items-center justify-center text-center relative z-10 border border-white/20 h-full min-h-[400px]">
                        
                        <motion.div 
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
                            className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 shadow-2xl backdrop-blur-md border border-white/30"
                        >
                            <Cake className="w-12 h-12 text-white" />
                        </motion.div>
                        
                        <motion.h3 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-3xl md:text-5xl font-black text-white mb-4 drop-shadow-md"
                        >
                            Happy Birthday!
                        </motion.h3>
                        
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="space-y-3 mb-8"
                        >
                            {todayBirthdays.map((m, idx) => (
                                <div key={idx} className="bg-white/20 px-6 py-3 rounded-2xl backdrop-blur-md border border-white/30 shadow-lg">
                                   <p className="text-2xl md:text-3xl font-bold text-white drop-shadow-sm">{m.name}</p>
                                   <p className="text-sm font-medium text-pink-100 uppercase tracking-widest">{m.team} • {m.sinhNhat}</p>
                                </div>
                            ))}
                        </motion.div>
                        
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.2, repeat: Infinity, repeatType: 'reverse', duration: 2 }}
                            className="flex items-center gap-2 text-white/90 font-medium bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm border border-white/20"
                        >
                            <Sparkles className="w-4 h-4 text-yellow-300" />
                            <span>Chúc các đồng chí một tuổi mới nhiều sức khỏe, hạnh phúc và thành công!</span>
                            <Sparkles className="w-4 h-4 text-yellow-300" />
                        </motion.div>
                   </div>
               </div>
           ) : (
               <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center h-full min-h-[400px]">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                       <Calendar className="w-10 h-10 text-slate-300" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-400 mb-2">Hôm nay không có sinh nhật nào</h3>
                   <p className="text-slate-500 max-w-md">Hãy cùng chờ đón và chúc mừng các thành viên vào những ngày tiếp theo trong tháng nhé!</p>
               </div>
           )}
        </div>

        {/* Sidebar: Month & Lyrics */}
        <div className="space-y-6">
            
            {/* Birthdays in Month */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-indigo-100 rounded-lg">
                        <Gift className="w-5 h-5 text-indigo-600" />
                    </div>
                    <h3 className="font-bold text-slate-800 text-lg">Sinh nhật trong Tháng {new Date().getMonth() + 1}</h3>
                </div>
                
                <div className="space-y-4">
                    {todayBirthdays.length === 0 && monthBirthdays.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-4">Không có thành viên nào sinh tháng này.</p>
                    )}
                    
                    {todayBirthdays.map((m, i) => (
                        <div key={`t-${i}`} className="flex items-center gap-4 p-3 bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl border border-rose-100 relative overflow-hidden">
                             <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-500"></div>
                             <div className="w-12 h-12 bg-white rounded-full flex flex-col items-center justify-center text-rose-600 font-bold shadow-sm border border-rose-100 shrink-0">
                                 <span className="text-xs font-normal leading-none mb-0.5">Ngày</span>
                                 <span className="text-lg leading-none">{String(m.sinhNhat).split('/')[0]}</span>
                             </div>
                             <div>
                                 <p className="font-bold text-slate-800">{m.name}</p>
                                 <p className="text-xs text-rose-600 font-medium">Hôm nay!</p>
                             </div>
                        </div>
                    ))}
                    
                    {monthBirthdays.map((m, i) => {
                        const day = parseInt(String(m.sinhNhat).split('/')[0], 10);
                        const isPast = day < new Date().getDate();
                        return (
                        <div key={`m-${i}`} className={`flex items-center gap-4 p-3 rounded-xl border ${isPast ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all'}`}>
                             <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center font-bold shrink-0 ${isPast ? 'bg-slate-200 text-slate-500' : 'bg-indigo-50 text-indigo-600 border border-indigo-100'}`}>
                                 <span className="text-xs font-normal leading-none mb-0.5">Ngày</span>
                                 <span className="text-lg leading-none">{day}</span>
                             </div>
                             <div>
                                 <p className={`font-bold ${isPast ? 'text-slate-600' : 'text-slate-800'}`}>{m.name}</p>
                                 <p className="text-xs text-slate-500">{m.team}</p>
                             </div>
                        </div>
                    )})}
                </div>
            </div>
            
            {/* Lyrics Card */}
            <div className="bg-gradient-to-b from-amber-50 to-orange-50 p-6 rounded-3xl shadow-sm border border-amber-100 text-center relative overflow-hidden">
                <Music className="w-24 h-24 absolute -bottom-4 -right-4 text-amber-500/10 rotate-12" />
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
                    <Music className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-lg mb-4 font-serif">Khúc hát chúc mừng</h3>
                <div className="relative z-10 mb-4">
                    <audio 
                        controls 
                        className="w-full h-10 rounded-full"
                        src="https://github.com/BaseMax/happy-birth-letter/raw/main/happy-birthday.mp3"
                    >
                        Trình duyệt của bạn không hỗ trợ thẻ audio.
                    </audio>
                </div>
                <div className="text-sm text-slate-600 space-y-2 font-medium italic relative z-10 leading-relaxed">
                    <p>Happy birthday to you,</p>
                    <p>Happy birthday to you,</p>
                    <p>Happy birthday, happy birthday,</p>
                    <p>Happy birthday to you!</p>
                    <div className="h-2"></div>
                    <p>Chúc mừng sinh nhật!</p>
                    <p>Chúc tuổi mới tràn ngập niềm vui,</p>
                    <p>Hạnh phúc đong đầy,</p>
                    <p>Thành công rực rỡ!</p>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
