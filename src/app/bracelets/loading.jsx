"use client";

import { useEffect, useState } from "react";

export default function Loading() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90; // Stay at 90% until actual loading completes
        }
        return prev + 10;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] bg-white">
      <img
        src="/invlogo.jpg"
        alt="Loading..."
        className="w-28 md:w-40 mb-6 animate-pulse"
      />
      <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-2 bg-[#0a1833] transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-gray-600 mt-3 text-sm font-medium">
        Loading products...
      </p>
    </div>
  );
}
