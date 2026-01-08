import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import es from "./locales/es.json";

const STORAGE_KEY = "ccch.language";

function detectInitialLanguage() {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (saved === "en" || saved === "es") return saved;

  const nav = (navigator.language || "en").toLowerCase();
  return nav.startsWith("es") ? "es" : "en";
}

// PUBLIC_INTERFACE
export function persistLanguage(language) {
  /** Persist selected language in local storage. */
  window.localStorage.setItem(STORAGE_KEY, language);
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: detectInitialLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

i18n.on("languageChanged", (lng) => persistLanguage(lng));

export default i18n;
