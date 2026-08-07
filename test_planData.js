import fs from 'fs';
const history = { 'D - 8/2026': 35, 'V - 8/2026': 35 };
const selectedMonth = '8/2026';
const selectedTeam = 'Đội'; // Or any team
let prefix = 'Tháng';
if (selectedTeam === 'Đội') prefix = 'D -';
const planColumnKey = `${prefix} ${selectedMonth}`;

let planQty = 0;
if (history) {
    if (history[planColumnKey] !== undefined) {
        planQty = history[planColumnKey];
    } else if (selectedTeam.includes('Đội') && history[`D - ${selectedMonth}`] !== undefined) {
        planQty = history[`D - ${selectedMonth}`];
    }
}
console.log(planQty);
