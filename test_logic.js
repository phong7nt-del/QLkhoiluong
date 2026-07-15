const math = require('mathjs');
let membersCount1 = 6;
let qty1 = 20;
let isGroup = true;
let total = 0;
let numberOfGroups1 = Math.ceil(membersCount1 / 2);
total += (qty1 * numberOfGroups1);

let membersCount2 = 2;
let qty2 = 12;
let numberOfGroups2 = Math.ceil(membersCount2 / 2);
total += (qty2 * numberOfGroups2);

console.log("Total:", total);
