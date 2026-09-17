const fs = require('fs');
let code = fs.readFileSync('src/components/BirthdayTab.tsx', 'utf8');

// Replace the main area logic
const targetMainArea = `<div className="lg:col-span-2">
           {todayBirthdays.length > 0 ? (
               <div className="relative bg-gradient-to-br from-rose-400 via-pink-500 to-purple-600 p-10 rounded-3xl shadow-xl overflow-hidden border border-white/20">`;

const replaceMainArea = `<div className="lg:col-span-2 space-y-6">
           {todayBirthdays.length > 0 && (
               <div className="relative bg-gradient-to-br from-rose-400 via-pink-500 to-purple-600 p-10 rounded-3xl shadow-xl overflow-hidden border border-white/20">`;

code = code.replace(targetMainArea, replaceMainArea);

const targetMainEnd = `                   </div>
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
        </div>`;

const replaceMainEnd = `                   </div>
               </div>
           )}

           {monthBirthdays.length > 0 && (
               <div className="relative bg-gradient-to-br from-indigo-400 via-blue-500 to-cyan-600 p-8 rounded-3xl shadow-xl overflow-hidden border border-white/20">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
                    
                    <div className="relative z-10 flex flex-col items-center text-center">
                        <motion.div 
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                            className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 shadow-2xl backdrop-blur-md border border-white/30"
                        >
                            <Calendar className="w-8 h-8 text-white" />
                        </motion.div>

                        <motion.h3 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="text-2xl md:text-4xl font-black text-white mb-6 drop-shadow-md"
                        >
                            Sinh Nhật Tháng {new Date().getMonth() + 1}
                        </motion.h3>
                        
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full"
                        >
                            {monthBirthdays.map((m, idx) => (
                                <div key={idx} className="bg-white/10 px-4 py-3 rounded-xl backdrop-blur-sm border border-white/20 shadow-sm flex items-center justify-between">
                                   <div className="text-left">
                                       <p className="text-lg font-bold text-white drop-shadow-sm leading-tight">{m.name}</p>
                                       <p className="text-xs font-medium text-blue-100 uppercase tracking-wider">{m.team}</p>
                                   </div>
                                   <div className="bg-white/20 px-3 py-1 rounded-lg border border-white/30 text-white font-bold whitespace-nowrap">
                                        Ngày {String(m.sinhNhat).split('/')[0]}
                                   </div>
                                </div>
                            ))}
                        </motion.div>
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
        </div>`;

code = code.replace(targetMainEnd, replaceMainEnd);

// Replace Audio card
const targetAudio = `            {/* Lyrics Card */}
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
            </div>`;

const replaceAudio = `            {/* Audio Card */}
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
            </div>`;

code = code.replace(targetAudio, replaceAudio);
fs.writeFileSync('src/components/BirthdayTab.tsx', code);
