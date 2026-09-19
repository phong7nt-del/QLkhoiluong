import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DataStore, SheetMember } from '../store/DataStore';
import { 
  Trophy, Medal, Crown, Sparkles, Calendar, Volume2, VolumeX, 
  RotateCcw, Play, ChevronRight, Edit3, X, Save, Award, Cake, TrendingUp,
  Maximize2, Minimize2, Table as TableIcon, Layout, Lock, Shield, Send, CheckCircle2
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { soundFX } from '../utils/soundFX';
import { calculateMemberProductivity, MemberProductivityStat } from '../utils/productivity';

export interface CommendedMember {
  rank: 1 | 2 | 3;
  name: string;
  team: string;
  title: string;
  productivity: number; // Năng suất (%)
  standardDays: number; // Ngày công chuẩn
  workDays: number;     // Số ngày làm việc
  citation: string;
  avatar?: string;
}

interface TuyenDuongTabProps {
  onGoToBirthdayMonth?: () => void;
  sessionUser?: SheetMember | null;
}

export default function TuyenDuongTab({ onGoToBirthdayMonth, sessionUser }: TuyenDuongTabProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Filter state
  const [periodType, setPeriodType] = useState<'month' | 'year'>('month');
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [selectedTeam, setSelectedTeam] = useState<string>('all');
  
  // Audio state
  const [soundOn, setSoundOn] = useState<boolean>(true);

  // Fullscreen / Projector Mode for external monitors
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    const monthKey = periodType === 'month' ? selectedMonth : 0;
    return DataStore.isCongDoanPublished('tuyen_duong', selectedYear, monthKey);
  }, [periodType, selectedYear, selectedMonth, publishVersion]);

  const handleTogglePublish = () => {
    if (!isLeader) return;
    const monthKey = periodType === 'month' ? selectedMonth : 0;
    const nextState = !isPublished;
    DataStore.setCongDoanPublished('tuyen_duong', selectedYear, monthKey, nextState);
    setPublishVersion(v => v + 1);
    if (nextState) {
      soundFX.fanfare();
      confetti({ particleCount: 90, spread: 80, origin: { y: 0.6 } });
    }
  };

  // View Mode: 'stage' (Sân khấu vừa vặn màn hình) vs 'table' (Bảng chi tiết)
  const [viewMode, setViewMode] = useState<'stage' | 'table'>('stage');

  // MC Presentation Step: 0: Not started, 1: Top 3 revealed, 2: Top 2 revealed, 3: Top 1 revealed
  const [mcStep, setMcStep] = useState<number>(0);

  // Edit/Custom modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [customMembers, setCustomMembers] = useState<Record<string, CommendedMember[]>>({});

  // Real productivity calculation for the selected period
  const computedProductivityList = useMemo<MemberProductivityStat[]>(() => {
    return calculateMemberProductivity(periodType, selectedYear, selectedMonth, selectedTeam);
  }, [periodType, selectedYear, selectedMonth, selectedTeam]);

  // Auto-calculated Top 3 based on highest PRODUCTIVITY in the month/year
  const computedTop3 = useMemo<CommendedMember[]>(() => {
    const customKey = `${periodType}_${selectedYear}_${periodType === 'month' ? selectedMonth : 'all'}_${selectedTeam}`;
    if (customMembers[customKey] && customMembers[customKey].length === 3) {
      return customMembers[customKey];
    }

    const allMembers = DataStore.getMembers();
    const periodText = periodType === 'month' ? `Tháng ${selectedMonth}/${selectedYear}` : `Năm ${selectedYear}`;

    const titles = [
      'Quán Quân Năng Suất Xuất Sắc',
      'Á Quân Năng Suất (Giải Nhì)',
      'Tiên Tiến Năng Suất (Giải Ba)'
    ];

    // Filter members with positive productivity or valid records first
    const activeStats = computedProductivityList.filter(s => s.productivityPercent > 0 || s.totalStandardDays > 0);

    // Fallbacks if not enough entries recorded
    const fallbackList = allMembers
      .filter(m => selectedTeam === 'all' || m.team === selectedTeam)
      .map((m, idx) => ({
        member: m.name,
        team: m.team || 'Tổ Đo xa',
        daysWorkedCount: 20 - idx,
        totalStandardDays: 25 - idx * 1.5,
        productivityPercent: 125.0 - idx * 6,
        entriesCount: 15 - idx
      }));

    const topList: CommendedMember[] = [];

    for (let i = 0; i < 3; i++) {
      const stat = activeStats[i] || fallbackList[i] || {
        member: `Đồng chí ${i + 1}`,
        team: 'Đội Đo xa',
        daysWorkedCount: 20,
        totalStandardDays: 24.0,
        productivityPercent: 120.0 - i * 5,
        entriesCount: 12
      };

      const pPercent = Number(stat.productivityPercent.toFixed(1));
      const sDays = Number(stat.totalStandardDays.toFixed(1));
      const wDays = stat.daysWorkedCount || 1;

      let citation = '';
      if (i === 0) {
        citation = `Đạt Năng suất kỷ lục ${pPercent}% (${sDays} ngày công định mức trong ${wDays} ngày làm việc) trong ${periodText}, dẫn đầu toàn đơn vị về tiến độ và hiệu quả lao động.`;
      } else if (i === 1) {
        citation = `Đạt Năng suất vượt trội ${pPercent}% (${sDays} ngày công chuẩn) trong ${periodText}, luôn năng nổ, chủ động cải tiến và hỗ trợ đồng đội hoàn thành xuất sắc nhiệm vụ.`;
      } else {
        citation = `Đạt Năng suất tiêu biểu ${pPercent}% (${sDays} ngày công chuẩn) trong ${periodText}, tinh thần trách nhiệm cao, tác phong gương mẫu và kỷ luật xuất sắc.`;
      }

      topList.push({
        rank: (i + 1) as 1 | 2 | 3,
        name: stat.member,
        team: stat.team,
        title: titles[i],
        productivity: pPercent,
        standardDays: sDays,
        workDays: wDays,
        citation: citation
      });
    }

    return topList;
  }, [periodType, selectedYear, selectedMonth, selectedTeam, customMembers, computedProductivityList]);

  // Load custom stored commendations on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tuyen_duong_custom_productivity_v2');
      if (saved) {
        setCustomMembers(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not load custom commendations", e);
    }
  }, []);

  // Save custom members
  const saveCustomMembers = (updatedList: CommendedMember[]) => {
    const customKey = `${periodType}_${selectedYear}_${periodType === 'month' ? selectedMonth : 'all'}_${selectedTeam}`;
    const newRecord = { ...customMembers, [customKey]: updatedList };
    setCustomMembers(newRecord);
    try {
      localStorage.setItem('tuyen_duong_custom_productivity_v2', JSON.stringify(newRecord));
    } catch (e) {
      console.warn(e);
    }
    setIsEditModalOpen(false);
  };

  // Keyboard shortcut for MC (Space or Enter advances, F toggles Fullscreen, Esc exits)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isEditModalOpen) return;
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        triggerNextMcStep();
      } else if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey) {
        setIsFullscreen(prev => !prev);
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  // Sound toggle sync
  useEffect(() => {
    soundFX.setEnabled(soundOn);
  }, [soundOn]);

  // Handle MC Step Progression
  const triggerNextMcStep = () => {
    if (mcStep >= 3) {
      setMcStep(0);
      return;
    }

    const nextStep = mcStep + 1;
    setMcStep(nextStep);

    if (nextStep === 1) {
      soundFX.playWhoosh();
      setTimeout(() => soundFX.playChime(440), 180);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { x: 0.75, y: 0.65 },
        colors: ['#cd7f32', '#d4af37', '#b87333', '#ffffff']
      });
    } else if (nextStep === 2) {
      soundFX.playWhoosh();
      setTimeout(() => soundFX.playChime(587.33), 180);
      confetti({
        particleCount: 65,
        spread: 70,
        origin: { x: 0.25, y: 0.65 },
        colors: ['#c0c0c0', '#e5e4e2', '#00f0ff', '#ffffff']
      });
    } else if (nextStep === 3) {
      soundFX.playGrandFanfare();

      const end = Date.now() + 4 * 1000;
      const frame = () => {
        confetti({
          particleCount: 8,
          angle: 60,
          spread: 70,
          origin: { x: 0.05, y: 0.7 },
          colors: ['#ffd700', '#ffaa00', '#ff3366', '#ffffff']
        });
        confetti({
          particleCount: 8,
          angle: 120,
          spread: 70,
          origin: { x: 0.95, y: 0.7 },
          colors: ['#ffd700', '#ffaa00', '#00e5ff', '#ffffff']
        });
        confetti({
          particleCount: 6,
          angle: 90,
          spread: 100,
          origin: { x: 0.5, y: 0.4 },
          colors: ['#ffd700', '#fffae0', '#ff0055', '#ff9900']
        });
        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  };

  const rank1 = computedTop3.find(m => m.rank === 1) || computedTop3[0];
  const rank2 = computedTop3.find(m => m.rank === 2) || computedTop3[1];
  const rank3 = computedTop3.find(m => m.rank === 3) || computedTop3[2];

  const allTeams = useMemo(() => {
    const teams = new Set<string>();
    DataStore.getMembers().forEach(m => {
      if (m.team) teams.add(m.team);
    });
    return Array.from(teams).sort();
  }, []);

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col gap-3 w-full mx-auto transition-all ${
        isFullscreen 
          ? 'fixed inset-0 z-50 bg-slate-950 p-4 md:p-6 h-screen w-screen overflow-hidden justify-between' 
          : 'max-w-7xl pb-4'
      }`}
    >
      {/* COMPACT HEADER & CONTROL TOOLBAR */}
      <div className={`bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-slate-200/80 flex flex-wrap items-center justify-between gap-2.5 transition-all ${
        isFullscreen ? 'bg-slate-900/90 border-slate-700 text-white backdrop-blur-md' : ''
      }`}>
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-amber-50 rounded-xl text-amber-600 border border-amber-200">
            <Trophy className="w-5 h-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className={`text-base md:text-lg font-black tracking-tight ${isFullscreen ? 'text-white' : 'text-slate-900'}`}>
                Bảng Vàng Năng Suất
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                {periodType === 'month' ? `Tháng ${selectedMonth}/${selectedYear}` : `Năm ${selectedYear}`}
              </span>
              {isLeader && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                  👑 Quyền Công Bố
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Filter & Action Buttons */}
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

          {/* Mode Switch (Tháng / Năm) */}
          <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200 text-xs font-bold">
            <button
              onClick={() => { setPeriodType('month'); setMcStep(0); }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                periodType === 'month' 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tháng
            </button>
            <button
              onClick={() => { setPeriodType('year'); setMcStep(0); }}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                periodType === 'year' 
                  ? 'bg-white text-blue-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Năm
            </button>
          </div>

          {/* Month Dropdown */}
          {periodType === 'month' && (
            <select
              value={selectedMonth}
              onChange={e => { setSelectedMonth(Number(e.target.value)); setMcStep(0); }}
              className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
          )}

          {/* Year Dropdown */}
          <select
            value={selectedYear}
            onChange={e => { setSelectedYear(Number(e.target.value)); setMcStep(0); }}
            className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm"
          >
            {[currentYear + 1, currentYear, currentYear - 1].map(y => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>

          {/* Team Dropdown */}
          <select
            value={selectedTeam}
            onChange={e => { setSelectedTeam(e.target.value); setMcStep(0); }}
            className="bg-white border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm max-w-[130px]"
          >
            <option value="all">Tất cả tổ</option>
            {allTeams.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* View Switcher: Sân khấu vs Bảng chi tiết */}
          {!isFullscreen && (
            <div className="bg-slate-100 p-0.5 rounded-xl flex items-center border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setViewMode('stage')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'stage' 
                    ? 'bg-white text-amber-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Sân khấu vinh danh vừa vặn màn hình"
              >
                <Layout className="w-3.5 h-3.5" />
                Sân Khấu
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table' 
                    ? 'bg-white text-blue-700 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Bảng số liệu chi tiết"
              >
                <TableIcon className="w-3.5 h-3.5" />
                Bảng Chi Tiết
              </button>
            </div>
          )}

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundOn(!soundOn)}
            className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
              soundOn 
                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                : 'bg-slate-100 text-slate-400 border-slate-200'
            }`}
            title={soundOn ? "Đang bật âm thanh MC" : "Đang tắt âm thanh"}
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen / Projector Mode Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border text-xs font-bold transition-all cursor-pointer shadow-sm ${
              isFullscreen 
                ? 'bg-amber-400 text-slate-950 border-amber-300 ring-2 ring-amber-300' 
                : 'bg-slate-800 hover:bg-slate-900 text-white border-slate-700'
            }`}
            title="Bật chế độ trình chiếu toàn màn hình cho TV / Máy chiếu ngoài"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            <span>{isFullscreen ? 'Thu Nhỏ' : 'Trình Chiếu'}</span>
          </button>

          {/* Edit / Customize - Only for Leaders */}
          {isLeader && !isFullscreen && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
              title="Tùy chỉnh cá nhân vinh danh"
            >
              <Edit3 className="w-3 h-3" />
              Tùy chỉnh
            </button>
          )}

          {/* Quick link to Birthday Month */}
          {onGoToBirthdayMonth && !isFullscreen && (
            <button
              onClick={onGoToBirthdayMonth}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Cake className="w-3 h-3 text-rose-500" />
              Sinh Nhật
            </button>
          )}
        </div>
      </div>

      {(!isLeader && !isPublished) ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 sm:p-12 text-center my-6 max-w-xl mx-auto flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4 text-amber-600 shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-wider text-slate-800 mb-2">
            Chưa Có Nội Dung Công Bố
          </h3>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed mb-4 max-w-md">
            Bảng Tuyên dương Khen thưởng Năng suất {periodType === 'month' ? `Tháng ${selectedMonth}/${selectedYear}` : `Năm ${selectedYear}`} đang được chuẩn bị và chưa được công bố cho toàn thể đơn vị.
          </p>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200">
            <Shield className="w-3.5 h-3.5 text-slate-500" />
            <span>Chỉ Đội trưởng và Tổ trưởng Công đoàn mới có quyền công bố</span>
          </div>
        </div>
      ) : (
        <>
          {/* COMPACT MC PROMPTER BAR */}
          <div className={`bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 rounded-2xl px-4 py-2.5 text-white shadow-md border border-indigo-500/20 flex flex-col md:flex-row items-center justify-between gap-3 ${
            isFullscreen ? 'border-amber-400/30 py-3' : ''
          }`}>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shrink-0 shadow-md text-slate-950 font-black text-sm">
                🎤
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-400 bg-amber-400/10 px-2 py-0.2 rounded border border-amber-400/20">
                    MC Lời Dẫn
                  </span>
                  <span className="text-[11px] text-slate-400 truncate">
                    {mcStep === 0 && (isLeader ? 'Sân khấu sẵn sàng • Bấm kích hoạt để bắt đầu' : 'Chương trình Tuyên dương Năng suất')}
                    {mcStep === 1 && 'Đang xướng tên: Top 3 Năng Suất (Giải Ba)'}
                    {mcStep === 2 && 'Đang xướng tên: Top 2 Năng Suất (Á Quân)'}
                    {mcStep === 3 && 'Đỉnh cao vinh quang: Quán Quân Top 1 Năng Suất!'}
                  </span>
                </div>
                <p className="text-xs md:text-sm font-medium text-slate-100 truncate italic font-serif">
                  {mcStep === 0 && (
                    `"Kính thưa các đồng chí, sau đây xin trân trọng khai mạc vinh danh Top 3 NĂNG SUẤT XUẤT SẮC NHẤT ${periodType === 'month' ? `Tháng ${selectedMonth}/${selectedYear}` : `Năm ${selectedYear}`}!"`
                  )}
                  {mcStep === 1 && (
                    `"Xin nồng nhiệt chúc mừng đồng chí ${rank3?.name} - Tổ ${rank3?.team} đạt Giải Ba với Năng suất ${rank3?.productivity.toFixed(1)}%!"`
                  )}
                  {mcStep === 2 && (
                    `"Ngôi vị Á Quân - Giải Nhì Năng Suất xin được xướng tên đồng chí ${rank2?.name} - Tổ ${rank2?.team} với Năng suất ${rank2?.productivity.toFixed(1)}%!"`
                  )}
                  {mcStep === 3 && (
                    `"QUÁN QUÂN NĂNG SUẤT TOP 1 xin nhiệt liệt vinh danh đồng chí ${rank1?.name} với NĂNG SUẤT KỶ LỤC ${rank1?.productivity.toFixed(1)}%!"`
                  )}
                </p>
              </div>
            </div>

            {/* MC Actions Controls */}
            {isLeader ? (
              <div className="flex items-center gap-2 shrink-0">
                {mcStep > 0 && (
                  <button
                    onClick={() => setMcStep(0)}
                    className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1 border border-white/10 cursor-pointer"
                    title="Khởi động lại trình chiếu"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Diễn lại</span>
                  </button>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={triggerNextMcStep}
                  className={`px-4 py-1.5 rounded-xl font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer ${
                    mcStep === 0 
                      ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-400 text-slate-950 shadow-amber-500/30 ring-2 ring-amber-400/20'
                      : mcStep === 1
                        ? 'bg-gradient-to-r from-slate-200 via-cyan-100 to-white text-slate-900 shadow-cyan-400/20'
                        : mcStep === 2
                          ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-slate-950 shadow-amber-500/40 ring-2 ring-amber-400/40 animate-pulse'
                          : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/30'
                  }`}
                >
                  {mcStep === 0 && (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Công bố Top 3
                    </>
                  )}
                  {mcStep === 1 && (
                    <>
                      <ChevronRight className="w-4 h-4" />
                      Công bố Top 2
                    </>
                  )}
                  {mcStep === 2 && (
                    <>
                      <Crown className="w-4 h-4 fill-current text-amber-900" />
                      Công bố Top 1
                    </>
                  )}
                  {mcStep === 3 && (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Bắn Pháo Hoa!
                    </>
                  )}
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => { soundFX.fanfare(); confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 } }); }}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Bắn Pháo Hoa Chúc Mừng</span>
                </button>
              </div>
            )}
          </div>

      {/* VIEW: STAGE (PODIUM) - OPTIMIZED TO FIT VIEWPORT */}
      {(viewMode === 'stage' || isFullscreen) && (
        <div className={`relative bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 rounded-2xl p-4 md:p-6 text-white shadow-xl border border-slate-800 flex flex-col justify-between overflow-hidden transition-all ${
          isFullscreen 
            ? 'flex-1 my-2 border-amber-500/20 shadow-2xl' 
            : 'h-[calc(100vh-220px)] min-h-[460px] max-h-[580px]'
        }`}>
          {/* Ambient Lighting */}
          <div className="absolute top-0 left-1/4 w-40 h-[400px] bg-gradient-to-b from-blue-400/15 via-transparent to-transparent -rotate-12 blur-xl pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-40 h-[400px] bg-gradient-to-b from-amber-400/20 via-transparent to-transparent rotate-12 blur-xl pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 bg-amber-300/10 rounded-full blur-2xl pointer-events-none" />

          {/* Stage Sub-header */}
          <div className="text-center relative z-10 mb-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-300 text-[10px] font-black uppercase tracking-widest mb-1 shadow-inner">
              <TrendingUp className="w-3 h-3 text-amber-400" />
              Lễ Tuyên Dương Năng Suất • {periodType === 'month' ? `Tháng ${selectedMonth}/${selectedYear}` : `Năm ${selectedYear}`}
            </div>
            <h3 className="text-xl md:text-2xl lg:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 tracking-tight drop-shadow font-serif">
              Tam Kiệt Năng Suất Lao Động
            </h3>
          </div>

          {/* PODIUM 3D CONTAINER: [Rank 2 - Silver] [Rank 1 - Gold] [Rank 3 - Bronze] */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 items-end max-w-5xl mx-auto w-full relative z-10 mt-auto pt-2">
            
            {/* ======================================================== */}
            {/* TOP 2: SILVER / HẠNG NHÌ (Left column) */}
            {/* ======================================================== */}
            <div className="order-2 md:order-1 flex flex-col items-center">
              <AnimatePresence mode="wait">
                {mcStep >= 2 ? (
                  <motion.div
                    key="top2-revealed"
                    initial={{ opacity: 0, scale: 0.6, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                    className="w-full flex flex-col items-center mb-2"
                  >
                    {/* Glowing Medal Badge */}
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-slate-200 via-slate-100 to-slate-300 p-0.5 shadow-[0_0_20px_rgba(200,215,230,0.4)] flex items-center justify-center mb-2">
                      <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 flex flex-col items-center justify-center text-slate-100 border border-slate-400/40">
                        <Medal className="w-6 h-6 text-slate-200" />
                        <span className="text-[9px] font-black uppercase text-slate-300">Top 2</span>
                      </div>
                    </div>

                    {/* Member Card */}
                    <div className="w-full bg-slate-800/80 backdrop-blur-md rounded-xl p-3 border border-slate-600/50 shadow-xl text-center relative overflow-hidden group">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300 bg-slate-700/60 px-2 py-0.5 rounded inline-block mb-1 border border-slate-500/30">
                        Á Quân Năng Suất
                      </span>
                      <h4 className="text-base md:text-lg font-black text-white truncate drop-shadow-sm mb-0.5">
                        {rank2?.name}
                      </h4>
                      <p className="text-[11px] font-semibold text-cyan-300 mb-1.5 truncate">
                        {rank2?.team}
                      </p>
                      
                      {/* Productivity Pill */}
                      <div className="bg-slate-900/90 py-1 px-2 rounded-lg border border-cyan-500/30 flex items-center justify-center gap-1.5 mb-1.5">
                        <span className="text-[10px] text-cyan-300 font-bold uppercase">Năng Suất:</span>
                        <span className="text-sm md:text-base font-black text-cyan-300">{rank2?.productivity.toFixed(1)}%</span>
                      </div>

                      <p className="text-[11px] text-slate-300 italic line-clamp-2 px-1">
                        "{rank2?.citation}"
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="w-full flex flex-col items-center mb-2 opacity-40">
                    <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-2">
                      <span className="text-xl font-black text-slate-600">?</span>
                    </div>
                    <div className="w-full bg-slate-900/50 rounded-xl p-3 border border-slate-800 text-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Top 2 (Á Quân)</p>
                      <p className="text-xs text-slate-600 font-medium">Chờ MC công bố...</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>

              {/* Pedestal: Silver */}
              <div className="w-full h-18 md:h-24 lg:h-28 bg-gradient-to-b from-slate-600 via-slate-700 to-slate-800 rounded-t-xl border-t-2 border-slate-400 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
                <span className="text-3xl md:text-4xl font-black text-slate-400/40">2</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">Á Quân</span>
              </div>
            </div>

            {/* ======================================================== */}
            {/* TOP 1: GOLD / QUÁN QUÂN (Center column - Highest) */}
            {/* ======================================================== */}
            <div className="order-1 md:order-2 flex flex-col items-center -mt-2">
              <AnimatePresence mode="wait">
                {mcStep >= 3 ? (
                  <motion.div
                    key="top1-revealed"
                    initial={{ opacity: 0, scale: 0.5, y: 40 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 16 }}
                    className="w-full flex flex-col items-center mb-2 relative"
                  >
                    <div className="absolute -inset-3 bg-amber-500/20 rounded-full blur-xl animate-pulse pointer-events-none" />

                    {/* Crown & Trophy Badge */}
                    <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 p-1 shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center justify-center mb-2 relative z-10">
                      <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-amber-900 via-amber-950 to-slate-950 flex flex-col items-center justify-center text-amber-300 border border-amber-300/60 shadow-inner">
                        <Crown className="w-8 h-8 text-amber-300 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                        <span className="text-[9px] font-black uppercase text-amber-200">Quán Quân</span>
                      </div>
                    </div>

                    {/* Member Card */}
                    <div className="w-full bg-gradient-to-b from-amber-950/90 via-slate-900/95 to-slate-950 rounded-xl p-3.5 border-2 border-amber-400/80 shadow-[0_0_25px_rgba(245,158,11,0.35)] text-center relative overflow-hidden group">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 mb-1 border border-amber-400/40">
                        <Trophy className="w-3 h-3 text-amber-300" />
                        Quán Quân Năng Suất
                      </span>
                      
                      <h4 className="text-lg md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 drop-shadow mb-0.5 truncate font-serif">
                        {rank1?.name}
                      </h4>
                      
                      <p className="text-xs font-bold text-amber-300/90 mb-1.5 truncate">
                        {rank1?.team}
                      </p>

                      {/* Productivity Pill */}
                      <div className="bg-amber-400/20 py-1 px-3 rounded-lg border border-amber-400/50 flex items-center justify-center gap-2 mb-1.5 shadow-inner">
                        <span className="text-[10px] font-black text-amber-200 uppercase">KỶ LỤC:</span>
                        <span className="text-base md:text-lg font-black text-yellow-300 drop-shadow">
                          {rank1?.productivity.toFixed(1)}%
                        </span>
                      </div>

                      <p className="text-[11px] text-amber-100/90 italic font-medium line-clamp-2 px-1">
                        "{rank1?.citation}"
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="w-full flex flex-col items-center mb-2 opacity-50">
                    <div className="w-14 h-14 rounded-full bg-amber-950/40 border border-amber-700/50 flex items-center justify-center mb-2">
                      <Crown className="w-6 h-6 text-amber-500/40" />
                    </div>
                    <div className="w-full bg-slate-900/60 rounded-xl p-3 border border-amber-500/20 text-center">
                      <p className="text-[10px] font-bold text-amber-400/80 uppercase">Top 1 (Quán Quân)</p>
                      <p className="text-xs text-slate-500 font-medium">Bí ẩn chờ giây phút đỉnh cao...</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>

              {/* Pedestal: Gold (Highest) */}
              <div className="w-full h-24 md:h-32 lg:h-36 bg-gradient-to-b from-amber-600 via-amber-700 to-amber-900 rounded-t-xl border-t-4 border-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] flex flex-col items-center justify-center relative overflow-hidden">
                <span className="text-4xl md:text-5xl font-black text-amber-200/30">1</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-200">Quán Quân</span>
              </div>
            </div>

            {/* ======================================================== */}
            {/* TOP 3: BRONZE / HẠNG BA (Right column) */}
            {/* ======================================================== */}
            <div className="order-3 flex flex-col items-center">
              <AnimatePresence mode="wait">
                {mcStep >= 1 ? (
                  <motion.div
                    key="top3-revealed"
                    initial={{ opacity: 0, scale: 0.6, y: 30 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                    className="w-full flex flex-col items-center mb-2"
                  >
                    {/* Glowing Bronze Medal Badge */}
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-amber-700 via-orange-800 to-amber-950 p-0.5 shadow-[0_0_20px_rgba(184,115,51,0.4)] flex items-center justify-center mb-2">
                      <div className="w-full h-full rounded-[14px] bg-gradient-to-br from-amber-950 via-stone-900 to-black flex flex-col items-center justify-center text-amber-400 border border-amber-700/40">
                        <Medal className="w-6 h-6 text-amber-600" />
                        <span className="text-[9px] font-black uppercase text-amber-400">Top 3</span>
                      </div>
                    </div>

                    {/* Member Card */}
                    <div className="w-full bg-slate-800/80 backdrop-blur-md rounded-xl p-3 border border-amber-800/40 shadow-xl text-center relative overflow-hidden group">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded inline-block mb-1 border border-amber-700/40">
                        Giải Ba Năng Suất
                      </span>
                      <h4 className="text-base md:text-lg font-black text-white truncate drop-shadow-sm mb-0.5">
                        {rank3?.name}
                      </h4>
                      <p className="text-[11px] font-semibold text-orange-300 mb-1.5 truncate">
                        {rank3?.team}
                      </p>

                      {/* Productivity Pill */}
                      <div className="bg-slate-900/90 py-1 px-2 rounded-lg border border-amber-700/40 flex items-center justify-center gap-1.5 mb-1.5">
                        <span className="text-[10px] text-amber-400 font-bold uppercase">Năng Suất:</span>
                        <span className="text-sm md:text-base font-black text-amber-300">{rank3?.productivity.toFixed(1)}%</span>
                      </div>

                      <p className="text-[11px] text-slate-300 italic line-clamp-2 px-1">
                        "{rank3?.citation}"
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="w-full flex flex-col items-center mb-2 opacity-40">
                    <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-2">
                      <span className="text-xl font-black text-slate-600">?</span>
                    </div>
                    <div className="w-full bg-slate-900/50 rounded-xl p-3 border border-slate-800 text-center">
                      <p className="text-[10px] font-bold text-slate-500 uppercase">Top 3 (Giải Ba)</p>
                      <p className="text-xs text-slate-600 font-medium">Chờ MC công bố...</p>
                    </div>
                  </div>
                )}
              </AnimatePresence>

              {/* Pedestal: Bronze */}
              <div className="w-full h-16 md:h-20 lg:h-24 bg-gradient-to-b from-amber-800 via-amber-900 to-stone-900 rounded-t-xl border-t-2 border-amber-600 shadow-xl flex flex-col items-center justify-center relative overflow-hidden">
                <span className="text-3xl md:text-4xl font-black text-amber-600/40">3</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Giải Ba</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* VIEW: FULL TABLE (When in table mode or scrolled) */}
      {(viewMode === 'table' && !isFullscreen) && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-amber-600" />
                Bảng Tổng Hợp Khen Thưởng Năng Suất {periodType === 'month' ? `Tháng ${selectedMonth}/${selectedYear}` : `Năm ${selectedYear}`}
              </h3>
              <p className="text-xs text-slate-500">
                Tiêu chí xếp hạng: Năng suất cá nhân (%) = (Tổng ngày công định mức / Số ngày làm việc) × 100
              </p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 self-start sm:self-auto">
              {computedProductivityList.length} nhân sự được tính toán
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Xếp Hạng</th>
                  <th className="py-2.5 px-3">Họ Và Tên</th>
                  <th className="py-2.5 px-3">Đơn Vị / Tổ</th>
                  <th className="py-2.5 px-3 text-center">Năng Suất (%)</th>
                  <th className="py-2.5 px-3 text-center">Công Chuẩn / Ngày Làm</th>
                  <th className="py-2.5 px-3">Danh Hiệu / Khen Thưởng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {computedTop3.map(m => {
                  const isGold = m.rank === 1;
                  const isSilver = m.rank === 2;
                  return (
                    <tr 
                      key={m.rank}
                      className={`transition-colors ${
                        isGold ? 'bg-amber-50/60' : isSilver ? 'bg-slate-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full font-black flex items-center justify-center text-xs ${
                            isGold ? 'bg-amber-500 text-slate-950' : isSilver ? 'bg-slate-300 text-slate-800' : 'bg-amber-700 text-white'
                          }`}>
                            {m.rank}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {isGold ? 'Quán Quân' : isSilver ? 'Á Quân' : 'Giải Ba'}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-extrabold text-slate-900">
                        {m.name}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 font-medium">
                        {m.team}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded-lg font-black text-xs ${
                          isGold ? 'bg-amber-500 text-slate-950' : isSilver ? 'bg-slate-700 text-white' : 'bg-amber-700 text-white'
                        }`}>
                          {m.productivity.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center text-slate-700 font-medium text-xs">
                        <span className="font-bold">{m.standardDays.toFixed(1)}</span> công / <span className="font-bold">{m.workDays}</span> ngày
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-xs">
                          <span className="font-bold text-slate-800 block">{m.title}</span>
                          <span className="text-slate-500 italic line-clamp-1">"{m.citation}"</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* CUSTOMIZE COMMENDATION MODAL */}
      <AnimatePresence>
        {isEditModalOpen && (
          <CustomCommendationModal
            currentTop3={computedTop3}
            allMembers={DataStore.getMembers()}
            onClose={() => setIsEditModalOpen(false)}
            onSave={saveCustomMembers}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Modal component to customize Top 3 members & citations
function CustomCommendationModal({
  currentTop3,
  allMembers,
  onClose,
  onSave
}: {
  currentTop3: CommendedMember[];
  allMembers: SheetMember[];
  onClose: () => void;
  onSave: (items: CommendedMember[]) => void;
}) {
  const [items, setItems] = useState<CommendedMember[]>(JSON.parse(JSON.stringify(currentTop3)));

  const handleUpdate = (rank: number, field: keyof CommendedMember, val: any) => {
    setItems(prev => prev.map(item => {
      if (item.rank === rank) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const handleMemberSelect = (rank: number, memberName: string) => {
    const found = allMembers.find(m => m.name === memberName);
    setItems(prev => prev.map(item => {
      if (item.rank === rank) {
        return {
          ...item,
          name: memberName,
          team: found?.team || item.team
        };
      }
      return item;
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-3xl p-5 max-w-2xl w-full shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Edit3 className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">Tùy Chỉnh Danh Sách Tuyên Dương Năng Suất</h3>
              <p className="text-xs text-slate-500">Chủ động điều chỉnh thông tin, Năng suất (%) hoặc trích dẫn vinh danh</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {items.map(m => (
            <div key={m.rank} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  m.rank === 1 ? 'bg-amber-100 text-amber-800' : m.rank === 2 ? 'bg-slate-200 text-slate-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  Hạng {m.rank}: {m.rank === 1 ? 'Quán Quân Năng Suất' : m.rank === 2 ? 'Á Quân Năng Suất' : 'Giải Ba Năng Suất'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Chọn thành viên:</label>
                  <select
                    value={m.name}
                    onChange={e => handleMemberSelect(m.rank, e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {allMembers.map(mem => (
                      <option key={mem.name} value={mem.name}>
                        {mem.name} ({mem.team})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Danh hiệu / Giải thưởng:</label>
                  <input
                    type="text"
                    value={m.title}
                    onChange={e => handleUpdate(m.rank, 'title', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Năng suất (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    value={m.productivity}
                    onChange={e => handleUpdate(m.rank, 'productivity', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-amber-700"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Ngày công chuẩn:</label>
                  <input
                    type="number"
                    step="0.1"
                    value={m.standardDays}
                    onChange={e => handleUpdate(m.rank, 'standardDays', Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Tổ / Đơn vị:</label>
                  <input
                    type="text"
                    value={m.team}
                    onChange={e => handleUpdate(m.rank, 'team', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">Trích dẫn / Lý do vinh danh:</label>
                <textarea
                  rows={2}
                  value={m.citation}
                  onChange={e => handleUpdate(m.rank, 'citation', e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-4 pt-3 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            onClick={() => onSave(items)}
            className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            Lưu thay đổi
          </button>
        </div>
      </motion.div>
    </div>
  );
}
