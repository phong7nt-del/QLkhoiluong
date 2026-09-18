const fs = require('fs');
let code = fs.readFileSync('src/components/TutiTab.tsx', 'utf8');

const unprocHeaderOld = `                                <th className="px-4 py-3 min-w-[120px] bg-slate-50">Kết luận</th>
                                <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Người đưa lên</th>
                                <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Ngày đưa lên</th>
                            </tr>`;

const unprocHeaderNew = `                                <th className="px-4 py-3 min-w-[120px] bg-slate-50">Kết luận</th>
                                <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Người đưa lên</th>
                                <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Ngày đưa lên</th>
                                <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Người kiểm tra</th>
                                <th className="px-4 py-3 whitespace-nowrap bg-slate-50">Cập nhật lúc</th>
                            </tr>`;

code = code.replace(unprocHeaderOld, unprocHeaderNew);

const unprocTdOld = `                                        <td className="px-4 py-2 text-xs font-medium text-slate-500 whitespace-nowrap">
                                            {formatDate(t.ngayDuaLen)}
                                        </td>
                                    </tr>`;

const unprocTdNew = `                                        <td className="px-4 py-2 text-xs font-medium text-slate-500 whitespace-nowrap">
                                            {formatDate(t.ngayDuaLen)}
                                        </td>
                                        <td className="px-4 py-2 text-xs font-bold text-slate-600 whitespace-nowrap">
                                            {t.nguoiKiemTra}
                                        </td>
                                        <td className="px-4 py-2 text-xs text-slate-500 whitespace-nowrap">
                                            <div className="flex items-center gap-1">{t.ngayCapNhat && <Calendar className="w-3 h-3 opacity-70" />} {formatDate(t.ngayCapNhat)}</div>
                                        </td>
                                    </tr>`;

code = code.replace(unprocTdOld, unprocTdNew);

// Fix colSpan when empty
code = code.replace(/<td colSpan=\{10\}/, '<td colSpan={12}');

fs.writeFileSync('src/components/TutiTab.tsx', code);
