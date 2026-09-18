import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DataStore, SheetMember } from '../store/DataStore';
import { 
  Gift, Cake, Sparkles, Calendar, Music, PartyPopper, Trophy, Award,
  ChevronRight, Play, Pause, RotateCcw, Volume2, VolumeX, Eye, Flame
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import TuyenDuongTab from './TuyenDuongTab';
import { soundFX } from '../utils/soundFX';

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
  if (age < 30) return `Chúc mừng sinh nhật tuổi ${age}! Chúc đồng chí luôn trẻ trung, năng động, đầy nhiệt huyết và gặt hái nhiều thành công rực rỡ!`;
  if (age < 45) return `Chúc mừng sinh nhật lần thứ ${age}! Chúc đồng chí sự nghiệp không ngừng thăng tiến, gia đình viên mãn và luôn giữ vững phong độ tuyệt vời!`;
  if (age < 60) return `Chúc mừng tuổi ${age}! Chúc đồng chí luôn dồi dào sức khỏe, an nhiên tự tại và tiếp tục là chỗ dựa vững chắc cho tập thể và gia đình!`;
  return `Chúc mừng tuổi ${age}! Kính chúc đồng chí sức khỏe dồi dào, vạn sự như ý, luôn tươi trẻ và hạnh phúc đong đầy!`;
};

export default function BirthdayTab() {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();

  const [activeSubTab, setActiveSubTab] = useState<'tuyen_duong' | 'sinh_nhat'>('sinh_nhat');
  const [members, setMembers] = useState<SheetMember[]>([]);

  // Month & Team Filters for Monthly Celebration
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  // MC Presentation Step:
  // 0: Not started,
  // 1 .. monthList.length: Revealing member in order of day (small to large)
  // monthList.length + 1: Grand Finale (cake cutting & fireworks)
  const [mcStep, setMcStep] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Cakes
  const [isTodayCakeCut, setIsTodayCakeCut] = useState(false);
  const [isMonthCakeCut, setIsMonthCakeCut] = useState(false);

  useEffect(() => {
    const allMembers = DataStore.getMembers();
    setMembers(allMembers);
  }, []);

  // Filter members born today
  const todayBirthdays = useMemo(() => {
    return members.filter(m => {
      if (!m.sinhNhat) return false;
      const parts = String(m.sinhNhat).split('/');
      if (parts.length >= 2) {
        const d = parseInt(parts[0], 10);
        const mnt = parseInt(parts[1], 10);
        return d === currentDay && mnt === currentMonth;
      }
      return false;
    });
  }, [members, currentDay, currentMonth]);

  // Filter members born in selected month, SORTED BY DAY FROM SMALL TO LARGE (ngày nhỏ đến lớn)
  const monthBirthdays = useMemo(() => {
    const list: SheetMember[] = [];
    members.forEach(m => {
      if (m.sinhNhat) {
        const parts = String(m.sinhNhat).split('/');
        if (parts.length >= 2) {
          const d = parseInt(parts[0], 10);
          const mnt = parseInt(parts[1], 10);
          if (mnt === selectedMonth) {
            if (selectedTeam === 'all' || m.team === selectedTeam) {
              list.push(m);
            }
          }
        }
      }
    });

    // Strictly sort by day from small to large (1 -> 31)
    return list.sort((a, b) => {
      const da = parseInt(String(a.sinhNhat).split('/')[0], 10) || 0;
      const db = parseInt(String(b.sinhNhat).split('/')[0], 10) || 0;
      return da - db;
    });
  }, [members, selectedMonth, selectedTeam]);

  // Sync sound
  useEffect(() => {
    soundFX.setEnabled(soundOn);
  }, [soundOn]);

  // Reset MC step on month/team change
  useEffect(() => {
    setMcStep(0);
    setIsAutoPlaying(false);
    setIsMonthCakeCut(false);
  }, [selectedMonth, selectedYear, selectedTeam]);

  // Autoplay timer
  useEffect(() => {
    let timer: any = null;
    if (isAutoPlaying) {
      if (mcStep < monthBirthdays.length + 1) {
        timer = setTimeout(() => {
          advanceMcStep();
        }, 3500);
      } else {
        setIsAutoPlaying(false);
      }
    }
    return () => clearTimeout(timer);
  }, [isAutoPlaying, mcStep, monthBirthdays.length]);

  // Keyboard shortcut for MC (Space or Enter advances the presentation)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeSubTab !== 'sinh_nhat') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        advanceMcStep();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Advance MC presentation to the next member
  const advanceMcStep = () => {
    if (monthBirthdays.length === 0) return;

    if (mcStep >= monthBirthdays.length + 1) {
      // Loop back to start
      setMcStep(0);
      setIsAutoPlaying(false);
      return;
    }

    const nextStep = mcStep + 1;
    setMcStep(nextStep);

    if (nextStep <= monthBirthdays.length) {
      // Reveal a member in order of day
      soundFX.playWhoosh();
      const pitches = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00];
      const pitch = pitches[(nextStep - 1) % pitches.length];
      setTimeout(() => soundFX.playChime(pitch), 180);

      // Fire confetti burst
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x: nextStep % 2 === 0 ? 0.8 : 0.2, y: 0.6 },
        colors: ['#ff0055', '#ff9900', '#ffd700', '#00e5ff', '#a855f7']
      });
    } else {
      // Grand Finale: All members revealed!
      soundFX.playGrandFanfare();
      // Multi-burst fireworks
      const end = Date.now() + 4 * 1000;
      const frame = () => {
        confetti({
          particleCount: 7,
          angle: 60,
          spread: 70,
          origin: { x: 0.05, y: 0.7 },
          colors: ['#ff1493', '#ffd700', '#00f0ff', '#ffffff']
        });
        confetti({
          particleCount: 7,
          angle: 120,
          spread: 70,
          origin: { x: 0.95, y: 0.7 },
          colors: ['#ff1493', '#ffd700', '#76ff03', '#ffffff']
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  };

  const handleMonthCakeClick = () => {
    if (isMonthCakeCut) return;
    setIsMonthCakeCut(true);
    soundFX.playHappyTune();
    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.65 },
      zIndex: 10000,
      colors: ['#ff0055', '#ffd700', '#00e5ff', '#ff69b4', '#ffffff']
    });
  };

  const handleTodayCakeClick = () => {
    if (isTodayCakeCut) return;
    setIsTodayCakeCut(true);
    soundFX.playHappyTune();
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.7 },
      zIndex: 10000
    });
  };

  // Currently active member being commended by MC
  const activeMember = (mcStep >= 1 && mcStep <= monthBirthdays.length) 
    ? monthBirthdays[mcStep - 1] 
    : null;

  const allTeams = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => { if (m.team) set.add(m.team); });
    return Array.from(set).sort();
  }, [members]);

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col p-4 md:p-8 max-w-7xl mx-auto w-full gap-6 overflow-y-auto custom-scrollbar relative">
      {/* Top Header & Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-tr from-amber-500 to-rose-500 rounded-2xl text-white shadow-md shadow-amber-500/20">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">Hoạt Động Công Đoàn</h2>
              <span className="bg-rose-100 text-rose-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-rose-200">
                Đoàn Kết • Thi Đua
              </span>
            </div>
            <p className="text-xs md:text-sm text-slate-500">Tuyên dương cá nhân xuất sắc & Chúc mừng sinh nhật đoàn viên</p>
          </div>
        </div>

        {/* Sub-Tabs Nav Buttons */}
        <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center border border-slate-200/80 self-start sm:self-auto shadow-inner">
          <button
            type="button"
            onClick={() => setActiveSubTab('tuyen_duong')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold transition-all cursor-pointer ${
              activeSubTab === 'tuyen_duong'
                ? 'bg-white text-blue-700 shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            Tuyên Dương Năng Suất
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('sinh_nhat')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-extrabold transition-all cursor-pointer relative ${
              activeSubTab === 'sinh_nhat'
                ? 'bg-white text-rose-600 shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Cake className="w-4 h-4 text-rose-500" />
            Tuyên Dương Sinh Nhật Tháng
            {todayBirthdays.length > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1 right-1" />
            )}
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeSubTab === 'tuyen_duong' ? (
        <TuyenDuongTab onGoToBirthdayMonth={() => setActiveSubTab('sinh_nhat')} />
      ) : (
        <div className="space-y-6">
          {/* Filter Bar for Birthday Month Gala */}
          <div className="bg-white rounded-2xl p-4 md:p-5 shadow-sm border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-rose-50 rounded-xl text-rose-600 border border-rose-200">
                <PartyPopper className="w-5 h-5" />
              </span>
              <div>
                <h3 className="text-base md:text-lg font-black text-slate-900">
                  Sân Khấu Tuyên Dương Sinh Nhật Tháng {selectedMonth}
                </h3>
                <p className="text-xs text-slate-500">
                  Trình dẫn MC xướng tên từng thành viên theo thứ tự ngày sinh từ nhỏ đến lớn
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Select Month */}
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer shadow-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>

              {/* Select Year */}
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer shadow-sm"
              >
                {[currentYear + 1, currentYear, currentYear - 1].map(y => (
                  <option key={y} value={y}>Năm {y}</option>
                ))}
              </select>

              {/* Select Team */}
              <select
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer shadow-sm max-w-[150px]"
              >
                <option value="all">Tất cả các tổ</option>
                {allTeams.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* Sound Toggle */}
              <button
                onClick={() => setSoundOn(!soundOn)}
                className={`p-2 rounded-xl border transition-all cursor-pointer ${
                  soundOn 
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
                title={soundOn ? "Đang bật âm thanh MC" : "Đang tắt âm thanh"}
              >
                {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* MC GALA STAGE CONTROLLER (Trình dẫn MC từng thành viên theo thứ tự ngày nhỏ đến lớn) */}
          <div className="bg-gradient-to-r from-slate-950 via-purple-950 to-slate-950 rounded-3xl p-5 md:p-6 text-white shadow-xl border border-purple-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-1/4 w-96 h-40 bg-pink-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/4 w-96 h-40 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-5">
              {/* MC Speech Box */}
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-rose-500/20 text-white font-black text-xl">
                  🎤
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-pink-300 bg-pink-400/15 px-2 py-0.5 rounded-md border border-pink-400/30">
                      MC Gala Công Đoàn
                    </span>
                    <span className="text-xs text-slate-400">
                      {monthBirthdays.length === 0 && 'Tháng này chưa có đoàn viên có ngày sinh'}
                      {monthBirthdays.length > 0 && mcStep === 0 && 'Sân khấu sẵn sàng • Bấm kích hoạt để bắt đầu xướng tên'}
                      {monthBirthdays.length > 0 && mcStep >= 1 && mcStep <= monthBirthdays.length && (
                        `Đang vinh danh: ${mcStep}/${monthBirthdays.length} (Ngày ${String(activeMember?.sinhNhat).split('/')[0]})`
                      )}
                      {monthBirthdays.length > 0 && mcStep > monthBirthdays.length && 'Đại kết màn: Cắt bánh sinh nhật tập thể!'}
                    </span>
                  </div>
                  <p className="text-base md:text-lg font-medium text-slate-100 leading-relaxed italic font-serif">
                    {monthBirthdays.length === 0 && (
                      `"Trong Tháng ${selectedMonth}, đơn vị không ghi nhận ngày sinh nhật nào. Hãy cùng chờ đón các tháng tiếp theo nhé!"`
                    )}
                    {monthBirthdays.length > 0 && mcStep === 0 && (
                      `"Kính thưa các đồng chí, sau đây xin trân trọng tuyên dương và chúc mừng sinh nhật các đoàn viên trong Tháng ${selectedMonth} theo thứ tự ngày sinh từ đầu tháng đến cuối tháng!"`
                    )}
                    {monthBirthdays.length > 0 && activeMember && (
                      `"Xin nồng nhiệt chúc mừng sinh nhật đồng chí ${activeMember.name} - ${activeMember.team}, sinh ngày ${activeMember.sinhNhat}! Chúc đồng chí tuổi mới luôn tràn đầy năng lượng, hạnh phúc và thành công!"`
                    )}
                    {monthBirthdays.length > 0 && mcStep > monthBirthdays.length && (
                      `"Toàn thể đơn vị xin gửi lời chúc tốt đẹp nhất tới tất cả các đồng chí sinh nhật Tháng ${selectedMonth}! Kính mời các đồng chí cùng bước lên sân khấu cắt bánh sinh nhật tập thể!"`
                    )}
                  </p>
                </div>
              </div>

              {/* MC Actions */}
              {monthBirthdays.length > 0 && (
                <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end flex-wrap">
                  {mcStep > 0 && (
                    <button
                      onClick={() => { setMcStep(0); setIsAutoPlaying(false); }}
                      className="px-3.5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
                      title="Diễn lại từ đầu"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Diễn lại
                    </button>
                  )}

                  {/* Auto-play toggle */}
                  <button
                    onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                    className={`px-3.5 py-3 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                      isAutoPlaying 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/40' 
                        : 'bg-white/10 hover:bg-white/15 text-slate-300 border-white/10'
                    }`}
                    title={isAutoPlaying ? "Dừng tự động" : "Tự động chạy từng người"}
                  >
                    {isAutoPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isAutoPlaying ? 'Tạm dừng' : 'Tự động'}
                  </button>

                  {/* Show all button */}
                  {mcStep < monthBirthdays.length + 1 && (
                    <button
                      onClick={() => setMcStep(monthBirthdays.length + 1)}
                      className="px-3.5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 border border-white/10 cursor-pointer"
                      title="Hiện tất cả thành viên"
                    >
                      <Eye className="w-4 h-4" />
                      Hiện tất cả
                    </button>
                  )}

                  {/* Main trigger button */}
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={advanceMcStep}
                    className={`px-5 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-2xl transition-all cursor-pointer ${
                      mcStep === 0
                        ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 text-white shadow-rose-500/30 ring-4 ring-rose-400/20'
                        : mcStep <= monthBirthdays.length
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-amber-500/40'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
                    }`}
                  >
                    {mcStep === 0 && (
                      <>
                        <Play className="w-4 h-4 fill-current" />
                        Bắt đầu xướng tên (Ngày {String(monthBirthdays[0]?.sinhNhat).split('/')[0]})
                      </>
                    )}
                    {mcStep > 0 && mcStep < monthBirthdays.length && (
                      <>
                        <ChevronRight className="w-5 h-5" />
                        Xướng tên đồng chí tiếp theo (Ngày {String(monthBirthdays[mcStep]?.sinhNhat).split('/')[0]})
                      </>
                    )}
                    {mcStep === monthBirthdays.length && (
                      <>
                        <Cake className="w-5 h-5" />
                        Cắt bánh sinh nhật tập thể!
                      </>
                    )}
                    {mcStep > monthBirthdays.length && (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Bắn pháo hoa chúc mừng
                      </>
                    )}
                  </motion.button>
                </div>
              )}
            </div>

            {/* Presentation Progress */}
            {monthBirthdays.length > 0 && (
              <div className="mt-5 pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-300">Tiến trình thứ tự ngày:</span>
                  <span>
                    {Math.min(mcStep, monthBirthdays.length)} / {monthBirthdays.length} đoàn viên đã được xướng tên
                  </span>
                  <span className="hidden sm:inline text-slate-500">• (Sắp xếp theo thứ tự ngày nhỏ đến lớn: Ngày 1 → 31)</span>
                </div>
                <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1">
                  {monthBirthdays.map((m, idx) => {
                    const d = String(m.sinhNhat).split('/')[0];
                    const isPassed = mcStep >= idx + 1;
                    const isCurrent = mcStep === idx + 1;
                    return (
                      <button
                        key={idx}
                        onClick={() => setMcStep(idx + 1)}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                          isCurrent 
                            ? 'bg-amber-400 text-slate-950 ring-2 ring-amber-300 scale-110' 
                            : isPassed 
                              ? 'bg-pink-500/60 text-white' 
                              : 'bg-white/10 text-slate-400 hover:bg-white/20'
                        }`}
                        title={`Ngày ${d}: ${m.name}`}
                      >
                        N.{d}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* MAIN SPOTLIGHT & MEMBER CARDS */}
          {monthBirthdays.length > 0 ? (
            <div className="space-y-6">
              {/* SPOTLIGHT STAGE FOR ACTIVE ANNOUNCED MEMBER */}
              <AnimatePresence mode="wait">
                {activeMember ? (
                  <motion.div
                    key={`spotlight-${mcStep}`}
                    initial={{ opacity: 0, scale: 0.9, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ type: 'spring', stiffness: 240, damping: 20 }}
                    className="relative bg-gradient-to-br from-rose-600 via-pink-600 to-indigo-700 p-1 rounded-3xl shadow-2xl overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-15" />
                    <div className="bg-slate-950/40 backdrop-blur-md p-6 md:p-8 rounded-[22px] border border-white/20 text-white relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                      
                      {/* Left: Highlight Date Banner */}
                      <div className="flex flex-col items-center justify-center shrink-0">
                        <motion.div 
                          animate={{ rotate: [-2, 2, -2], scale: [1, 1.05, 1] }}
                          transition={{ repeat: Infinity, duration: 3 }}
                          className="w-28 h-28 md:w-32 md:h-32 rounded-3xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 p-1 shadow-[0_0_35px_rgba(251,191,36,0.6)] flex items-center justify-center text-slate-950"
                        >
                          <div className="w-full h-full rounded-2xl bg-gradient-to-b from-amber-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center text-center p-2 border border-amber-300/60">
                            <span className="text-[11px] font-black uppercase tracking-widest text-amber-300">SINH NHẬT</span>
                            <span className="text-2xl md:text-3xl font-black text-amber-200 drop-shadow-md">
                              Ngày {String(activeMember.sinhNhat).split('/')[0]}
                            </span>
                            <span className="text-[10px] font-bold text-amber-300/80">Tháng {selectedMonth}</span>
                          </div>
                        </motion.div>
                      </div>

                      {/* Center: Member Info & Greeting */}
                      <div className="flex-1 text-center md:text-left space-y-2">
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                          <span className="text-xs font-black uppercase tracking-widest bg-white/20 text-white px-3 py-1 rounded-full border border-white/30 shadow-sm">
                            {activeMember.team || 'Tổ Đo xa'}
                          </span>
                          {calculateAge(activeMember.sinhNhat) !== null && (
                            <span className="text-xs font-black bg-amber-400 text-slate-950 px-3 py-1 rounded-full shadow-sm">
                              {calculateAge(activeMember.sinhNhat)} Tuổi
                            </span>
                          )}
                          <span className="text-xs font-medium text-pink-200">
                            Thành viên thứ {mcStep} trong tháng
                          </span>
                        </div>

                        <h3 className="text-3xl md:text-4xl font-black text-white drop-shadow tracking-tight font-serif">
                          {activeMember.name}
                        </h3>

                        <div className="p-3.5 bg-black/30 rounded-2xl border border-white/15 backdrop-blur-sm mt-3">
                          <p className="text-sm md:text-base text-pink-100 italic font-medium leading-relaxed">
                            "{getWishForAge(calculateAge(activeMember.sinhNhat))}"
                          </p>
                        </div>
                      </div>

                      {/* Right: Quick Action Celebration */}
                      <div className="shrink-0 flex flex-col items-center gap-2">
                        <button
                          onClick={() => {
                            soundFX.playHappyTune();
                            confetti({
                              particleCount: 60,
                              spread: 70,
                              origin: { x: 0.8, y: 0.5 }
                            });
                          }}
                          className="px-4 py-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-2 border border-white/30 shadow-md cursor-pointer transition-all"
                          title="Bắn pháo hoa cho đồng chí này"
                        >
                          <PartyPopper className="w-4 h-4 text-amber-300" />
                          Chúc mừng
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : mcStep > monthBirthdays.length ? (
                  /* Finale Celebration Stage with Collective Cake */
                  <motion.div
                    key="finale-stage"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-8 rounded-3xl text-white text-center shadow-2xl border border-purple-400/40 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-60 h-60 bg-pink-500/20 rounded-full blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 max-w-xl mx-auto flex flex-col items-center">
                      <span className="text-xs font-black uppercase tracking-widest text-pink-300 bg-pink-500/20 px-3.5 py-1 rounded-full border border-pink-400/40 mb-4 inline-flex items-center gap-2">
                        <PartyPopper className="w-4 h-4 text-amber-300" />
                        Đại Tiệc Chúc Mừng Sinh Nhật Tháng {selectedMonth}
                      </span>

                      {/* Interactive Cake */}
                      <div 
                        onClick={handleMonthCakeClick}
                        className="relative cursor-pointer group my-4 z-20"
                        title="Bấm để cắt bánh sinh nhật tập thể!"
                      >
                        <AnimatePresence mode="wait">
                          {!isMonthCakeCut ? (
                            <motion.div 
                              key="whole-cake-month"
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              exit={{ scale: 0, opacity: 0, rotate: -90 }}
                              className="w-28 h-28 bg-white/20 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md border border-white/30 group-hover:scale-110 transition-transform mx-auto"
                            >
                              <Cake className="w-14 h-14 text-white drop-shadow-md" />
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
                              key="sliced-cake-month"
                              initial={{ scale: 0, rotate: 45 }}
                              animate={{ scale: 1, rotate: 0 }}
                              className="w-28 h-28 flex items-center justify-center mx-auto"
                            >
                              <span className="text-7xl drop-shadow-2xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">🍰</span>
                            </motion.div>
                          )}
                        </AnimatePresence>
                        <p className="text-xs text-pink-200 mt-2 font-bold group-hover:text-white">
                          {!isMonthCakeCut ? '👉 Bấm vào bánh để cắt bánh tập thể!' : '✨ Đã cắt bánh chúc mừng!'}
                        </p>
                      </div>

                      <h3 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-pink-200 to-white font-serif mb-2">
                        Happy Birthday Tháng {selectedMonth}!
                      </h3>
                      <p className="text-sm text-pink-100 leading-relaxed mb-4">
                        Kính chúc toàn thể {monthBirthdays.length} đồng chí có ngày sinh trong Tháng {selectedMonth} luôn dồi dào sức khỏe, tràn đầy niềm vui, gia đình hạnh phúc và gặt hái nhiều thắng lợi mới!
                      </p>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* LIST OF MEMBERS IN THE MONTH (ORDERED FROM SMALL DAY TO LARGE DAY) */}
              <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-slate-100">
                  <div>
                    <h4 className="text-base md:text-lg font-black text-slate-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-rose-500" />
                      Danh Sách Đoàn Viên Sinh Nhật Tháng {selectedMonth}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Sắp xếp theo thứ tự ngày sinh nhỏ đến lớn ({monthBirthdays.length} thành viên)
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> Đang chọn
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block ml-2" /> Đã xướng tên
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {monthBirthdays.map((m, idx) => {
                    const d = String(m.sinhNhat).split('/')[0];
                    const age = calculateAge(m.sinhNhat);
                    const isCurrent = mcStep === idx + 1;
                    const isRevealed = mcStep >= idx + 1;

                    return (
                      <motion.div
                        key={idx}
                        onClick={() => setMcStep(idx + 1)}
                        whileHover={{ scale: 1.02 }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[140px] ${
                          isCurrent
                            ? 'bg-gradient-to-br from-amber-50 to-rose-50 border-amber-400 shadow-md ring-2 ring-amber-400/40'
                            : isRevealed
                              ? 'bg-slate-50/80 border-slate-200 hover:border-rose-300'
                              : 'bg-slate-50/40 border-slate-200/70 opacity-60 hover:opacity-100'
                        }`}
                      >
                        {/* Top: Date & Team */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-black shadow-sm ${
                              isCurrent 
                                ? 'bg-amber-400 text-slate-950' 
                                : isRevealed 
                                  ? 'bg-rose-500 text-white' 
                                  : 'bg-slate-200 text-slate-700'
                            }`}>
                              Ngày {d}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 uppercase">
                              {m.team || 'Tổ Đo xa'}
                            </span>
                          </div>

                          {age !== null && (
                            <span className="text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                              {age} tuổi
                            </span>
                          )}
                        </div>

                        {/* Middle: Name */}
                        <div>
                          <h5 className="text-lg font-black text-slate-900 leading-snug">
                            {m.name}
                          </h5>
                          <p className="text-xs text-slate-500 mt-0.5">
                            Sinh ngày: <span className="font-semibold text-slate-700">{m.sinhNhat}</span>
                          </p>
                        </div>

                        {/* Bottom: Status & Wish preview */}
                        <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-[11px]">
                          <span className="text-slate-500 italic line-clamp-1">
                            "{getWishForAge(age)}"
                          </span>
                          {isRevealed && (
                            <span className="text-emerald-600 font-bold shrink-0 ml-2">✓ Đã vinh danh</span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-3xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center h-full min-h-[350px]">
              <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8" />
              </div>
              <h4 className="text-lg font-bold text-slate-800 mb-1">Tháng {selectedMonth} không có ngày sinh nhật nào</h4>
              <p className="text-slate-500 text-sm max-w-md">
                Hãy chọn tháng khác từ danh sách thả xuống ở thanh công cụ phía trên để xem và trình diễn vinh danh nhé!
              </p>
            </div>
          )}

          {/* TODAY'S BIRTHDAYS (If any) */}
          {todayBirthdays.length > 0 && (
            <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600 p-1 rounded-3xl shadow-xl overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20" />
              <div className="bg-white/10 backdrop-blur-sm p-6 md:p-8 rounded-[22px] flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 border border-white/20">
                <div className="flex items-center gap-4">
                  <div 
                    onClick={handleTodayCakeClick}
                    className="cursor-pointer group"
                    title="Bấm để cắt bánh hôm nay!"
                  >
                    {!isTodayCakeCut ? (
                      <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center border border-white/30 text-white shadow-lg group-hover:scale-110 transition-transform">
                        <Cake className="w-8 h-8" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 flex items-center justify-center text-4xl">
                        🍰
                      </div>
                    )}
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full text-pink-100">
                      Đặc Biệt Hôm Nay
                    </span>
                    <h4 className="text-xl md:text-2xl font-black text-white mt-1 font-serif">
                      Sinh Nhật Hôm Nay (Ngày {currentDay}/{currentMonth})
                    </h4>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {todayBirthdays.map((m, idx) => (
                    <div key={idx} className="bg-white/20 px-4 py-2 rounded-xl backdrop-blur-md border border-white/30 text-white">
                      <span className="font-black text-sm block">{m.name}</span>
                      <span className="text-xs text-pink-100">{m.team}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* AUDIO PLAYER & GALA MUSIC */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-5 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-200 text-amber-800 flex items-center justify-center shrink-0">
                <Music className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-amber-900 text-sm">Giai Điệu Chúc Mừng Sinh Nhật (Happy Birthday Audio)</h5>
                <p className="text-xs text-amber-700">Phát nhạc nền lễ kỷ niệm và cắt bánh</p>
              </div>
            </div>
            <audio 
              controls 
              className="h-9 rounded-full max-w-[240px] w-full"
              src="https://github.com/BaseMax/happy-birth-letter/raw/main/happy-birthday.mp3"
            >
              Trình duyệt của bạn không hỗ trợ thẻ audio.
            </audio>
          </div>
        </div>
      )}
    </div>
  );
}
