
import Link from "next/link";
import RobotTripoTest from "@/features/robot/2d/robot-tripo-test";

export default function Robot3DTestPage() {
  return (
    <main className="min-h-screen bg-[#11142B] px-5 py-8 text-[#F7F8FC]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#A8A2FF]">
              KitCart Development
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              Tripo 3D Animation Test
            </h1>

            <p className="mt-2 text-sm text-white/60">
              Original compatible Mixamo rig — idle, walk,
              and head movement.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
          >
            Homepage
          </Link>
        </div>

        <RobotTripoTest />
      </div>
    </main>
  );
}
