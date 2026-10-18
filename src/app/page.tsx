import RobotCanvas from "@/components/mascot/robot-canvas";
import { Sparkles } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#11142B] px-6 py-12 text-[#F7F8FC]">
      <div className="mb-5 flex items-center gap-2 text-sm tracking-widest text-[#A8A2FF]">
        <Sparkles size={16} />
        YOUR SHOPPING BUDDY
      </div>

      <div className="aspect-[16/15] w-full max-w-[470px] overflow-hidden rounded-[28px] border border-white/10">
        <RobotCanvas />
      </div>

      <h1 className="mt-8 text-5xl font-bold tracking-tight">
        Kit<span className="text-[#A8A2FF]">Cart</span>
      </h1>

      <p className="mt-3 text-center text-[#F7F8FC]/70">
        Meet the future of shopping.
      </p>

      <div className="mt-7 rounded-full border border-[#6658D9]/40 bg-[#6658D9]/10 px-5 py-2 text-sm text-[#A8A2FF]">
        Interactive mascot prototype
      </div>
    </main>
  );
}