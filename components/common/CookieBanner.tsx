"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getStoredConsent, setStoredConsent, type ConsentValue } from "@/lib/analytics-consent";

export function CookieBanner() {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getStoredConsent() === null);
  }, []);

  if (searchParams.get("headless") === "1") return null;
  if (!visible) return null;

  return (
    <div role="dialog" aria-label="Cookie consent" aria-modal="false" className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:max-w-md">
      <div className="rounded-2xl border bg-background/95 p-4 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-background/90">
        <p className="text-sm text-muted-foreground">
          We use cookies to improve Verdict. Optional analytics help us see what readers use. See our{" "}
          <a href="/privacy-policy" className="font-medium underline">Privacy Policy</a>.
        </p>
        <div className="mt-3 flex justify-end gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => persistPreference("declined")}>Decline</Button>
          <Button type="button" size="sm" onClick={() => persistPreference("accepted")}>Accept</Button>
        </div>
      </div>
    </div>
  );

  function persistPreference(value: ConsentValue) {
    setStoredConsent(value);
    setVisible(false);
  }
}
