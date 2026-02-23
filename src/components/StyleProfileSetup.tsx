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
  "Kırmızı",
  "Yeşil",
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
  "Parlak kumaş",
  "Crop top",
  "Kısa etek",
  "Yüksek topuk",
  "Spor ayakkabı",
  "Takı/aksesuar",
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
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option}
          onClick={() => onToggle(option)}
          className={`px-3 py-1.5 rounded-full text-xs tracking-wide transition-all duration-300 border ${
            selected.includes(option)
              ? "bg-foreground text-background border-foreground"
              : "bg-transparent text-muted-foreground border-border hover:border-foreground/40"
          }`}
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
    getUserId(); // Ensure user_id is created
    onComplete(null);
  };

  const steps = [
    // Step 0: Body measurements
    <div key="body" className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl tracking-tight mb-2">
          Seni tanıyalım
        </h2>
        <p className="text-muted-foreground text-sm">
          Daha iyi öneriler için birkaç bilgi yeterli. Tüm alanlar isteğe
          bağlı.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
            Boy
          </label>
          <input
            type="text"
            placeholder="170 cm"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            className="w-full bg-transparent border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/40"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
            Kilo
          </label>
          <input
            type="text"
            placeholder="65 kg"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full bg-transparent border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/40"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
            Yaş
          </label>
          <input
            type="text"
            placeholder="25"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full bg-transparent border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/40"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
            Beden
          </label>
          <input
            type="text"
            placeholder="M / 38"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="w-full bg-transparent border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/40"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-muted-foreground tracking-wide uppercase mb-1.5 block">
            Ayakkabı Numarası
          </label>
          <input
            type="text"
            placeholder="40"
            value={shoeSize}
            onChange={(e) => setShoeSize(e.target.value)}
            className="w-full bg-transparent border border-border rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent transition-colors placeholder:text-muted-foreground/40"
          />
        </div>
      </div>
    </div>,

    // Step 1: Style preferences
    <div key="style" className="space-y-6 animate-fade-in">
      <div>
        <h2 className="font-serif text-2xl sm:text-3xl tracking-tight mb-2">
          Stil tercihlerin
        </h2>
        <p className="text-muted-foreground text-sm">
          Sana en yakın hissettiren stilleri seç.
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
        <h2 className="font-serif text-2xl sm:text-3xl tracking-tight mb-2">
          Renk tercihlerin
        </h2>
        <p className="text-muted-foreground text-sm">
          En çok tercih ettiğin renkleri seç.
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
        <h2 className="font-serif text-2xl sm:text-3xl tracking-tight mb-2">
          Kaçındıkların
        </h2>
        <p className="text-muted-foreground text-sm">
          Giymek istemediğin veya hoşlanmadığın şeyleri seç.
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
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl tracking-tight">
            Style<span className="text-accent">AI</span>
          </h1>
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? "bg-accent w-6"
                  : i < step
                  ? "bg-accent/50"
                  : "bg-border"
              }`}
            />
          ))}
        </div>

        {/* Current step */}
        {steps[step]}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-10">
          <button
            onClick={handleSkip}
            className="text-muted-foreground/60 text-sm hover:text-muted-foreground transition-colors"
          >
            {`Geç \u2192`}
          </button>

          <div className="flex gap-3">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="border border-border text-foreground/70 px-5 py-2.5 text-xs tracking-[0.15em] uppercase transition-all duration-300 hover:border-foreground/40 rounded-lg"
              >
                Geri
              </button>
            )}
            <button
              onClick={isLastStep ? handleSave : () => setStep(step + 1)}
              disabled={saving}
              className="bg-foreground text-background px-6 py-2.5 text-xs tracking-[0.15em] uppercase transition-all duration-300 hover:opacity-90 rounded-lg disabled:opacity-50"
            >
              {saving ? "Kaydediliyor..." : isLastStep ? "Tamamla" : "Devam"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
