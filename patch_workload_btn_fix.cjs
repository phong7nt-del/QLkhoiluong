const fs = require('fs');
let code = fs.readFileSync('src/components/WorkloadForm.tsx', 'utf8');

const oldBtns = `<div className="flex flex-col sm:flex-row gap-3">
          <button 
            type="submit"
            disabled={isSubmitting || members.length === 0}
            className={\`flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 \${isSubmitting ? 'opacity-50 cursor-not-allowed text-white/50' : 'hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0'}\`}
          >
            {isSubmitting ? 'ĐANG ĐỒNG BỘ...' : 'Cập Nhật Lên Hệ Thống [Enter]'}
          </button>
          
          {isManagement && (
              <button 
                type="button"`;

const newBtns = `<div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex gap-3">
              <button 
                type="submit"
                disabled={isSubmitting || members.length === 0}
                className={\`flex-1 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 \${isSubmitting ? 'opacity-50 cursor-not-allowed text-white/50' : 'hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0'}\`}
              >
                {isSubmitting ? 'ĐANG ĐỒNG BỘ...' : 'Cập Nhật Lên Hệ Thống [Enter]'}
              </button>
              
              {isDeleteAllowed() && (
                  <button
                     type="button"
                     disabled={isSubmitting}
                     onClick={handleDeleteGroup}
                     className={\`px-6 py-4 bg-red-100 text-red-600 font-bold text-base rounded-xl transition-all shadow-sm border border-red-200 flex items-center justify-center gap-2 \${isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-200 hover:text-red-700 hover:-translate-y-0.5'}\`}
                  >
                     Xóa báo cáo
                  </button>
              )}
          </div>
          
          {isManagement && (
              <button 
                type="button"`;

code = code.replace(oldBtns, newBtns);
fs.writeFileSync('src/components/WorkloadForm.tsx', code, 'utf8');
