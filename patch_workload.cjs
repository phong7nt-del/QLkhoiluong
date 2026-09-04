const fs = require('fs');
let content = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

// 1. Change initialization
content = content.replace(
    "tTasks[item.name] = { selected: false, quantity: item.quota || 1 };",
    "tTasks[item.name] = { selected: false, quantity: '' };"
);

// 2. Change toggleTask
const oldToggle = `const toggleTask = (name: string) => {
     setSelectedTasks(prev => ({
        ...prev,
        [name]: { ...prev[name], selected: !prev[name].selected }
     }));
  };`;

const newToggle = `const toggleTask = (name: string) => {
     setSelectedTasks(prev => {
        const isCurrentlySelected = prev[name]?.selected;
        if (!isCurrentlySelected) {
           setTimeout(() => {
               document.getElementById(\`task-qty-\${name}\`)?.focus();
           }, 50);
        }
        return {
          ...prev,
          [name]: { ...prev[name], selected: !isCurrentlySelected }
        };
     });
  };`;

content = content.replace(oldToggle, newToggle);

// 3. Add id to input
content = content.replace(
    `                            <input 
                              type="number"
                              min="0" step="any"
                              value={qty}
                              onChange={e => {
                                 updateQuantity(dm.name, e.target.value);
                              }}
                              className="w-full bg-[#141414] text-[#E4E3E0] font-bold p-1 text-center text-sm focus:outline-none"
                              placeholder="K.Lượng"
                            />`,
    `                            <input 
                              id={\`task-qty-\${dm.name}\`}
                              type="number"
                              min="0" step="any"
                              value={qty}
                              onChange={e => {
                                 updateQuantity(dm.name, e.target.value);
                              }}
                              className="w-full bg-[#141414] text-[#E4E3E0] font-bold p-1 text-center text-sm focus:outline-none"
                              placeholder="K.Lượng"
                            />`
);

fs.writeFileSync('src/components/WorkloadForm.tsx', content, 'utf8');
console.log("Patched WorkloadForm.tsx");
