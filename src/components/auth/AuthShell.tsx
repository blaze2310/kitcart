"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";

const Robot = dynamic(() => import("@/components/robot/RobotLogin3D"), { ssr: false });
type Controls = {
  setUsernameFocused: (value: boolean) => void;
  setPasswordVisible: (value: boolean) => void;
  passwordVisible: boolean;
  wave: () => void;
  sad: () => void;
};
const AuthContext = createContext<Controls | null>(null);
export function useAuthRobot() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuthRobot must be inside AuthShell");
  return context;
}

export default function AuthShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [mismatchSignal, setMismatchSignal] = useState(0);
  const [reactionSignal, setReactionSignal] = useState(0);
  const wave = () => { setUsernameFocused(false); setPasswordVisible(false); setReactionSignal(n => n + 1); };
  const sad = () => setMismatchSignal(n => n + 1);
  const controls = { setUsernameFocused, setPasswordVisible, passwordVisible, wave, sad };

  return (
    <AuthContext.Provider value={controls}>
      <main className="kc-auth">
        <header className="kc-nav">
          <nav className="kc-nav-inner" aria-label="KitCart">
            <Link href="/login" onClick={wave} className="kc-brand">
              <span className="kc-brand-icon"><ShoppingBag size={22} /></span>
              <span className="kc-brand-name">Kit<span>Cart</span></span>
            </Link>
            <span className="kc-tagline">Your friendly shopping companion</span>
          </nav>
        </header>
        <div className="kc-layout">
          <section className="kc-hero" aria-label="Meet your KitCart robot">
            <div className="kc-robot-stage">
              <Canvas camera={{ position: [0, 0, 4.2], fov: 35, near: 0.01, far: 100 }} dpr={[1, 1.75]} gl={{ alpha: true, antialias: true }}>
                <ambientLight intensity={1.8} />
                <hemisphereLight args={["#e8f4ff", "#7970a9", 2]} />
                <directionalLight position={[3, 4, 5]} intensity={3} />
                <directionalLight position={[-3, 2, -4]} intensity={2} />
                <Robot usernameFocused={usernameFocused} passwordFocused={false} passwordVisible={passwordVisible} mismatchSignal={mismatchSignal} reactionSignal={reactionSignal} />
              </Canvas>
            </div>
            <h2>{pathname === "/signup" ? "Your new shopping companion" : "Meet your shopping buddy"}</h2>
            <p>{pathname === "/signup" ? "Meet the little robot who makes shopping feel more personal." : "Tracks your cursor, reacts to typing, blinks and celebrates with you."}</p>
          </section>
          {children}
        </div>
      </main>
    </AuthContext.Provider>
  );
}
