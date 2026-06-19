import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast relative flex w-full items-start justify-between gap-3 overflow-hidden rounded-xl border border-border/60 bg-background/80 p-3.5 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.35)] backdrop-blur-md transition-all data-[state=open]:animate-in data-[state=closed]:animate-out",
          description: "text-xs text-muted-foreground",
          actionButton:
            "inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground shadow-sm hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
          cancelButton:
            "inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-muted px-3 text-xs font-medium text-muted-foreground hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",

          // sonner exposes variants via data attributes like: data-[type=success]
          // Radix-style theming is handled by these classes.
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
