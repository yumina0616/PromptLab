import * as React from "react";

import { cn } from "./utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "resize-none glass border-purple-500/30 placeholder:text-muted-foreground focus-visible:border-purple-500/60 focus-visible:ring-purple-500/30 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive flex field-sizing-content min-h-16 w-full rounded-md px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:bg-purple-500/5 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
