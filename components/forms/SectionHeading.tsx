type SectionHeadingProps = {
  eyebrow: string;
  label: string;
  title: string;
};

export default function SectionHeading({
  eyebrow,
  label,
  title,
}: SectionHeadingProps) {
  return (
    <div className="mb-7 flex items-start gap-3">
      <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
        {eyebrow}
      </span>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          {label}
        </p>
        <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
    </div>
  );
}
