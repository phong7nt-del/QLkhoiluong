const fs = require('fs');
let code = fs.readFileSync('src/components/BirthdayTab.tsx', 'utf8');

// 1. Add state for month cake
code = code.replace(
    /const \[isCakeCut, setIsCakeCut\] = useState\(false\);/,
    `const [isCakeCut, setIsCakeCut] = useState(false);\n  const [isMonthCakeCut, setIsMonthCakeCut] = useState(false);`
);

// 2. Add handler for month cake
const handleCakeCutStr = `  const handleCakeClick = () => {
      if (isCakeCut) return;
      setIsCakeCut(true);
      
      // Fire extra confetti from the cake
      confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          zIndex: 10000
      });
  };`;

const monthCakeHandlerStr = `  const handleMonthCakeClick = () => {
      if (isMonthCakeCut) return;
      setIsMonthCakeCut(true);
      
      // Fire extra confetti from the cake
      confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.7 },
          zIndex: 10000
      });
  };`;

code = code.replace(handleCakeCutStr, handleCakeCutStr + '\n\n' + monthCakeHandlerStr);

// 3. Replace the Calendar icon with the interactive cake in the monthly section
const targetMonthIcon = `<motion.div 
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                                className="w-16 h-16 bg-white/20 rounded-2xl rotate-3 flex items-center justify-center mb-4 shadow-xl backdrop-blur-md border border-white/30"
                            >
                                <Calendar className="w-8 h-8 text-white -rotate-3" />
                            </motion.div>`;

const replaceMonthIcon = `<div 
                            onClick={handleMonthCakeClick}
                            className="relative cursor-pointer group mb-6 z-20"
                            title="Bấm để cắt bánh!"
                        >
                            <AnimatePresence mode="wait">
                                {!isMonthCakeCut ? (
                                    <motion.div 
                                        key="whole-cake-month"
                                        initial={{ scale: 0, rotate: -180 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        exit={{ scale: 0, opacity: 0, rotate: -90 }}
                                        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                        className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center shadow-2xl backdrop-blur-md border border-white/30 group-hover:scale-110 transition-transform mx-auto"
                                    >
                                        <Cake className="w-12 h-12 text-white drop-shadow-md" />
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
                                        className="w-24 h-24 flex items-center justify-center mx-auto"
                                    >
                                        <span className="text-6xl drop-shadow-2xl filter drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]">🍰</span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>`;

code = code.replace(targetMonthIcon, replaceMonthIcon);

fs.writeFileSync('src/components/BirthdayTab.tsx', code);
