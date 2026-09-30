import type { Persona } from "../types";

interface Props {
  persona: Persona;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeMap = {
  sm: "h-8 w-8 text-base",
  md: "h-14 w-14 text-2xl",
  lg: "h-16 w-16 text-3xl",
  xl: "h-24 w-24 text-5xl",
};

export default function PersonaAvatar({ persona, size = "md" }: Props) {
  const cls = sizeMap[size];
  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slate-100 to-slate-200 ring-1 ring-slate-200 ${cls}`}
      aria-hidden
    >
      {persona.image ? (
        <img
          src={persona.image}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : (
        <span>{persona.avatar}</span>
      )}
    </div>
  );
}
