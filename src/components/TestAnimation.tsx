import React from 'react';
export default function TestAnimation() {
  return (
    <div className="p-10">
      <div className="relative p-[3px] rounded-2xl overflow-hidden w-64 h-32">
        <div className="absolute inset-0 z-0 bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0%,transparent_75%,#ef4444_100%)] animate-[spin_2s_linear_infinite]" />
        <div className="relative z-10 w-full h-full bg-white rounded-2xl border border-gray-200">Test</div>
      </div>
    </div>
  )
}
