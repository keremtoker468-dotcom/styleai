"use client";

import { useState } from "react";
import {
  StyleProfile,
  getUserId,
  saveStyleProfile,
} from "@/lib/supabase";

const STYLE_OPTIONS = [
  "Minimalist",
  "Streetwear",
  "Old Money",
  "Casual",
  "Bohemian",
  "Sporty",
  "Elegant",
  "Y2K",
  "Quiet Luxury",
  "Vintage",
  "Preppy",
  "Grunge",
];

const COLOR_OPTIONS = [
  "Siyah",
  "Beyaz",
  "Lacivert",
  "Bej",
  "Kahverengi",
  "Gri",
  "Kirmizi",
  "Yesil",
  "Mavi",
  "Pembe",
  "Mor",
  "Turuncu",
];

const AVOIDED_OPTIONS = [
  "Neon renkler",
  "Oversize",
  "Slim fit",
  "Desenli",
  "Parlak kumas",
  "Crop top",
  "Kisa etek",
  "Yuksek topuk",
  "Spor ayakkabi",
  "Taki/aksesuar",
];

interface StyleProfileSetupProps {
  onComplete: (profile: StyleProfile | null) => void;
}

function ChipSelector({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (option: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2.5" role="group">
      {options.map((option, i) => (
        <button
          key={option}
          onClick={() => onToggle(option)}
          className={`opacity-0 animate-scale-in px-4 py-2 rounded-full text-xs tracking-wide transition-all duration-200 border cursor-pointer font-medium ${
            selected.includes(option)
              ? "bg-foreground text-background border-foreground shadow-glass"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground/40 hover:text-foreground hover:bg-foreground/5"
          }`}
          style={{ animationDelay: `${i * 0.03}s` }}
          role="checkbox"
          aria-checked={selected.includes(option)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

export default function StyleProfileSetup({
  onComplete,
}: StyleProfileSetupProps) {
  const [step, setStep] = useState(0);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [age, setAge] = useState("");
  const [size, setSize] = useState("");
  const [shoeSize, setShoeSize] = useState("");
  const [stylePreferences, setStylePreferences] = useState<string[]>([]);
  const [colorPreferences, setColorPreferences] = useState<string[]>([]);
  const [avoidedStyles, setAvoidedStyles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const toggleChip = (
    list: string[],
    setter: (val: string[]) => void,
    option: string
  ) => {
    setter(
      list.includes(option)
        ? list.filter((s) => s !== option)
        : [...list, option]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    const userId = getUserId();
    const profile: StyleProfile = {
      user_id: userId,
      height: height || undefined,
      weight: weight || undefined,
      age: age || undefined,
      size: size || undefined,
      shoe_size: shoeSize || undefined,
      style_preferences:
        stylePreferences.length > 0 ? stylePreferences : undefined,
      color_preferences:
        colorPreferences.length > 0 ? colorPreferences : undefined,
      avoided_styles: avoidedStyles.length > 0 ? avoidedStyles : undefined,
    };
    const saved = await saveStyleProfile(profile);
    setSaving(false);
    onComplete(saved || profile);
  };

  const handleSkip = () => {
    getUserId();
    onComplete(null);
  };

  const steps = [
    // Step 0: Body measurements
    <div key="body" className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
          Seni taniyalim
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Daha iyi oneriler icin birkac bilgi yeterli. Tum alanlar istege
          baglidir.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="height-input"
            className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block font-medium"
          >
            Boy
          </label>
          <input
            id="height-input"
            type="text"
            placeholder="170 cm"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full bg-transparent border border-border rounded-xl px-3 py-3 text-sm outline-none focus:border-accent focus:shadow-accent-glow transition-all duration-200 placeholder:text-muted-foreground/40"
          />
        </div>
        <div>
          <label
            htmlFor="weight-input"
            className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block font-medium"
          >
            Kilo
          </label>
          <input
            id="weight-input"
            type="text"
            placeholder="65 kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full bg-transparent border border-border rounded-xl px-3 py-3 text-sm outline-none focus:border-accent focus:shadow-accent-glow transition-all duration-200 placeholder:text-muted-foreground/40"
          />
        </div>
        <div>
          <label
            htmlFor="age-input"
            className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block font-medium"
          >
            Yas
          </label>
          <input
            id="age-input"
            type="text"
            placeholder="25"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full bg-transparent border border-border rounded-xl px-3 py-3 text-sm outline-none focus:border-accent focus:shadow-accent-glow transition-all duration-200 placeholder:text-muted-foreground/40"
          />
        </div>
        <div>
          <label
            htmlFor="size-input"
            className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block font-medium"
          >
            Beden
          </label>
          <input
            id="size-input"
            type="text"
            placeholder="M / 38"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="w-full bg-transparent border border-border rounded-xl px-3 py-3 text-sm outline-none focus:border-accent focus:shadow-accent-glow transition-all duration-200 placeholder:text-muted-foreground/40"
          />
        </div>
        <div className="col-span-2">
          <label
            htmlFor="shoe-size-input"
            className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block font-medium"
          >
            Ayakkabi Numarasi
          </label>
          <input
            id="shoe-size-input"
            type="text"
            placeholder="40"
            value={shoeSize}
            onChange={(e) => setShoeSize(e.target.value)}
            className="w-full bg-transparent border border-border rounded-xl px-3 py-3 text-sm outline-none focus:border-accent focus:shadow-accent-glow transition-all duration-200 placeholder:text-muted-foreground/40"
          />
        </div>
      </div>
    </div>,

    // Step 1: Style preferences
    <div key="style" className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
          Stil tercihlerin
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Sana en yakin hissettiren stilleri sec.
        </p>
      </div>
      <ChipSelector
        options={STYLE_OPTIONS}
        selected={stylePreferences}
        onToggle={(o) => toggleChip(stylePreferences, setStylePreferences, o)}
      />
    </div>,

    // Step 2: Color preferences
    <div key="colors" className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
          Renk tercihlerin
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          En cok tercih ettigin renkleri sec.
        </p>
      </div>
      <ChipSelector
        options={COLOR_OPTIONS}
        selected={colorPreferences}
        onToggle={(o) => toggleChip(colorPreferences, setColorPreferences, o)}
      />
    </div>,

    // Step 3: Avoided styles
    <div key="avoid" className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight mb-2">
          Kacindiklarim
        </h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Giymek istemedigin veya hoslanmadagin seyleri sec.
        </p>
      </div>
      <ChipSelector
        options={AVOIDED_OPTIONS}
        selected={avoidedStyles}
        onToggle={(o) => toggleChip(avoidedStyles, setAvoidedStyles, o)}
      />
    </div>,
  ];

  const isLastStep = step === steps.length - 1;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10 animate-fade-in">
          <h1 className="font-serif text-4xl font-semibold tracking-tight">
            Style<span className="text-accent">AI</span>
          </h1>
        </div>

        {/* Progress bar */}
        <div className="flex justify-center gap-2.5 mb-10" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={steps.length}>
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-500 ${
                i === step
                  ? "bg-accent w-8"
                  : i < step
                  ? "bg-accent/40 w-4"
                  : "bg-border w-4"
              }`}
            />
          ))}
        </div>

        {/* Current step */}
        {steps[step]}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-12">
          <button
            onClick={handleSkip}
            className="text-muted-foreground/50 text-sm hover:text-muted-foreground transition-colors duration-200 cursor-pointer"
          >
            {`Gec \u2192`}
          </button>

          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="border border-border text-foreground/70 px-6 py-3 text-xs tracking-[0.15em] uppercase transition-all duration-200 hover:border-foreground/40 rounded-xl cursor-pointer font-medium"
              >
                Geri
              </button>
            )}
            <button
              onClick={isLastStep ? handleSave : () => setStep(step + 1)}
              disabled={saving}
              className="bg-foreground text-background px-8 py-3 text-xs tracking-[0.15em] uppercase transition-all duration-200 hover:opacity-90 hover:shadow-glass rounded-xl disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer font-medium"
            >
              {saving ? "Kaydediliyor..." : isLastStep ? "Tamamla" : "Devam"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
