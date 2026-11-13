import type { ReactNode } from "react";
import "../reactbits-test-fix.css";

export default function AuroraTestLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="kitcart-rb-test">
      {children}
    </div>
  );
}
