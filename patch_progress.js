import fs from 'fs';

let code = fs.readFileSync('src/components/ProgressTab.tsx', 'utf-8');

// 1. Add isImportantTask
code = code.replace(
  "const parseDate = (dStr: string) => {",
  `const isImportantTask = (content: string) => {
      return content.trim().toLowerCase().startsWith('quan trọng');
  };

  const parseDate = (dStr: string) => {`
);

// 2. Modify sortedPendingTasks
const oldSort = `}).sort((a, b) => {
      return getDiffDays(a.deadline) - getDiffDays(b.deadline);
  });`;
const newSort = `}).sort((a, b) => {
      const aImp = isImportantTask(a.content);
      const bImp = isImportantTask(b.content);
      if (aImp && !bImp) return -1;
      if (!aImp && bImp) return 1;
      return getDiffDays(a.deadline) - getDiffDays(b.deadline);
  });`;
code = code.replace(oldSort, newSort);

// 3. Update Grid/Slider rendering
const gridRenderSearch = `                      <div key={\`\${t.id || 't'}-\${idx}\`} className={\`p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all \${colorClasses} \${pendingViewMode === 'slider' ? 'shrink-0 w-[85vw] sm:w-[320px] md:w-[380px] snap-center snap-always' : ''}\`}>`;

const gridRenderReplace = `                      <div key={\`\${t.id || 't'}-\${idx}\`} className={\`relative \${pendingViewMode === 'slider' ? 'shrink-0 w-[85vw] sm:w-[320px] md:w-[380px] snap-center snap-always' : ''} \${isImportantTask(t.content) ? 'p-[2px] rounded-2xl overflow-hidden' : ''}\`}>
                         {isImportantTask(t.content) && (
                            <div className="absolute inset-0 z-0 bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0%,transparent_60%,#fbbf24_100%)] animate-[spin_2s_linear_infinite]" />
                         )}
                         <div className={\`relative z-10 h-full w-full p-5 rounded-2xl flex flex-col justify-between shadow-sm hover:shadow-md transition-all \${colorClasses} \${isImportantTask(t.content) ? 'bg-white shadow-xl shadow-amber-500/20' : ''}\`}>`;

code = code.replace(gridRenderSearch, gridRenderReplace);

// We need to also close the new wrapper div for Grid/Slider mode.
const cardEndSearch = `                                  </div>
                               )}
                            </div>
                         </div>
                      </div>`;
const cardEndReplace = `                                  </div>
                               )}
                            </div>
                         </div>
                      </div>
                      </div>`;
code = code.replace(cardEndSearch, cardEndReplace);

// 4. Highlight Table Row
const tableRowSearch = `                         <tr key={\`\${t.id || 't'}-\${idx}\`} className="hover:bg-blue-50/50 transition-colors">`;
const tableRowReplace = `                         <tr key={\`\${t.id || 't'}-\${idx}\`} className={\`\${isImportantTask(t.content) ? 'bg-amber-50/50 hover:bg-amber-100/50 border-l-4 border-l-amber-400' : 'hover:bg-blue-50/50'} transition-colors\`}>`;
code = code.replace(tableRowSearch, tableRowReplace);

fs.writeFileSync('src/components/ProgressTab.tsx', code);
