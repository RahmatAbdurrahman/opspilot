import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

const sizeClasses = { sm: "h-7 w-7 text-xs", md: "h-9 w-9 text-sm", lg: "h-11 w-11 text-base" };

export function Avatar({ className, size = "md", children, ...props }: AvatarProps) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-full bg-[hsl(var(--secondary))]",
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AvatarFallback({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "flex h-full w-full items-center justify-center font-medium text-[hsl(var(--secondary-foreground))]",
        className,
      )}
      {...props}
    />
  );
}

export interface AvatarImageProps {
  className?: string;
  alt?: string;
  src: string;
  width?: number;
  height?: number;
}

export function AvatarImage({ className, alt = "", src, width = 40, height = 40 }: AvatarImageProps) {
  return (
    <Image
      className={cn("aspect-square h-full w-full object-cover", className)}
      alt={alt}
      src={src}
      width={width}
      height={height}
    />
  );
}
