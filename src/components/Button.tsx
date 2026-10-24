import Link from "next/link";
import type { ButtonHTMLAttributes } from "react";

type CommonProps = {
  variant?: "solid" | "outline";
  className?: string;
};

export function LinkButton({
  href,
  children,
  variant = "solid",
  className = "",
}: CommonProps & { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={buttonClasses(variant, className)}>
      {children}
    </Link>
  );
}

export function Button({
  children,
  variant = "solid",
  className = "",
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={buttonClasses(variant, className)} {...rest}>
      {children}
    </button>
  );
}

function buttonClasses(variant: "solid" | "outline", className: string) {
  const base =
    "inline-flex items-center justify-center px-7 py-3 text-[11px] uppercase tracking-widest2 transition-colors duration-300 ease-editorial disabled:opacity-50";
  const variants = {
    solid: "bg-giuseppe-ink text-giuseppe-bg hover:bg-giuseppe-ink/85",
    outline: "border border-giuseppe-ink text-giuseppe-ink hover:bg-giuseppe-ink hover:text-giuseppe-bg",
  };
  return `${base} ${variants[variant]} ${className}`;
}
