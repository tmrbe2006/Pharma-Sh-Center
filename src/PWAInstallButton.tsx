import React, { useState } from 'react';
import { usePWAInstall } from './usePWAInstall';
import { Download, X, Smartphone } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as standalone, do not display button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 text-sm font-semibold shadow-md shadow-teal-900/20 transition-all active:scale-95"
      >
        <Download className="w-4 h-4" />
        <span>تثبيت التطبيق على الجهاز</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-xl border border-teal-200/50 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 px-3 py-1.5 text-xs font-semibold transition-all"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>تثبيت على iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 text-slate-100" dir="rtl">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl relative">
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 left-4 p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition"
              >
                <X className="w-4 h-4" />
              </button>
              
              <h3 className="text-lg font-bold text-teal-400 flex items-center gap-2 mb-3">
                <Smartphone className="w-5 h-5" />
                تثبيت صيدلية الرعاية على iPhone / iPad
              </h3>
              
              <div className="space-y-4 text-sm text-slate-300 leading-relaxed py-2">
                <p>تثبيت التطبيق يتيح لك تشغيله كبرنامج مستقل حتى في حالة انقطاع الإنترنت وسرعة تحميل فائقة.</p>
                <div className="bg-slate-800/50 rounded-xl p-3.5 border border-slate-800 space-y-2">
                  <div className="flex gap-2">
                    <span className="font-bold text-teal-500">1.</span>
                    <span>اضغط على زر <strong>مشاركة (Share)</strong> في شريط متصفح Safari بالأسفل.</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-teal-500">2.</span>
                    <span>اسحب لأسفل واختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-teal-600 hover:bg-teal-700 py-2.5 text-sm font-bold text-white transition"
              >
                حسناً، فهمت
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
