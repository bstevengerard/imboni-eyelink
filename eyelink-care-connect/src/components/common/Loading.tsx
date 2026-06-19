import { Eye, EyeOff } from "lucide-react";

interface LoadingProps {
  size?: "sm" | "md" | "lg";
  message?: string;
  fullScreen?: boolean;
}

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

// Modern Loading Spinner Component
export default function Loading({ size = "md", message = "Loading...", fullScreen = false }: LoadingProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-16 h-16"
  };

  const textClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg"
  };

  const borderSizes = {
    sm: "border-2",
    md: "border-3",
    lg: "border-4"
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-full ${borderSizes[size]} border-primary/20 border-t-primary animate-spin`} />
        <Eye className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${iconSizes[size]} text-primary`} />
      </div>
      {message && (
        <p className={`${textClasses[size]} text-muted-foreground animate-pulse font-medium`}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-background/90 backdrop-blur-md flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
}

// Loading Button Component - shows loading state inside buttons
export function ButtonLoading({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <div className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      <span>{message}</span>
    </div>
  );
}

// Skeleton Component
export function Skeleton({ className = "", variant = "text", width, height }: SkeletonProps) {
  const variantClasses = {
    text: "h-4 rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg"
  };

  const style: React.CSSProperties = {
    width: width || (variant === "text" ? "100%" : undefined),
    height: height || (variant === "text" ? "1rem" : undefined),
  };

  return (
    <div
      className={`animate-pulse bg-muted/50 ${variantClasses[variant]} ${className}`}
      style={style}
    />
  );
}

// Card Skeleton for Service Cards
export function ServiceCardSkeleton() {
  return (
    <div className="card-service overflow-hidden">
      <Skeleton variant="rectangular" width="100%" height="224px" />
      <div className="p-6 space-y-4">
        <Skeleton width="60%" height="24px" variant="text" />
        <Skeleton width="100%" height="16px" variant="text" />
        <Skeleton width="80%" height="16px" variant="text" />
        <div className="flex gap-2">
          <Skeleton width="80px" height="28px" variant="rectangular" />
          <Skeleton width="40px" height="28px" variant="rectangular" />
        </div>
      </div>
    </div>
  );
}

// Testimonial Card Skeleton
export function TestimonialSkeleton() {
  return (
    <div className="bg-card rounded-3xl p-8 md:p-12 shadow-xl">
      <div className="flex flex-col md:flex-row gap-8 items-center">
        <div className="shrink-0">
          <Skeleton variant="circular" width="128px" height="128px" />
        </div>
        <div className="flex-1 space-y-4 text-center md:text-left">
          <div className="flex gap-1 justify-center md:justify-start">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="circular" width="20px" height="20px" />
            ))}
          </div>
          <Skeleton width="100%" height="24px" variant="text" />
          <Skeleton width="90%" height="24px" variant="text" />
          <Skeleton width="80%" height="24px" variant="text" />
          <div className="pt-4">
            <Skeleton width="150px" height="20px" variant="text" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Clinic Card Skeleton
export function ClinicCardSkeleton() {
  return (
    <div className="card-elevated border-l-4 border-primary p-6">
      <div className="flex items-start gap-4 mb-4">
        <Skeleton variant="circular" width="48px" height="48px" />
        <div className="space-y-2 flex-1">
          <Skeleton width="40%" height="20px" variant="text" />
          <Skeleton width="60%" height="16px" variant="text" />
        </div>
      </div>
      <div className="space-y-3 mb-4">
        <Skeleton width="100%" height="16px" variant="text" />
        <Skeleton width="80%" height="16px" variant="text" />
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Skeleton width="80px" height="24px" variant="rectangular" />
        <Skeleton width="80px" height="24px" variant="rectangular" />
        <Skeleton width="80px" height="24px" variant="rectangular" />
      </div>
      <Skeleton width="100%" height="40px" variant="rectangular" />
    </div>
  );
}

// Section Header Skeleton
export function SectionHeaderSkeleton() {
  return (
    <div className="text-center max-w-3xl mx-auto mb-16">
      <Skeleton width="150px" height="32px" variant="rectangular" className="mx-auto mb-4" />
      <Skeleton width="80%" height="40px" variant="text" className="mx-auto mb-4" />
      <Skeleton width="100%" height="24px" variant="text" />
      <Skeleton width="90%" height="24px" variant="text" className="mx-auto" />
    </div>
  );
}

// Team Member Card Skeleton
export function TeamCardSkeleton() {
  return (
    <div className="card-elevated p-6 text-center">
      <Skeleton variant="circular" width="96px" height="96px" className="mx-auto mb-4" />
      <Skeleton width="80%" height="20px" variant="text" className="mx-auto mb-2" />
      <Skeleton width="60%" height="16px" variant="text" className="mx-auto" />
    </div>
  );
}

// Hospital Card Skeleton
export function HospitalCardSkeleton() {
  return (
    <div className="card-elevated p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <Skeleton width="200px" height="20px" variant="text" />
          <Skeleton width="150px" height="16px" variant="text" />
        </div>
        <Skeleton width="50px" height="24px" variant="rectangular" className="rounded-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Skeleton width="100%" height="16px" variant="text" />
        <Skeleton width="100%" height="16px" variant="text" />
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <Skeleton width="80px" height="24px" variant="rectangular" />
        <Skeleton width="80px" height="24px" variant="rectangular" />
        <Skeleton width="80px" height="24px" variant="rectangular" />
      </div>
      <div className="flex gap-3">
        <Skeleton width="100%" height="40px" variant="rectangular" />
        <Skeleton width="100%" height="40px" variant="rectangular" />
      </div>
    </div>
  );
}

// Table Row Skeleton
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <tr className="border-b">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton width="80%" height="16px" variant="text" />
        </td>
      ))}
    </tr>
  );
}

// Form Field Skeleton
export function FormFieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton width="100px" height="16px" variant="text" />
      <Skeleton width="100%" height="40px" variant="rectangular" />
    </div>
  );
}
