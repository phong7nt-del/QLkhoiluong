const SCRIPT_TEMPLATE = `var h = rawVal.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/đ/g, 'd');`;
console.log(SCRIPT_TEMPLATE);
