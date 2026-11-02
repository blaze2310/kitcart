
import Link from "next/link";
import RobotVisorCalibration from "@/features/robot/2d/robot-visor-calibration";

export default function Visor3DCalibrationPage() {
  return (
    <main className="min-h-screen bg-[#11142B] px-5 py-8 text-[#F7F8FC]">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A8A2FF]">
              KitCart Robot Development
            </p>

            <h1 className="mt-2 text-3xl font-bold">
              3D Visor Calibration
            </h1>

            <p className="mt-2 text-sm text-white/60">
              Position the temporary facial display
              on the real animated head.
            </p>
          </div>

          <Link
            href="/visor-lab"
            className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10"
          >
            Expression Lab
          </Link>
        </header>

        <RobotVisorCalibration />
      </div>
    </main>
  );
}
