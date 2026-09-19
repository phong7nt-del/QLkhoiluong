import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DataStore, SheetMember } from '../store/DataStore';
import { 
  Gift, Cake, Sparkles, Calendar, Music, PartyPopper, Trophy, Award,
  ChevronRight, Play, Pause, RotateCcw, Volume2, VolumeX, Eye, Flame,
  Maximize2, Minimize2, CheckCircle2, Clock, Lock, Shield, Send
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
  if (age < 30) return `Chúc mừng sinh nhật tuổi ${age}! Chúc đồng chí luôn trẻ trung, năng động, nhiệt huyết và gặt hái nhiều thành công!`;
  if (age < 45) return `Chúc mừng sinh nhật tuổi ${age}! Chúc đồng chí sự nghiệp không ngừng thăng tiến, gia đình viên mãn và luôn giữ vững phong độ xuất sắc!`;
  if (age < 60) return `Chúc mừng sinh nhật tuổi ${age}! Chúc đồng chí luôn dồi dào sức khỏe, an nhiên tự tại và là chỗ dựa vững chắc cho tập thể!`;
  return `Chúc mừng tuổi ${age}! Kính chúc đồng chí dồi dào sức khỏe, vạn sự như ý, luôn tươi trẻ và ngập tràn niềm vui!`;
};

interface BirthdayTabProps {
  sessionUser?: SheetMember | null;
}

export default function BirthdayTab({ sessionUser }: BirthdayTabProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  const currentDay = new Date().getDate();

  const [activeSubTab, setActiveSubTab] = useState<'tuyen_duong' | 'sinh_nhat'>('sinh_nhat');
  const [members, setMembers] = useState<SheetMember[]>([]);

  // Month & Team Filters for Monthly Celebration
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');

  // Effective session user with fallback to sessionStorage
  const effectiveSessionUser = useMemo(() => {
    if (sessionUser && (sessionUser.name || sessionUser.role)) return sessionUser;
    try {
      const stored = sessionStorage.getItem('workload_user_session');
      if (stored) return JSON.parse(stored);
    } catch {}
    return sessionUser || null;
  }, [sessionUser]);

  // Leadership & Publication states
  const isLeader = useMemo(() => {
    return DataStore.isUserDoiTruongOrCongDoanLeader(effectiveSessionUser);
  }, [effectiveSessionUser]);

  const [publishVersion, setPublishVersion] = useState(0);
  const isPublished = useMemo(() => {
    return DataStore.isCongDoanPublished('sinh_nhat', selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth, publishVersion]);

  const handleTogglePublish = () => {
    if (!isLeader) return;
    const nextState = !isPublished;
    DataStore.setCongDoanPublished('sinh_nhat', selectedYear, selectedMonth, nextState);
    setPublishVersion(v => v + 1);
    if (nextState) {
      soundFX.fanfare();
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    }
  };

  // Fullscreen / Projector Mode
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeMemberCardRef = useRef<HTMLDivElement>(null);

  // MC Presentation Step:
  // 0: Not started,
  // 1 .. monthList.length: Revealing member in order of day (small to large)
  // monthList.length + 1: Grand Finale (cake cutting & fireworks)
  const [mcStep, setMcStep] = useState<number>(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState<boolean>(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Cakes
  const [isMonthCakeCut, setIsMonthCakeCut] = useState(false);

  useEffect(() => {
    const allMembers = DataStore.getMembers();
    setMembers(allMembers);
  }, []);

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

  // Keyboard shortcut for MC (Space / Enter advances, F toggles fullscreen, Esc exits)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeSubTab !== 'sinh_nhat') return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        advanceMcStep();
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
        setIsFullscreen(prev => !prev);
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Scroll active item into view in list
  useEffect(() => {
    if (activeMemberCardRef.current) {
      activeMemberCardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [mcStep]);

  // Advance MC presentation to the next member
  const advanceMcStep = () => {
    if (monthBirthdays.length === 0) return;

    if (mcStep >= monthBirthdays.length + 1) {
      setMcStep(0);
      setIsAutoPlaying(false);
      return;
    }

    const nextStep = mcStep + 1;
    setMcStep(nextStep);

    if (nextStep <= monthBirthdays.length) {
      soundFX.playWhoosh();
      const pitches = [523.25, 587.33, 659.25, 698.46, 783.99, 880.00];
      const pitch = pitches[(nextStep - 1) % pitches.length];
      setTimeout(() => soundFX.playChime(pitch), 180);

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x: nextStep % 2 === 0 ? 0.75 : 0.25, y: 0.6 },
        colors: ['#ff0055', '#ff9900', '#ffd700', '#00e5ff', '#a855f7']
      });
    } else {
      soundFX.playGrandFanfare();
      const end = Date.now() + 3.5 * 1000;
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

  const activeMember = (mcStep >= 1 && mcStep <= monthBirthdays.length) 
    ? monthBirthdays[mcStep - 1] 
    : null;

  const allTeams = useMemo(() => {
    const set = new Set<string>();
    members.forEach(m => { if (m.team) set.add(m.team); });
    return Array.from(set).sort();
  }, [members]);

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col gap-3 w-full mx-auto transition-all ${
        isFullscreen 
          ? 'fixed inset-0 z-50 bg-slate-950 p-4 md:p-6 h-screen w-screen overflow-hidden justify-between' 
          : 'max-w-7xl pb-4'
      }`}
    >
      {/* Top Header & Sub-Tab Switcher */}
      <div className={`bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 transition-all ${
        isFullscreen ? 'bg-slate-900/90 border-slate-700 text-white backdrop-blur-md' : ''
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-gradient-to-tr from-amber-500 to-rose-500 rounded-xl text-white shadow-sm">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-base md:text-lg font-black tracking-tight ${isFullscreen ? 'text-white' : 'text-slate-900'}`}>
                Hoạt Động Công Đoàn
              </h2>
              <span className="bg-rose-100 text-rose-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-rose-200">
                Gala Vinh Danh
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Switcher & Fullscreen Button */}
        <div className="flex items-center gap-2">
          {!isFullscreen && (
            <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200/80 shadow-inner">
              <button
                type="button"
                onClick={() => setActiveSubTab('tuyen_duong')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  activeSubTab === 'tuyen_duong'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-500" />
                Tuyên Dương Năng Suất
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('sinh_nhat')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                  activeSubTab === 'sinh_nhat'
                    ? 'bg-white text-rose-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Cake className="w-3.5 h-3.5 text-rose-500" />
                Sinh Nhật Tháng
              </button>
            </div>
          )}

          {/* Fullscreen / Projector Mode Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
              isFullscreen 
                ? 'bg-rose-500 text-white border-rose-400 ring-2 ring-rose-400' 
                : 'bg-slate-800 hover:bg-slate-900 text-white border-slate-700'
            }`}
            title="Bật chế độ trình chiếu vừa vặn toàn màn hình cho TV / Máy chiếu"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Thu Nhỏ' : 'Trình Chiếu'}</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeSubTab === 'tuyen_duong' ? (
        <TuyenDuongTab 
          onGoToBirthdayMonth={() => setActiveSubTab('sinh_nhat')} 
          sessionUser={effectiveSessionUser}
        />
      ) : (!isLeader && !isPublished) ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-12 text-center my-6 max-w-xl mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-600 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-wider text-slate-800 mb-2">
            Chưa Có Nội Dung Công Bố
          </h3>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-4 max-w-md">
            Nội dung Chúc mừng Sinh nhật Tháng {selectedMonth}/{selectedYear} đang được chuẩn bị và chưa được công bố cho toàn thể đơn vị.
          </p>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span>Chỉ Đội trưởng và Tổ trưởng Công đoàn mới có quyền công bố</span>
          </div>
        </div>
      ) : (
        <div className="space-y-3 flex-1 flex flex-col justify-between min-h-0">
          
          {/* COMPACT TOOLBAR & FILTERS */}
          <div className={`bg-white rounded-2xl px-4 py-2 shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 transition-all ${
            isFullscreen ? 'bg-slate-900/90 border-slate-700 text-white' : ''
          }`}>
            <div className="flex items-center gap-2">
              <span className="p-1 bg-rose-50 rounded-lg text-rose-600 border border-rose-200">
                <PartyPopper className="w-4 h-4" />
              </span>
              <span className={`text-xs md:text-sm font-bold ${isFullscreen ? 'text-white' : 'text-slate-900'}`}>
                Sinh Nhật Tháng {selectedMonth}/{selectedYear}
              </span>
              <span className="text-[10px] text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md font-extrabold border border-rose-200">
                {monthBirthdays.length} Đoàn Viên
              </span>
              {isLeader && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  👑 Quyền Công Bố
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Leader Publish / Unpublish Toggle */}
              {isLeader ? (
                <button
                  onClick={handleTogglePublish}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm cursor-pointer ${
                    isPublished
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 shadow-emerald-600/30'
                      : 'bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white shadow-rose-500/30 ring-2 ring-rose-300'
                  }`}
                  title={isPublished ? "Bấm để thu hồi công bố (chuyển về bản nháp riêng tư)" : "Bấm để công bố chính thức cho toàn thể đoàn viên xem"}
                >
                  {isPublished ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Đã Công Bố (Thu Hồi)</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Công Bố Cho Toàn Đơn Vị</span>
                    </>
                  )}
                </button>
              ) : (
                isPublished && (
                  <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã công bố chính thức
                  </span>
                )
              )}

              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer shadow-sm"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={e => setSelectedYear(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer shadow-sm"
              >
                {[currentYear + 1, currentYear, currentYear - 1].map(y => (
                  <option key={y} value={y}>Năm {y}</option>
                ))}
              </select>

              <select
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500 cursor-pointer shadow-sm max-w-[130px]"
              >
                <option value="all">Tất cả các tổ</option>
                {allTeams.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <button
                onClick={() => setSoundOn(!soundOn)}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                  soundOn 
                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' 
                    : 'bg-slate-100 text-slate-400 border-slate-200'
                }`}
                title={soundOn ? "Đang bật âm thanh MC" : "Đang tắt âm thanh"}
              >
                {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* COMPACT MC DIALOGUE & CONTROL BAR */}
          <div className="bg-gradient-to-r from-slate-950 via-purple-950 to-slate-950 rounded-2xl px-4 py-2.5 text-white shadow-md border border-purple-500/20 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 flex items-center justify-center shrink-0 shadow-md text-white font-black text-sm">
                🎤
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-pink-300 bg-pink-400/15 px-2 py-0.2 rounded border border-pink-400/30">
                    MC Gala
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    {monthBirthdays.length === 0 && 'Tháng này chưa có đoàn viên'}
                    {monthBirthdays.length > 0 && mcStep === 0 && (
                      isLeader ? 'Sân khấu sẵn sàng • Bấm công bố để xướng tên' : 'Chương trình sinh nhật Tháng'
                    )}
                    {monthBirthdays.length > 0 && mcStep >= 1 && mcStep <= monthBirthdays.length && (
                      `Đang xướng tên: ${mcStep}/${monthBirthdays.length} (Ngày ${String(activeMember?.sinhNhat).split('/')[0]})`
                    )}
                    {monthBirthdays.length > 0 && mcStep > monthBirthdays.length && 'Đại kết màn: Cắt bánh sinh nhật tập thể!'}
                  </span>
                </div>
                <p className="text-xs md:text-sm font-medium text-slate-100 truncate italic font-serif">
                  {monthBirthdays.length === 0 && (
                    `"Trong Tháng ${selectedMonth}, đơn vị không ghi nhận ngày sinh nào. Hãy cùng chờ đón các tháng tiếp theo nhé!"`
                  )}
                  {monthBirthdays.length > 0 && mcStep === 0 && (
                    `"Kính thưa các đồng chí, xin trân trọng tuyên dương các đoàn viên sinh nhật Tháng ${selectedMonth} theo thứ tự ngày sinh từ nhỏ đến lớn!"`
                  )}
                  {monthBirthdays.length > 0 && activeMember && (
                    `"Nồng nhiệt chúc mừng đồng chí ${activeMember.name} (${activeMember.team}) sinh ngày ${activeMember.sinhNhat}! Chúc đồng chí tuổi mới luôn tràn đầy niềm vui và sức khỏe!"`
                  )}
                  {monthBirthdays.length > 0 && mcStep > monthBirthdays.length && (
                    `"Nhiệt liệt chúc mừng tất cả các đồng chí sinh nhật Tháng ${selectedMonth}! Kính mời các đồng chí cùng tiến lên sân khấu cắt bánh tập thể!"`
                  )}
                </p>
              </div>
            </div>

            {/* MC Buttons - Exclusive to Leaders */}
            {isLeader ? (
              monthBirthdays.length > 0 && (
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  {mcStep > 0 && (
                    <button
                      onClick={() => { setMcStep(0); setIsAutoPlaying(false); }}
                      className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1 border border-white/10 cursor-pointer"
                      title="Diễn lại từ đầu"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Diễn lại</span>
                    </button>
                  )}

                  <button
                    onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                    className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border cursor-pointer ${
                      isAutoPlaying 
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/40' 
                        : 'bg-white/10 hover:bg-white/15 text-slate-300 border-white/10'
                    }`}
                    title={isAutoPlaying ? "Dừng tự động" : "Tự động chạy từng người (3.5s)"}
                  >
                    {isAutoPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">{isAutoPlaying ? 'Tạm dừng' : 'Tự động'}</span>
                  </button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={advanceMcStep}
                    className={`px-3.5 py-1.5 rounded-xl font-black text-xs md:text-sm flex items-center justify-center gap-1.5 shadow-lg transition-all cursor-pointer ${
                      mcStep === 0
                        ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 text-white shadow-rose-500/30 ring-2 ring-rose-400/20'
                        : mcStep <= monthBirthdays.length
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-amber-500/40'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
                    }`}
                  >
                    {mcStep === 0 && (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Công bố ngày {String(monthBirthdays[0]?.sinhNhat).split('/')[0]}
                      </>
                    )}
                    {mcStep > 0 && mcStep < monthBirthdays.length && (
                      <>
                        <ChevronRight className="w-4 h-4" />
                        Ngày {String(monthBirthdays[mcStep]?.sinhNhat).split('/')[0]} tiếp theo
                      </>
                    )}
                    {mcStep === monthBirthdays.length && (
                      <>
                        <Cake className="w-4 h-4" />
                        Cắt bánh tập thể
                      </>
                    )}
                    {mcStep > monthBirthdays.length && (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Bắn Pháo Hoa!
                      </>
                    )}
                  </motion.button>
                </div>
              )
            ) : (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Chương trình đã công bố chính thức</span>
              </div>
            )}
          </div>

          {/* TWO-COLUMN FIT SCREEN COCKPIT (Left: Spotlight Stage, Right: Member Queue by Day) */}
          {monthBirthdays.length > 0 ? (
            <div className={`grid grid-cols-1 lg:grid-cols-12 gap-3 flex-1 min-h-0 ${
              isFullscreen ? 'h-[calc(100vh-170px)]' : 'h-[calc(100vh-210px)] min-h-[460px] max-h-[620px]'
            }`}>
              
              {/* LEFT: SPOTLIGHT STAGE (COL-SPAN-7 OR 8) */}
              <div className="lg:col-span-7 xl:col-span-8 flex flex-col min-h-0">
                <AnimatePresence mode="wait">
                  {activeMember ? (
                    <motion.div
                      key={`spotlight-${mcStep}`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 240, damping: 20 }}
                      className="relative bg-gradient-to-br from-rose-600 via-pink-600 to-indigo-700 p-0.5 rounded-2xl shadow-xl overflow-hidden flex-1 flex flex-col justify-between"
                    >
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-15" />
                      
                      <div className="bg-slate-950/40 backdrop-blur-md p-5 md:p-7 rounded-[14px] border border-white/20 text-white relative z-10 flex-1 flex flex-col justify-between">
                        {/* Top: Header Banner & Quick Action */}
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 text-white px-2.5 py-0.5 rounded-full border border-white/30">
                              {activeMember.team || 'Tổ Đo xa'}
                            </span>
                            <span className="text-[10px] font-bold text-pink-200">
                              Số thứ tự {mcStep}/{monthBirthdays.length}
                            </span>
                          </div>

                          <button
                            onClick={() => {
                              soundFX.playHappyTune();
                              confetti({
                                particleCount: 60,
                                spread: 70,
                                origin: { x: 0.5, y: 0.6 }
                              });
                            }}
                            className="px-3 py-1 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs flex items-center gap-1.5 border border-white/30 shadow-sm cursor-pointer transition-all"
                            title="Bắn pháo hoa cho đồng chí này"
                          >
                            <PartyPopper className="w-3.5 h-3.5 text-amber-300" />
                            Pháo hoa
                          </button>
                        </div>

                        {/* Middle: Shining Date & Name */}
                        <div className="flex flex-col md:flex-row items-center gap-5 my-auto py-2">
                          {/* Large Date Badge */}
                          <motion.div 
                            animate={{ rotate: [-1, 1, -1], scale: [1, 1.03, 1] }}
                            transition={{ repeat: Infinity, duration: 3 }}
                            className="w-24 h-24 md:w-28 md:h-28 rounded-2xl bg-gradient-to-tr from-amber-400 via-yellow-300 to-amber-500 p-1 shadow-[0_0_25px_rgba(251,191,36,0.6)] flex items-center justify-center text-slate-950 shrink-0"
                          >
                            <div className="w-full h-full rounded-[12px] bg-gradient-to-b from-amber-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center text-center p-1.5 border border-amber-300/60">
                              <span className="text-[9px] font-black uppercase tracking-widest text-amber-300">SINH NHẬT</span>
                              <span className="text-xl md:text-2xl font-black text-amber-200 drop-shadow">
                                Ngày {String(activeMember.sinhNhat).split('/')[0]}
                              </span>
                              <span className="text-[9px] font-bold text-amber-300/80">Tháng {selectedMonth}</span>
                            </div>
                          </motion.div>

                          {/* Member Name and Age */}
                          <div className="text-center md:text-left flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-1">
                              {calculateAge(activeMember.sinhNhat) !== null && (
                                <span className="text-[11px] font-black bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full shadow-sm">
                                  {calculateAge(activeMember.sinhNhat)} Tuổi
                                </span>
                              )}
                              <span className="text-xs text-pink-200 font-semibold">
                                Ngày sinh: {activeMember.sinhNhat}
                              </span>
                            </div>

                            <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-white drop-shadow tracking-tight font-serif truncate">
                              {activeMember.name}
                            </h3>
                          </div>
                        </div>

                        {/* Bottom: Warm Union Wish */}
                        <div className="p-3 bg-black/30 rounded-xl border border-white/15 backdrop-blur-sm mt-2">
                          <p className="text-xs md:text-sm text-pink-100 italic font-medium leading-relaxed">
                            "{getWishForAge(calculateAge(activeMember.sinhNhat))}"
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ) : mcStep > monthBirthdays.length ? (
                    /* Finale Collective Cake Cutting */
                    <motion.div
                      key="finale-stage"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-6 rounded-2xl text-white text-center shadow-xl border border-purple-400/40 relative overflow-hidden flex-1 flex flex-col items-center justify-center"
                    >
                      <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-pink-300 bg-pink-500/20 px-3 py-0.5 rounded-full border border-pink-400/40 mb-2 inline-flex items-center gap-1.5">
                          <PartyPopper className="w-3.5 h-3.5 text-amber-300" />
                          Đại Tiệc Sinh Nhật Tháng {selectedMonth}
                        </span>

                        {/* Interactive Cake */}
                        <div 
                          onClick={handleMonthCakeClick}
                          className="relative cursor-pointer group my-2 z-20"
                          title="Bấm để cắt bánh sinh nhật tập thể!"
                        >
                          <AnimatePresence mode="wait">
                            {!isMonthCakeCut ? (
                              <motion.div 
                                key="whole-cake-month"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center shadow-xl backdrop-blur-md border border-white/30 group-hover:scale-110 transition-transform mx-auto"
                              >
                                <Cake className="w-10 h-10 text-white drop-shadow-md" />
                              </motion.div>
                            ) : (
                              <motion.div 
                                key="sliced-cake-month"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-20 h-20 flex items-center justify-center mx-auto"
                              >
                                <span className="text-5xl drop-shadow-xl">🍰</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <p className="text-[11px] text-pink-200 mt-1 font-bold group-hover:text-white">
                            {!isMonthCakeCut ? '👉 Bấm vào bánh để cắt bánh tập thể!' : '✨ Đã cắt bánh chúc mừng!'}
                          </p>
                        </div>

                        <h3 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-pink-200 to-white font-serif mb-1">
                          Happy Birthday Tháng {selectedMonth}!
                        </h3>
                        <p className="text-xs text-pink-100 leading-relaxed max-w-md">
                          Kính chúc toàn thể {monthBirthdays.length} đồng chí tuổi mới luôn tràn đầy năng lượng, dồi dào sức khỏe, gia đình hạnh phúc và gặt hái nhiều thắng lợi mới!
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    /* Initial Welcome Stage */
                    <div className="bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 rounded-2xl p-6 text-white text-center shadow-xl border border-slate-800 flex-1 flex flex-col items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mb-3 border border-rose-400/30">
                        <Cake className="w-8 h-8" />
                      </div>
                      <h4 className="text-lg md:text-xl font-black mb-1">
                        Sân Khấu Chúc Mừng Sinh Nhật Tháng {selectedMonth}
                      </h4>
                      <p className="text-xs text-slate-400 max-w-md mb-4">
                        Bấm nút <span className="text-rose-400 font-bold">"Công bố"</span> hoặc phím <span className="text-amber-400 font-bold">Cách (Space)</span> để MC xướng tên từng đoàn viên theo thứ tự ngày sinh từ nhỏ đến lớn!
                      </p>
                      <button
                        onClick={advanceMcStep}
                        className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        Bắt đầu xướng tên
                      </button>
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* RIGHT: ORDERED MEMBER QUEUE BY DAY (COL-SPAN-5 OR 4) */}
              <div className="lg:col-span-5 xl:col-span-4 bg-white rounded-2xl p-3 shadow-sm border border-slate-200/80 flex flex-col min-h-0">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-rose-500" />
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Thứ Tự Ngày Sinh (1 → 31)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">
                    {Math.min(mcStep, monthBirthdays.length)}/{monthBirthdays.length}
                  </span>
                </div>

                {/* Scrollable member list */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar min-h-0">
                  {monthBirthdays.map((m, idx) => {
                    const d = String(m.sinhNhat).split('/')[0];
                    const age = calculateAge(m.sinhNhat);
                    const isCurrent = mcStep === idx + 1;
                    const isRevealed = mcStep >= idx + 1;

                    return (
                      <div
                        key={idx}
                        ref={isCurrent ? activeMemberCardRef : null}
                        onClick={() => setMcStep(idx + 1)}
                        className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2.5 text-left ${
                          isCurrent
                            ? 'bg-gradient-to-r from-amber-50 via-rose-50 to-amber-50 border-amber-400 shadow-md ring-2 ring-amber-400/40'
                            : isRevealed
                              ? 'bg-slate-50/90 border-slate-200 hover:border-rose-300'
                              : 'bg-white border-slate-200/60 opacity-60 hover:opacity-100'
                        }`}
                      >
                        {/* Day badge */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`px-2 py-0.5 rounded-lg text-xs font-black shrink-0 ${
                            isCurrent 
                              ? 'bg-amber-400 text-slate-950' 
                              : isRevealed 
                                ? 'bg-rose-500 text-white' 
                                : 'bg-slate-200 text-slate-700'
                          }`}>
                            N.{d}
                          </span>

                          <div className="min-w-0">
                            <h5 className="text-xs font-black text-slate-900 truncate">
                              {m.name}
                            </h5>
                            <p className="text-[10px] text-slate-500 truncate">
                              {m.team} • {m.sinhNhat}
                            </p>
                          </div>
                        </div>

                        {/* Status / Age */}
                        <div className="shrink-0 flex items-center gap-1">
                          {age !== null && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">
                              {age}t
                            </span>
                          )}
                          {isCurrent ? (
                            <span className="text-[10px] font-bold text-amber-600 animate-pulse">
                              Đang xướng
                            </span>
                          ) : isRevealed ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center justify-center text-center flex-1">
              <Calendar className="w-10 h-10 text-rose-400 mb-2" />
              <h4 className="text-base font-bold text-slate-800">Tháng {selectedMonth} không có ngày sinh nào</h4>
              <p className="text-slate-500 text-xs mt-1">
                Hãy chọn tháng khác từ danh sách phía trên để xem và trình chiếu nhé!
              </p>
            </div>
          )}

          {/* AUDIO PLAYER - COMPACT SLIM BAR */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-4 py-2 rounded-xl border border-amber-200/80 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-amber-700 shrink-0" />
              <span className="font-bold text-amber-900 hidden sm:inline">Nhạc Nền Happy Birthday:</span>
            </div>
            <audio 
              controls 
              className="h-7 rounded-full max-w-[220px] w-full"
              src="https://github.com/BaseMax/happy-birth-letter/raw/main/happy-birthday.mp3"
            >
              Trình duyệt không hỗ trợ thẻ audio.
            </audio>
          </div>
        </div>
      )}
    </div>
  );
}
