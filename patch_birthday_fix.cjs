const fs = require('fs');
let code = fs.readFileSync('src/components/BirthdayTab.tsx', 'utf8');

const targetStr = `        <div className="lg:col-span-2 space-y-6">
           {todayBirthdays.length > 0 ? (
               <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600 p-1 rounded-3xl shadow-xl overflow-hidden relative">`;

const replaceStr = `        <div className="lg:col-span-2 space-y-6">
           {todayBirthdays.length > 0 && (
               <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-purple-600 p-1 rounded-3xl shadow-xl overflow-hidden relative">`;

code = code.replace(targetStr, replaceStr);
fs.writeFileSync('src/components/BirthdayTab.tsx', code);
