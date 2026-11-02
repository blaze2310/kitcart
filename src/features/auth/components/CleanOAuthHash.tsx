"use client";

import { useEffect } from "react";

export default function CleanOAuthHash() {
  useEffect(() => {
    if (window.location.hash === "#_=_") {
      window.history.replaceState(
        window.history.state,
        "",
        window.location.pathname + window.location.search
      );
    }
  }, []);

  return null;
}
