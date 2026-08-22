const fs = require('fs');
let content = fs.readFileSync('src/components/TutiTab.tsx', 'utf8');

// 1. Add toastMessage and limits to state
content = content.replace(
    "    const [isProcessedExpanded, setIsProcessedExpanded] = useState(true);",
    `    const [isProcessedExpanded, setIsProcessedExpanded] = useState(true);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [unprocessedLimit, setUnprocessedLimit] = useState(30);
    const [processedLimit, setProcessedLimit] = useState(30);`
);

// 2. Add toast popup to handleSaveNew
content = content.replace(
    "        setIsSubmitting(false);",
    `        setIsSubmitting(false);
        setToastMessage("Thêm mới thành công!");
        setTimeout(() => setToastMessage(null), 3000);`
);

// 3. Add toast popup to handleSaveEdit
content = content.replace(
    "        window.dispatchEvent(new Event('workload_updated'));",
    `        window.dispatchEvent(new Event('workload_updated'));
        setToastMessage("Lưu thành công!");
        setTimeout(() => setToastMessage(null), 3000);`
);

// 4. Implement virtual limit arrays
content = content.replace(
    "    const unprocessed = entries.filter(e => !isProcessed(e));",
    `    const unprocessedAll = entries.filter(e => !isProcessed(e));`
);

content = content.replace(
    "    // Sort unprocessed ascending\n    unprocessed.sort((a, b) => (a.maTram || '').localeCompare(b.maTram || ''));",
    `    // Sort unprocessed ascending
    unprocessedAll.sort((a, b) => (a.maTram || '').localeCompare(b.maTram || ''));
    const unprocessed = unprocessedAll.slice(0, unprocessedLimit);`
);

content = content.replace(
    "    const filteredProcessed = processed.filter(e => {",
    `    const filteredProcessedAll = processed.filter(e => {`
);

content = content.replace(
    "        );\n    });\n\n    const missingWarnings",
    `        );
    });
    const filteredProcessed = filteredProcessedAll.slice(0, processedLimit);

    const missingWarnings`
);

// 5. Add "Show more" buttons to the end of tables
content = content.replace(
    "                        </tbody>\n                    </table>\n                </div>\n                )}\n            </div>",
    `                        </tbody>
                    </table>
                </div>
                )}
                {isUnprocessedExpanded && unprocessedAll.length > unprocessedLimit && (
                    <div className="flex justify-center p-3 border-t border-slate-100">
                        <button onClick={() => setUnprocessedLimit(prev => prev + 50)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">Hiển thị thêm</button>
                    </div>
                )}
            </div>`
);

content = content.replace(
    "                        </tbody>\n                    </table>\n                </div>\n                )}\n            </div>\n            \n        </div>",
    `                        </tbody>
                    </table>
                </div>
                )}
                {isProcessedExpanded && filteredProcessedAll.length > processedLimit && (
                    <div className="flex justify-center p-3 border-t border-slate-100">
                        <button onClick={() => setProcessedLimit(prev => prev + 50)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors">Hiển thị thêm</button>
                    </div>
                )}
            </div>
            {toastMessage && (
                <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-lg shadow-green-900/20 font-bold text-sm animate-in slide-in-from-bottom-4 flex items-center gap-2 z-50">
                    <CheckCircle className="w-5 h-5" />
                    {toastMessage}
                </div>
            )}
        </div>`
);

// 6. Update table headers to use the full counts instead of limited counts
content = content.replace(
    "Danh sách cần xử lý ({unprocessed.length})",
    "Danh sách cần xử lý ({unprocessedAll.length})"
);
content = content.replace(
    "Danh sách đã xử lý ({filteredProcessed.length})",
    "Danh sách đã xử lý ({filteredProcessedAll.length})"
);

fs.writeFileSync('src/components/TutiTab.tsx', content, 'utf8');
console.log("Patched TutiTab.tsx!");
