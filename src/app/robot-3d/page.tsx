
import Link from "next/link";

import Robot3DCanvas from "@/components/mascot/robot-3d-canvas";

export default function Robot3DTestPage() {
  return (
    <main className="flex min-h-screen flex-col items-center bg-[#11142B] px-4 py-8 text-[#F7F8FC]">
      <div className="mb-6 flex w-full max-w-5xl items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#A8A2FF]">
            KitCart Development
          </p>

          <h1 className="mt-2 text-2xl font-bold">
            3D Robot Studio
          </h1>

          <p className="mt-2 text-sm text-white/60">
            Final Hunyuan GLB — lighting and model test
          </p>
        </div>

        <Link
          href="/"
          className="rounded-full border border-white/20 px-4 py-2 text-sm text-white transition-colors hover:bg-white/10"
        >
          Back to 2.5D
        </Link>
      </div>

      <div className="aspect-square w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/10">
        <Robot3DCanvas />
      </div>

      <p className="mt-5 max-w-xl text-center text-sm text-white/60">
        This is an isolated 3D development preview.
        Your existing KitCart robot remains unchanged.
      </p>
    </main>
  );
}
