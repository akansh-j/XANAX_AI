import { Check, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";

import { showToast } from "../components/Toast";
import {
  ApiError,
  getAppStatus,
  getUserSettings,
  quitApp,
  saveApiKeys,
  saveLocation,
  testApiKeys,
} from "../services/api";
import type { AppStatus } from "../types/api";

interface SettingsProps {
  onLogout: () => void;
}

const sectionClass = "rounded-2xl border border-line bg-card p-6 sm:p-7";
const inputClass =
  "w-full rounded-xl border border-line bg-soft px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-white/25 focus:outline-none";
const labelClass =
  "mb-2 block text-xs uppercase tracking-[0.14em] text-muted";
const primaryButtonClass =
  "rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60";

export default function Settings({ onLogout }: SettingsProps) {
  const [location, setLocation] = useState("");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [savingLocation, setSavingLocation] = useState(false);

  const [geminiKey, setGeminiKey] = useState("");
  const [openWeatherKey, setOpenWeatherKey] = useState("");
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenWeatherKey, setShowOpenWeatherKey] = useState(false);
  const [geminiPassed, setGeminiPassed] = useState(false);
  const [openWeatherPassed, setOpenWeatherPassed] = useState(false);
  const [testingGemini, setTestingGemini] = useState(false);
  const [geminiTestStatus, setGeminiTestStatus] = useState<{ valid: boolean; message: string } | null>(null);
  const [testingWeather, setTestingWeather] = useState(false);
  const [weatherTestStatus, setWeatherTestStatus] = useState<{ valid: boolean; message: string } | null>(null);
  const [keysError, setKeysError] = useState<string | null>(null);
  const [savingKeys, setSavingKeys] = useState(false);

  const [appStatus, setAppStatus] = useState<AppStatus | null>(null);
  const [quitting, setQuitting] = useState(false);

  // Fetch current user settings & API keys on mount
  useEffect(() => {
    let cancelled = false;

    void getUserSettings()
      .then((settings) => {
        if (!cancelled) {
          if (settings.location) setLocation(settings.location);
          if (settings.gemini_api_key) {
            setGeminiKey(settings.gemini_api_key);
            setGeminiPassed(true);
          }
          if (settings.openweather_api_key) {
            setOpenWeatherKey(settings.openweather_api_key);
            setOpenWeatherPassed(true);
          }
        }
      })
      .catch(() => {
        // Not fatal
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The Quit button only makes sense when the desktop launcher owns this
  // process, since it is the only thing that can stop the backend. In a plain
  // browser session there is nothing of ours to shut down.
  useEffect(() => {
    let cancelled = false;

    void getAppStatus()
      .then((status) => {
        if (!cancelled) setAppStatus(status);
      })
      .catch(() => {
        // Not fatal — the Application section simply stays hidden.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleQuit() {
    if (quitting) return;

    setQuitting(true);

    try {
      await quitApp();
      showToast("Xanax AI is closing...");
    } catch {
      setQuitting(false);
      showToast("We couldn't close Xanax AI.", "error");
    }
  }

  async function handleSaveLocation(event: React.FormEvent) {
    event.preventDefault();

    if (savingLocation) return;

    const trimmed = location.trim();

    setLocationError(null);
    setSavingLocation(true);

    try {
      await saveLocation({ location: trimmed });
      showToast(trimmed ? "Location saved" : "Location cleared");
    } catch (caught) {
      setLocationError(
        caught instanceof ApiError
          ? caught.message
          : "We couldn't save your location right now.",
      );
    } finally {
      setSavingLocation(false);
    }
  }

  async function handleSaveKeys(event: React.FormEvent) {
    event.preventDefault();

    if (savingKeys) return;

    const trimmedGemini = geminiKey.trim();

    if (!trimmedGemini) {
      setKeysError("A Gemini API key is required.");
      return;
    }

    setKeysError(null);
    setSavingKeys(true);

    try {
      const trimmedOpenWeather = openWeatherKey.trim();

      await saveApiKeys({
        gemini_api_key: trimmedGemini,
        ...(trimmedOpenWeather
          ? { openweather_api_key: trimmedOpenWeather }
          : {}),
      });

      setGeminiPassed(true);
      setOpenWeatherPassed(Boolean(trimmedOpenWeather));
      showToast("API keys saved and verified!");
    } catch (caught) {
      setKeysError(
        caught instanceof ApiError
          ? caught.message
          : "We couldn't save your API keys right now.",
      );
    } finally {
      setSavingKeys(false);
    }
  }

  async function handleTestGemini() {
    const trimmed = geminiKey.trim();
    if (!trimmed) {
      setGeminiTestStatus({ valid: false, message: "Enter a Gemini key first." });
      return;
    }

    setTestingGemini(true);
    setGeminiTestStatus(null);

    try {
      const res = await testApiKeys({ gemini_api_key: trimmed });
      if (res.gemini) {
        setGeminiTestStatus(res.gemini);
        if (res.gemini.valid) {
          setGeminiPassed(true);
        }
      }
    } catch (caught) {
      setGeminiTestStatus({
        valid: false,
        message: caught instanceof ApiError ? caught.message : "Connection test failed.",
      });
    } finally {
      setTestingGemini(false);
    }
  }

  async function handleTestWeather() {
    const trimmed = openWeatherKey.trim();
    if (!trimmed) {
      setWeatherTestStatus({ valid: false, message: "Enter an OpenWeather key first." });
      return;
    }

    setTestingWeather(true);
    setWeatherTestStatus(null);

    try {
      const res = await testApiKeys({ openweather_api_key: trimmed });
      if (res.openweather) {
        setWeatherTestStatus(res.openweather);
        if (res.openweather.valid) {
          setOpenWeatherPassed(true);
        }
      }
    } catch (caught) {
      setWeatherTestStatus({
        valid: false,
        message: caught instanceof ApiError ? caught.message : "Connection test failed.",
      });
    } finally {
      setTestingWeather(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
      <h1 className="text-2xl font-semibold text-ink sm:text-3xl">
        Settings
      </h1>

      <section className={`mt-8 ${sectionClass}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Location</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              Add your city for weather-aware outfit suggestions. This is
              optional.
            </p>
          </div>

          <span className="shrink-0 text-xs text-muted">Optional</span>
        </div>

        <form onSubmit={handleSaveLocation} className="mt-5">
          <label htmlFor="location" className={labelClass}>
            City
          </label>

          <input
            id="location"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Addis Ababa"
            className={inputClass}
          />

          <p className="mt-2 text-xs text-muted">
            Enter your city only, for example: Addis Ababa.
          </p>

          {locationError && (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {locationError}
            </p>
          )}

          <button
            type="submit"
            disabled={savingLocation}
            className={`mt-5 ${primaryButtonClass}`}
          >
            {savingLocation ? "Saving..." : "Save location"}
          </button>
        </form>
      </section>

      <section className={`mt-6 ${sectionClass}`}>
        <h2 className="text-lg font-semibold text-ink">API configuration</h2>

        <p className="mt-2 text-sm leading-relaxed text-muted">
          Stored securely on your device. You can view or update your keys anytime using the show/hide toggle.
        </p>

        {geminiPassed && (
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-emerald-300">
            <CheckCircle2 size={20} className="shrink-0 text-emerald-400" />
            <div className="flex-1 text-xs sm:text-sm">
              <p className="font-semibold text-emerald-300">Configuration Passed</p>
              <p className="mt-0.5 text-xs text-emerald-400/80">
                Gemini API key is configured and passed.
                {openWeatherPassed ? " OpenWeather key passed for local weather." : ""}
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSaveKeys} className="mt-5 space-y-5">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor="gemini-api-key" className={`${labelClass} mb-0`}>
                Gemini API key
              </label>

              {geminiPassed ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  <Check size={12} /> Passed
                </span>
              ) : (
                <span className="text-xs text-muted">Required</span>
              )}
            </div>

            <div className="relative mt-2">
              <input
                id="gemini-api-key"
                type={showGeminiKey ? "text" : "password"}
                value={geminiKey}
                autoComplete="new-password"
                onChange={(event) => {
                  setGeminiKey(event.target.value);
                  if (!event.target.value.trim()) {
                    setGeminiPassed(false);
                  }
                }}
                placeholder="Paste your Gemini API key"
                className={`pr-10 ${inputClass}`}
              />

              <button
                type="button"
                onClick={() => setShowGeminiKey((prev) => !prev)}
                aria-label={showGeminiKey ? "Hide Gemini API key" : "Show Gemini API key"}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted transition-colors hover:text-ink focus:outline-none"
              >
                {showGeminiKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent underline-offset-4 hover:underline"
              >
                Get a Gemini API key →
              </a>

              <button
                type="button"
                onClick={handleTestGemini}
                disabled={testingGemini || !geminiKey.trim()}
                className="rounded-full border border-line bg-soft px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testingGemini ? "Testing..." : "Test key"}
              </button>
            </div>

            {geminiTestStatus && (
              <p
                role="status"
                className={`mt-2 flex items-center gap-1.5 text-xs ${
                  geminiTestStatus.valid ? "text-emerald-400" : "text-red-300"
                }`}
              >
                {geminiTestStatus.valid && <Check size={14} className="shrink-0" />}
                {geminiTestStatus.message}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label
                htmlFor="openweather-api-key"
                className={`${labelClass} mb-0`}
              >
                OpenWeather API key
              </label>

              {openWeatherPassed ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                  <Check size={12} /> Passed
                </span>
              ) : (
                <span className="text-xs text-muted">Optional</span>
              )}
            </div>

            <div className="relative mt-2">
              <input
                id="openweather-api-key"
                type={showOpenWeatherKey ? "text" : "password"}
                value={openWeatherKey}
                autoComplete="new-password"
                onChange={(event) => {
                  setOpenWeatherKey(event.target.value);
                  if (!event.target.value.trim()) {
                    setOpenWeatherPassed(false);
                  }
                }}
                placeholder="Paste your OpenWeather API key"
                className={`pr-10 ${inputClass}`}
              />

              <button
                type="button"
                onClick={() => setShowOpenWeatherKey((prev) => !prev)}
                aria-label={showOpenWeatherKey ? "Hide OpenWeather API key" : "Show OpenWeather API key"}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted transition-colors hover:text-ink focus:outline-none"
              >
                {showOpenWeatherKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3">
              <a
                href="https://home.openweathermap.org/api_keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent underline-offset-4 hover:underline"
              >
                Get an OpenWeather API key →
              </a>

              <button
                type="button"
                onClick={handleTestWeather}
                disabled={testingWeather || !openWeatherKey.trim()}
                className="rounded-full border border-line bg-soft px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {testingWeather ? "Testing..." : "Test key"}
              </button>
            </div>

            {weatherTestStatus && (
              <p
                role="status"
                className={`mt-2 flex items-center gap-1.5 text-xs ${
                  weatherTestStatus.valid ? "text-emerald-400" : "text-red-300"
                }`}
              >
                {weatherTestStatus.valid && <Check size={14} className="shrink-0" />}
                {weatherTestStatus.message}
              </p>
            )}
          </div>

          {keysError && (
            <p role="alert" className="text-sm text-red-300">
              {keysError}
            </p>
          )}

          <button
            type="submit"
            disabled={savingKeys}
            className={primaryButtonClass}
          >
            {savingKeys ? "Saving..." : "Save API keys"}
          </button>
        </form>
      </section>

      <section className={`mt-6 ${sectionClass}`}>
        <h2 className="text-lg font-semibold text-ink">Account</h2>

        <p className="mt-2 text-sm leading-relaxed text-muted">
          You are signed in on this device. Logging out clears your session
          cookies.
        </p>

        <button
          type="button"
          onClick={onLogout}
          className="mt-5 rounded-full border border-line bg-soft px-5 py-2.5 text-sm text-ink transition-colors hover:border-white/20"
        >
          Log out
        </button>
      </section>

      {appStatus?.desktop && (
        <section className={`mt-6 ${sectionClass}`}>
          <h2 className="text-lg font-semibold text-ink">Application</h2>

          <p className="mt-2 text-sm leading-relaxed text-muted">
            Xanax AI runs in the background while you use it. Quit when you are
            finished — your wardrobe, images and settings stay on this computer
            for next time.
          </p>

          <button
            type="button"
            onClick={handleQuit}
            disabled={quitting}
            className="mt-5 rounded-full border border-line bg-soft px-5 py-2.5 text-sm text-ink transition-colors hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {quitting ? "Closing..." : "Quit Xanax AI"}
          </button>

          <p className="mt-3 text-xs text-muted">
            Xanax AI {appStatus.version}
          </p>
        </section>
      )}
    </div>
  );
}

