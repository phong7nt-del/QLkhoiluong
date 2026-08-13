const fs = require('fs');
let code = fs.readFileSync('src/components/Login.tsx', 'utf8');

code = code.replace(
  `        if (mMsnv) {
          const cleanMsnv = mMsnv.toLowerCase().replace(/^0+/, '');
          const cleanInputPass = normalizedInputPass.replace(/^0+/, '');
          
          if (cleanMsnv === cleanInputPass || mMsnv.toLowerCase() === normalizedInputPass) return true;
          
          const digitsMsnv = mMsnv.replace(/\\D/g, '');
          const digitsInput = normalizedInputPass.replace(/\\D/g, '');
          if (digitsMsnv && digitsInput && digitsMsnv.replace(/^0+/, '') === digitsInput.replace(/^0+/, '')) return true;
          
          return false;
        }
        
        // If sheet doesn't have an explicit MSNV field, we might fail. Let's just fail them with a specific message.
        return false;
      });

      if (foundMember) {`,
  `        if (mMsnv) {
          const cleanMsnv = mMsnv.toLowerCase().replace(/^0+/, '');
          const cleanInputPass = normalizedInputPass.replace(/^0+/, '');
          
          if (cleanMsnv === cleanInputPass || mMsnv.toLowerCase() === normalizedInputPass) return true;
          
          const digitsMsnv = mMsnv.replace(/\\D/g, '');
          const digitsInput = normalizedInputPass.replace(/\\D/g, '');
          if (digitsMsnv && digitsInput && digitsMsnv.replace(/^0+/, '') === digitsInput.replace(/^0+/, '')) return true;
          
          return false;
        }
        
        return false;
      });

      const memberByName = members.find(m => normalizeStr(m.name) === normalizedInputName);

      if (foundMember) {`
);

// Add missing MSNV check
code = code.replace(
  `      } else {
        // Did not match any member with this MSNV
        setError('Sai tên đăng nhập hoặc mật khẩu (MSNV)! Vui lòng kiểm tra lại.');
        setIsLoading(false);
      }`,
  `      } else {
        if (memberByName && !getMsnv(memberByName)) {
            setError('Lỗi hệ thống: Dữ liệu chưa có MSNV. Quản trị viên cần cập nhật mã Google Apps Script mới trong mục Cấu hình!');
        } else {
            setError('Sai tên đăng nhập hoặc mật khẩu (MSNV)! Vui lòng kiểm tra lại.');
        }
        setIsLoading(false);
      }`
);

// Add datalist
code = code.replace(
  `                       <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Nhập họ tên của bạn..."
                          className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl focus:bg-white focus:ring-0 focus:border-[#141414] transition-all outline-none text-[#141414] font-bold placeholder:text-slate-400 placeholder:font-medium shadow-sm hover:border-slate-300"
                          disabled={isLoading || isInitializing}
                       />`,
  `                       <datalist id="members-list">
                          {DataStore.getMembers().map((m, i) => (
                              <option key={i} value={m.name} />
                          ))}
                       </datalist>
                       <input
                          type="text"
                          list="members-list"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Nhập họ tên của bạn..."
                          className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-200 rounded-xl focus:bg-white focus:ring-0 focus:border-[#141414] transition-all outline-none text-[#141414] font-bold placeholder:text-slate-400 placeholder:font-medium shadow-sm hover:border-slate-300"
                          disabled={isLoading || isInitializing}
                       />`
);

fs.writeFileSync('src/components/Login.tsx', code, 'utf8');
