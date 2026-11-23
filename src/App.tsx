import { HashRouter, Route, Routes, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { sound } from "@/lib/sound";
import { RecordsProvider } from "@/store/RecordsContext";
import Home from "@/pages/Home";
import BaselinePage from "@/pages/BaselinePage";
import TestPage from "@/pages/TestPage";
import ResultPage from "@/pages/ResultPage";
import HistoryPage from "@/pages/HistoryPage";

function AnimatedRoutes() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Home />} />
        <Route path="/baseline" element={<BaselinePage />} />
        <Route path="/test" element={<TestPage />} />
        <Route path="/result/:id" element={<ResultPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </AnimatePresence>
  );
}

function SoundToggle() {
  const [muted, setMuted] = useState(sound.muted);
  useEffect(() => sound.subscribe(setMuted), []);
  return (
    <button
      data-sfx="none"
      onClick={() => {
        sound.setMuted(!muted);
        if (muted) setTimeout(() => sound.play("click"), 0);
      }}
      className="fixed right-3 top-2.5 z-40 flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-surface/80 text-white/80 backdrop-blur transition active:scale-90"
      aria-label={muted ? "소리 켜기" : "소리 끄기"}
      title={muted ? "소리 켜기" : "소리 끄기"}
    >
      {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}

function useGlobalClickSound() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const btn = (e.target as HTMLElement | null)?.closest("button");
      if (btn && !btn.disabled && btn.dataset.sfx !== "none") sound.play("click");
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
}

export default function App() {
  useGlobalClickSound();
  return (
    <RecordsProvider>
      <HashRouter>
        <AnimatedRoutes />
        <SoundToggle />
      </HashRouter>
    </RecordsProvider>
  );
}
