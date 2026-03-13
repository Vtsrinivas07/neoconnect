"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<React.ElementRef<typeof SwitchPrimitives.Root>, React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitives.Root
      ref={ref}
      className={cn(
        "peer inline-flex h-7 w-12 shrink-0 cursor-pointer items-center rounded-full border border-white/10 bg-white/10 transition data-[state=checked]:bg-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitives.Thumb className="block size-5 translate-x-1 rounded-full bg-white shadow transition data-[state=checked]:translate-x-6" />
    </SwitchPrimitives.Root>
  )
);

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };