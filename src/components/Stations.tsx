import { useState, useMemo } from 'react';
import { DataStore, Station } from '../store/DataStore';
import { Search, Database, ChevronRight, Hash } from 'lucide-react';

export default function Stations() {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-[500px] h-[calc(100vh-16rem)]">
      <h2 className="text-2xl font-bold mb-4 uppercase tracking-widest text-[#141414]">Chi tiết Trạm Biến Áp</h2>
      <p className="mb-6 text-lg">
        Chi tiết tìm hiểu tại:{' '}
        <a 
          href="https://quan-ly-tram-bien-ap.vercel.app/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 font-bold hover:underline"
        >
          https://quan-ly-tram-bien-ap.vercel.app/
        </a>
      </p>
      <div className="w-full max-w-3xl border-2 border-[#141414] shadow-[8px_8px_0_#141414] overflow-hidden rounded-xl">
        <img 
          src="https://images.unsplash.com/photo-1627914371465-d0c3ebbbabfc?fm=jpg&q=80&w=1600&fit=crop" 
          alt="Trạm Biến Áp" 
          className="w-full h-auto object-cover aspect-video hover:scale-105 transition-transform duration-700"
        />
      </div>
    </div>
  );
}
