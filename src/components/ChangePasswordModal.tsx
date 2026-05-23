import React, { useState } from 'react';
import { X, KeyRound, Save, Eye, EyeOff } from 'lucide-react';
import { DataStore, SheetMember } from '../store/DataStore';

interface ChangePasswordModalProps {
  onClose: () => void;
  sessionUser: SheetMember;
}

export default function ChangePasswordModal({ onClose, sessionUser }: ChangePasswordModalProps) {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPass.trim()) {
      setError('Vui lòng nhập mật khẩu mới');
      return;
    }
    if (newPass !== confirmPass) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }
    
    setError('');
    setIsSubmitting(true);
    
    const res = await DataStore.changePasswordToSheet(sessionUser.name, newPass);
    if (res) {
      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } else {
      setError('Đổi mật khẩu thất bại. Vui lòng thử lại sau.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 flex justify-between items-center text-white">
          <h2 className="font-bold tracking-wider uppercase flex items-center gap-2">
            <KeyRound className="w-5 h-5" /> Đổi mật khẩu
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors font-bold text-white outline-none">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 md:p-8">
          {success ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                <Save className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Đổi mật khẩu thành công!</h3>
              <p className="text-slate-600 font-medium">Mật khẩu mới đã được cập nhật.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl border border-red-200 text-sm font-bold text-center">
                  {error}
                </div>
              )}
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5 p-0.5">Tài khoản (Họ tên)</label>
                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 font-medium text-slate-600 shadow-inner">
                  {sessionUser.name}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 px-1 font-medium">Mật khẩu mới sẽ được gán vào trường Mã nhân viên của sheet CongTac.</p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5 p-0.5">Mật khẩu mới</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={newPass}
                    onChange={e => setNewPass(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                    placeholder="Nhập mật khẩu mới..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors outline-none"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 mb-1.5 p-0.5">Xác nhận mật khẩu</label>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPass}
                    onChange={e => setConfirmPass(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 pr-12 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all shadow-sm"
                    placeholder="Nhập lại mật khẩu..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors outline-none"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl font-bold uppercase text-xs border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition-all shadow-sm"
                >
                  Hủy
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl font-bold uppercase text-xs bg-blue-600 text-white shadow-md hover:bg-blue-700 hover:shadow-lg transition-all flex items-center justify-center min-w-[120px]"
                >
                  {isSubmitting ? 'ĐANG LƯU...' : 'CẬP NHẬT'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
