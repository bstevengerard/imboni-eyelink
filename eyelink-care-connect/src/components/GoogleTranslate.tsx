import { useEffect } from "react";
import { Globe } from "lucide-react";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

export default function GoogleTranslate() {
  useEffect(() => {
    if (!window.googleTranslateElementInit) {
      window.googleTranslateElementInit = () => {
        try {
          if (window.google?.translate?.TranslateElement) {
            new window.google.translate.TranslateElement(
              { pageLanguage: "en", includedLanguages: "en,rw,fr,sw" },
              "google_translate_element"
            );
          }
        } catch (err) {
          console.warn("Google Translate init error:", err);
        }
      };
    }

    // Load script once
    if (!document.querySelector('script[src*="translate.google.com/translate_a/element.js"]')) {
      const s = document.createElement("script");
      s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      s.async = true;
      document.body.appendChild(s);
    }

    const checkAndInit = () => {
      const el = document.getElementById("google_translate_element");
      if (el && !el.hasChildNodes() && window.google?.translate?.TranslateElement) {
        try {
          new window.google.translate.TranslateElement(
            { pageLanguage: "en", includedLanguages: "en,rw,fr,sw" },
            "google_translate_element"
          );
        } catch (err) {
          console.warn("Init error:", err);
        }
      }
    };
    const initTimeout = setTimeout(checkAndInit, 500);

    const checkAndFixStyle = () => {
      if (document.body.style.top && document.body.style.top !== "0px") {
        document.body.style.setProperty("top", "0px", "important");
      }
      if (document.documentElement.style.top && document.documentElement.style.top !== "0px") {
        document.documentElement.style.setProperty("top", "0px", "important");
      }
    };
    const interval = setInterval(checkAndFixStyle, 450);

    return () => {
      clearInterval(interval);
      clearTimeout(initTimeout);
    };
  }, []);

  return (
    <div className="inline-flex items-center gap-1.5 bg-muted hover:bg-muted/80 border border-border rounded-xl px-2.5 py-1 transition duration-200 shrink-0 h-[32px] select-none cursor-pointer">
      <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
      <div
        id="google_translate_element"
        className="google-translate-container text-xs"
      ></div>
    </div>
  );
}
