import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DataStore, SheetMember } from '../store/DataStore';
import { 
  Gift, Cake, Sparkles, Calendar, Music, PartyPopper, Trophy, Award,
  ChevronRight, ChevronLeft, Play, Pause, RotateCcw, Volume2, VolumeX, Eye, Flame,
  Maximize2, Minimize2, CheckCircle2, Clock, Lock, Shield, Send, Image as ImageIcon
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import TuyenDuongTab from './TuyenDuongTab';
import { soundFX } from '../utils/soundFX';
import { getSeasonalNatureTheme } from '../utils/seasonalNature';

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

  // Seasonal nature scenery variant offset (cycles through nature scenes)
  const [scenicBgOffset, setScenicBgOffset] = useState<number>(0);

  // Reset MC step and scenic offset on month/team change
  useEffect(() => {
    setMcStep(0);
    setIsAutoPlaying(false);
    setIsMonthCakeCut(false);
    setScenicBgOffset(0);
  }, [selectedMonth, selectedYear, selectedTeam]);

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

  // Compute seasonal nature theme for selected month and active member
  const currentNatureTheme = useMemo(() => {
    // When mcStep is active, each member gets a variant based on their index + manual offset
    const variantOffset = mcStep >= 1 ? (mcStep - 1 + scenicBgOffset) : scenicBgOffset;
    return getSeasonalNatureTheme(selectedMonth, variantOffset);
  }, [selectedMonth, mcStep, scenicBgOffset]);

  const welcomeNatureTheme = useMemo(() => {
    return getSeasonalNatureTheme(selectedMonth, scenicBgOffset);
  }, [selectedMonth, scenicBgOffset]);

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

  // Keyboard shortcut for MC (Space / Enter / Right arrow advances, Left arrow goes back, F toggles fullscreen, Esc exits)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeSubTab !== 'sinh_nhat') return;
      if (e.code === 'Space' || e.code === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        advanceMcStep();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevMcStep();
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

  // Go back to previous member in MC presentation
  const prevMcStep = () => {
    if (monthBirthdays.length === 0) return;
    setMcStep(prev => Math.max(0, prev - 1));
  };

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

  const renderStageCard = (inFullscreen: boolean) => {
    if (activeMember) {
      return (
        <motion.div
          key={`spotlight-${mcStep}-${currentNatureTheme.imageIndex}`}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          className={`relative rounded-3xl shadow-2xl overflow-hidden flex flex-col justify-between border-2 border-white/90 ${
            inFullscreen ? 'w-full max-w-5xl h-[calc(100vh-140px)] min-h-[460px]' : 'w-full flex-1 min-h-[440px]'
          }`}
        >
          {/* High-Definition Seasonal Nature Background with gentle zoom */}
          <motion.div 
            key={`bg-img-${currentNatureTheme.activeImage.url}`}
            initial={{ scale: 1.08, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.85, ease: 'easeOut' }}
            className="absolute inset-0 bg-cover bg-center transition-transform"
            style={{ backgroundImage: `url("${currentNatureTheme.activeImage.url}")` }}
          />

          {/* Bright, radiant, joyful nature overlays */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-white/45 to-white/75 backdrop-blur-[1px]" />
          <div className={`absolute inset-0 bg-gradient-to-tr ${currentNatureTheme.accentGlow} mix-blend-soft-light opacity-60`} />
          
          {/* Scenery Caption at bottom right */}
          <div className="absolute bottom-3 right-4 z-10 pointer-events-none">
            <span className="text-[11px] text-slate-800 font-bold drop-shadow-xs bg-white/90 px-3 py-1 rounded-full border border-white/90 backdrop-blur-md shadow-xs flex items-center gap-1.5">
              <span>{currentNatureTheme.seasonIcon}</span>
              <span>{currentNatureTheme.activeImage.caption}</span>
            </span>
          </div>

          {/* Content Card with Glassmorphic Celebratory Transparency */}
          <div className={`p-5 md:p-8 rounded-3xl text-slate-900 relative z-10 flex-1 flex flex-col justify-between ${
            inFullscreen ? 'md:p-10' : ''
          }`}>
            {/* Top: Header Banner, Seasonal Tag & Quick Actions */}
            <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider bg-white/95 text-rose-700 px-3 py-1 rounded-full border border-rose-200 shadow-sm backdrop-blur-md">
                  {activeMember.team || 'Tổ Đo xa'}
                </span>
                <span className={`text-xs font-extrabold px-3 py-1 rounded-full border backdrop-blur-md flex items-center gap-1.5 shadow-sm bg-white/95 ${currentNatureTheme.badgeBg} ${currentNatureTheme.badgeBorder}`}>
                  <span>{currentNatureTheme.seasonIcon}</span>
                  <span>{currentNatureTheme.seasonTitle} • {currentNatureTheme.themeName}</span>
                </span>
                <span className="text-xs font-black text-amber-950 bg-amber-200/90 border border-amber-300 px-3 py-1 rounded-full shadow-sm">
                  Thứ tự {mcStep}/{monthBirthdays.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setScenicBgOffset(prev => prev + 1)}
                  className="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-emerald-800 text-xs font-extrabold flex items-center gap-1.5 border border-emerald-300 shadow-sm cursor-pointer transition-all backdrop-blur-sm"
                  title="Đổi cảnh sắc thiên nhiên theo mùa"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Đổi cảnh sắc</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFX.playHappyTune();
                    confetti({
                      particleCount: 70,
                      spread: 80,
                      origin: { x: 0.5, y: 0.6 }
                    });
                  }}
                  className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white font-extrabold text-xs flex items-center gap-1.5 border border-white/60 shadow-md cursor-pointer transition-all"
                  title="Bắn pháo hoa chúc mừng"
                >
                  <PartyPopper className="w-4 h-4 text-amber-200" />
                  Pháo hoa
                </button>
              </div>
            </div>

            {/* Middle: Shining Golden Date & Member Name */}
            <div className="flex flex-col md:flex-row items-center gap-6 md:gap-8 my-auto py-4">
              {/* Large Radiant 3D Golden Date Badge */}
              <motion.div 
                animate={{ rotate: [-1, 1, -1], scale: [1, 1.02, 1] }}
                transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
                className={`w-28 h-28 md:w-36 md:h-36 rounded-3xl bg-gradient-to-tr ${currentNatureTheme.dateBadgeGradient} p-1.5 shadow-[0_12px_35px_rgba(245,158,11,0.45)] flex items-center justify-center text-slate-950 shrink-0`}
              >
                <div className="w-full h-full rounded-[20px] bg-gradient-to-b from-amber-50 via-white to-amber-50/90 flex flex-col items-center justify-center text-center p-2 border-2 border-amber-300/90 shadow-inner">
                  <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-amber-800">SINH NHẬT</span>
                  <span className="text-2xl md:text-4xl font-black text-rose-600 drop-shadow-xs my-0.5">
                    Ngày {String(activeMember.sinhNhat).split('/')[0]}
                  </span>
                  <span className="text-[10px] md:text-xs font-extrabold text-amber-800">Tháng {selectedMonth}</span>
                </div>
              </motion.div>

              {/* Member Name and Age */}
              <div className="text-center md:text-left flex-1 min-w-0">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                  {calculateAge(activeMember.sinhNhat) !== null && (
                    <span className="text-xs md:text-sm font-black bg-gradient-to-r from-rose-500 to-amber-500 text-white px-3.5 py-1 rounded-full shadow-sm">
                      {calculateAge(activeMember.sinhNhat)} Tuổi
                    </span>
                  )}
                  <span className="text-xs md:text-sm text-slate-700 font-bold bg-white/90 px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                    Ngày sinh: {activeMember.sinhNhat}
                  </span>
                </div>

                <h3 className={`font-black text-slate-900 tracking-tight font-serif drop-shadow-xs truncate ${
                  inFullscreen ? 'text-3xl md:text-5xl lg:text-6xl' : 'text-2xl md:text-4xl lg:text-5xl'
                }`}>
                  {activeMember.name}
                </h3>

                <div className="flex items-center justify-center md:justify-start gap-2 mt-2.5 text-rose-600 font-bold text-xs md:text-base">
                  <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-amber-500 shrink-0" />
                  <span>Chúc mừng tuổi mới vạn sự như ý, thành công rực rỡ!</span>
                </div>
              </div>
            </div>

            {/* Bottom: Warm Union Wish & Seasonal Poetic Touch */}
            <div className="p-4 md:p-5 bg-white/95 rounded-2xl border-2 border-amber-200/90 backdrop-blur-md mt-2 shadow-md">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs md:text-sm font-extrabold text-amber-900 flex items-center gap-1.5">
                  <span>{currentNatureTheme.seasonIcon}</span>
                  <span>Lời chúc Công Đoàn {currentNatureTheme.seasonTitle}</span>
                </span>
                <span className="text-xs text-slate-600 italic hidden sm:inline font-medium">
                  "{currentNatureTheme.poem}"
                </span>
              </div>
              <p className="text-xs md:text-sm text-rose-950 italic font-semibold leading-relaxed">
                "{getWishForAge(calculateAge(activeMember.sinhNhat))}"
              </p>
            </div>
          </div>
        </motion.div>
      );
    }

    if (mcStep > monthBirthdays.length) {
      return (
        <motion.div
          key="finale-stage"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`relative rounded-3xl text-slate-900 text-center shadow-2xl border-2 border-white/90 overflow-hidden flex flex-col items-center justify-center p-6 md:p-10 ${
            inFullscreen ? 'w-full max-w-4xl h-[calc(100vh-140px)] min-h-[460px]' : 'w-full flex-1 min-h-[440px]'
          }`}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center scale-105 transition-transform"
            style={{ backgroundImage: `url("${welcomeNatureTheme.activeImage.url}")` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/50 to-white/80 backdrop-blur-[2px]" />
          <div className={`absolute inset-0 bg-gradient-to-tr ${welcomeNatureTheme.accentGlow} mix-blend-soft-light opacity-50`} />

          <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center p-6 md:p-8 rounded-3xl bg-white/95 backdrop-blur-xl border-2 border-amber-300/80 shadow-2xl">
            <span className="text-xs font-black uppercase tracking-wider text-rose-700 bg-rose-100 border border-rose-300 px-3.5 py-1 rounded-full mb-3 inline-flex items-center gap-1.5 shadow-xs">
              <PartyPopper className="w-4 h-4 text-amber-600" />
              Đại Tiệc Sinh Nhật Tháng {selectedMonth} • {welcomeNatureTheme.seasonTitle}
            </span>

            {/* Interactive Cake */}
            <div 
              onClick={handleMonthCakeClick}
              className="relative cursor-pointer group my-3 z-20"
              title="Bấm để cắt bánh sinh nhật tập thể!"
            >
              <AnimatePresence mode="wait">
                {!isMonthCakeCut ? (
                  <motion.div 
                    key="whole-cake-month"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-gradient-to-tr from-amber-400 to-rose-400 rounded-full flex items-center justify-center shadow-xl border-4 border-white group-hover:scale-110 transition-transform mx-auto text-white"
                  >
                    <Cake className="w-12 h-12 text-white drop-shadow-md" />
                  </motion.div>
                ) : (
                  <motion.div 
                    key="sliced-cake-month"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 flex items-center justify-center mx-auto"
                  >
                    <span className="text-6xl drop-shadow-xl">🍰</span>
                  </motion.div>
                )}
              </AnimatePresence>
              <p className="text-xs text-rose-700 mt-2 font-black group-hover:text-rose-800">
                {!isMonthCakeCut ? '👉 Bấm vào bánh để cắt bánh tập thể!' : '✨ Đã cắt bánh chúc mừng!'}
              </p>
            </div>

            <h3 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-amber-600 to-yellow-600 font-serif mb-2">
              Happy Birthday Tháng {selectedMonth}!
            </h3>
            <p className="text-xs md:text-sm text-slate-700 font-medium leading-relaxed max-w-md">
              Kính chúc toàn thể {monthBirthdays.length} đồng chí tuổi mới luôn tràn đầy năng lượng, dồi dào sức khỏe, gia đình hạnh phúc và gặt hái nhiều thắng lợi mới!
            </p>
          </div>
        </motion.div>
      );
    }

    // Welcome Stage (mcStep === 0)
    return (
      <div className={`relative rounded-3xl overflow-hidden flex flex-col items-center justify-center text-slate-900 text-center shadow-2xl border-2 border-white/90 p-6 md:p-10 ${
        inFullscreen ? 'w-full max-w-4xl h-[calc(100vh-140px)] min-h-[460px]' : 'w-full flex-1 min-h-[440px]'
      }`}>
        <motion.div 
          key={`welcome-bg-${welcomeNatureTheme.activeImage.url}`}
          initial={{ scale: 1.05, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url("${welcomeNatureTheme.activeImage.url}")` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/50 to-white/80 backdrop-blur-[2px]" />
        <div className={`absolute inset-0 bg-gradient-to-tr ${welcomeNatureTheme.accentGlow} mix-blend-soft-light opacity-50`} />

        {/* Scenery Caption */}
        <div className="absolute bottom-3 right-4 z-10 pointer-events-none">
          <span className="text-[11px] text-slate-800 font-bold drop-shadow-xs bg-white/90 px-3 py-1 rounded-full border border-white/90 backdrop-blur-md shadow-xs flex items-center gap-1.5">
            <span>{welcomeNatureTheme.seasonIcon}</span>
            <span>{welcomeNatureTheme.activeImage.caption}</span>
          </span>
        </div>

        <div className="relative z-10 max-w-lg mx-auto flex flex-col items-center p-6 md:p-8 rounded-3xl bg-white/95 backdrop-blur-xl border-2 border-amber-300/80 shadow-2xl">
          <div className="flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-amber-100/90 border border-amber-300 text-amber-900 text-xs font-bold mb-3 shadow-xs">
            <span>{welcomeNatureTheme.seasonIcon}</span>
            <span>Tháng {selectedMonth} • {welcomeNatureTheme.seasonTitle}</span>
          </div>
          <div className="w-18 h-18 rounded-3xl bg-gradient-to-tr from-amber-400 to-rose-400 text-white flex items-center justify-center mb-3 shadow-lg p-3">
            <Cake className="w-10 h-10 text-white drop-shadow-sm" />
          </div>
          <h4 className="text-xl md:text-3xl font-black mb-1.5 font-serif text-slate-900 drop-shadow-xs">
            Sân Khấu Chúc Mừng Sinh Nhật Tháng {selectedMonth}
          </h4>
          <p className="text-xs text-amber-800 italic mb-3 font-semibold">
            "{welcomeNatureTheme.themeName} — {welcomeNatureTheme.poem}"
          </p>
          <p className="text-xs md:text-sm text-slate-600 max-w-md mb-5 leading-relaxed">
            Bấm nút <span className="text-rose-600 font-bold">"Bắt đầu xướng tên"</span> hoặc phím <span className="text-amber-600 font-bold">Cách (Space)</span> để MC xướng tên từng đoàn viên theo thứ tự ngày sinh từ nhỏ đến lớn!
          </p>
          <button
            type="button"
            onClick={advanceMcStep}
            className="px-7 py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:brightness-105 text-white font-black text-sm md:text-base flex items-center gap-2.5 shadow-xl shadow-rose-500/25 cursor-pointer transition-all transform hover:scale-105"
          >
            <Play className="w-4 h-4 fill-current" />
            Bắt đầu xướng tên
          </button>
        </div>
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col gap-3 w-full mx-auto transition-all ${
        isFullscreen 
          ? 'fixed inset-0 z-50 bg-gradient-to-br from-amber-50/80 via-rose-50/60 to-sky-50/70 p-4 md:p-6 h-screen w-screen overflow-hidden justify-between' 
          : 'max-w-7xl pb-4'
      }`}
    >
      {/* Fullscreen Dedicated Presentation Mode - Clean, Centered, No Distractions */}
      {isFullscreen ? (
        <div className="flex flex-col h-full w-full justify-between items-center">
          {/* Top Bar: Minimalist Presentation Header with Navigation & Exit */}
          <div className="w-full max-w-5xl flex items-center justify-between gap-3 px-4 py-2.5 bg-white/90 backdrop-blur-md rounded-2xl border border-amber-200/80 shadow-md z-30">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-gradient-to-tr from-amber-500 to-rose-500 rounded-xl text-white shadow-xs">
                <Cake className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs md:text-sm font-black text-slate-900 flex items-center gap-2">
                  <span>Trình Chiếu Sinh Nhật Tháng {selectedMonth}</span>
                  <span className="bg-rose-100 text-rose-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-full border border-rose-200">
                    {mcStep === 0 ? 'Mở đầu' : mcStep > monthBirthdays.length ? 'Tổng kết' : `${mcStep}/${monthBirthdays.length}`}
                  </span>
                </h3>
              </div>
            </div>

            {/* Quick Controls in Fullscreen */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500 font-medium hidden md:inline">
                Phím tắt: <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">←</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">→</kbd> <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-bold">Space</kbd>
              </span>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                title="Thoát chế độ trình chiếu (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Thoát trình chiếu</span>
              </button>
            </div>
          </div>

          {/* Centered Spotlight Stage in Fullscreen */}
          <div className="w-full flex-1 flex items-center justify-center my-auto p-2">
            <AnimatePresence mode="wait">
              {renderStageCard(true)}
            </AnimatePresence>
          </div>

          {/* Bottom Bar: MC Stepper Buttons in Fullscreen */}
          <div className="w-full max-w-5xl flex items-center justify-between gap-3 px-4 py-2.5 bg-white/90 backdrop-blur-md rounded-2xl border border-amber-200/80 shadow-md z-30">
            <button
              type="button"
              onClick={prevMcStep}
              disabled={mcStep <= 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed text-xs md:text-sm font-extrabold cursor-pointer transition-all shadow-xs"
              title="Quay lại người trước (Phím ←)"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Đồng chí trước</span>
            </button>

            {/* Quick Step Indicators */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-[50%] py-1">
              {monthBirthdays.map((m, idx) => {
                const stepNum = idx + 1;
                const isCurrent = mcStep === stepNum;
                const isPassed = mcStep > stepNum;
                return (
                  <button
                    key={m.name}
                    type="button"
                    onClick={() => {
                      setMcStep(stepNum);
                      soundFX.playFanfare();
                    }}
                    className={`w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                      isCurrent
                        ? 'bg-rose-600 text-white ring-2 ring-rose-400 ring-offset-1 scale-110 shadow-sm'
                        : isPassed
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                    title={`${m.name} (Ngày ${m.sinhNhat})`}
                  >
                    {stepNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={advanceMcStep}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:brightness-105 text-white text-xs md:text-sm font-black shadow-md cursor-pointer transition-all transform hover:scale-105"
              title="Xướng tên người tiếp theo (Phím Space hoặc →)"
            >
              <span>{mcStep === 0 ? 'Bắt đầu' : mcStep >= monthBirthdays.length ? 'Tổng kết bánh kem' : 'Người tiếp theo'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Top Header & Sub-Tab Switcher */}
          <div className="bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-3 transition-all">
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
              <span className={`hidden md:inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-0.5 rounded-md border shadow-xs ${currentNatureTheme.badgeBg} ${currentNatureTheme.badgeBorder}`}>
                <span>{currentNatureTheme.seasonIcon}</span>
                <span>{currentNatureTheme.seasonTitle}</span>
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

              {/* Toggle Scenic Nature View */}
              <button
                type="button"
                onClick={() => setScenicBgOffset(prev => prev + 1)}
                className="px-2 py-1.5 rounded-xl border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                title={`Đổi cảnh sắc thiên nhiên mùa ${currentNatureTheme.seasonTitle} (hoa cỏ, sông suối, đồi núi)`}
              >
                <ImageIcon className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden xl:inline text-[11px]">Đổi Cảnh Sắc</span>
              </button>

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
                  {renderStageCard(false)}
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
      </>
    )}
  </div>
);
}
