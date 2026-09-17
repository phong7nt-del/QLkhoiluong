const fs = require('fs');
let code = fs.readFileSync('src/components/BirthdayTab.tsx', 'utf8');

const targetLyrics = `<div className="text-sm text-slate-600 space-y-2 font-medium italic relative z-10 leading-relaxed">
                    <p>Happy birthday to you,</p>`;

const replaceLyrics = `<div className="relative z-10 mb-4">
                    <audio 
                        controls 
                        autoPlay 
                        className="w-full h-10 rounded-full"
                        src="https://upload.wikimedia.org/wikipedia/commons/2/29/Happy_Birthday_to_You.ogg"
                    >
                        Trình duyệt của bạn không hỗ trợ thẻ audio.
                    </audio>
                </div>
                <div className="text-sm text-slate-600 space-y-2 font-medium italic relative z-10 leading-relaxed">
                    <p>Happy birthday to you,</p>`;

code = code.replace(targetLyrics, replaceLyrics);
fs.writeFileSync('src/components/BirthdayTab.tsx', code);
