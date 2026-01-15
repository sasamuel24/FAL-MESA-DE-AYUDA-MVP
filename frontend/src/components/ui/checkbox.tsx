"use client"

import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export interface CheckboxProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.target.checked;
      onCheckedChange?.(isChecked);
      onChange?.(event);
    };

    return (
      <div className="relative inline-flex items-center">
        <input
          type="checkbox"
          ref={ref}
          checked={checked}
          onChange={handleChange}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-[#00B0B2]/30 bg-white checked:bg-[#00B0B2] checked:border-[#00B0B2] focus:ring-2 focus:ring-[#00B0B2]/20 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer",
            className
          )}
          {...props}
        />
        {checked && (
          <Check className="h-3 w-3 absolute left-0.5 top-0.5 text-white pointer-events-none" />
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox }
