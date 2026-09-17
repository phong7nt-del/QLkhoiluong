const fs = require('fs');
let code = fs.readFileSync('src/components/BirthdayTab.tsx', 'utf8');

const targetConfetti = `    if (todayList.length > 0) {
        // Trigger confetti
        const duration = 5 * 1000;
        const end = Date.now() + duration;

        const frame = () => {
            confetti({
                particleCount: 5,
                angle: 60,
                spread: 55,
                origin: { x: 0 },
                colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
            });
            confetti({
                particleCount: 5,
                angle: 120,
                spread: 55,
                origin: { x: 1 },
                colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
            });

            if (Date.now() < end) {
                requestAnimationFrame(frame);
            }
        };
        frame();
    }`;

const replaceConfetti = `    if (todayList.length > 0) {
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
    }`;

if (code.includes(targetConfetti)) {
    code = code.replace(targetConfetti, replaceConfetti);
} else {
    // try a safer regex
    code = code.replace(/if \(todayList\.length > 0\) \{[\s\S]*?frame\(\);\n\s*\}/, replaceConfetti);
}

const targetAudio = `<audio 
                        controls 
                        autoPlay 
                        className="w-full h-10 rounded-full"
                        src="https://upload.wikimedia.org/wikipedia/commons/2/29/Happy_Birthday_to_You.ogg"
                    >`;
                    
const replaceAudio = `<audio 
                        controls 
                        className="w-full h-10 rounded-full"
                        src="https://github.com/BaseMax/happy-birth-letter/raw/main/happy-birthday.mp3"
                    >`;

code = code.replace(targetAudio, replaceAudio);

fs.writeFileSync('src/components/BirthdayTab.tsx', code);
