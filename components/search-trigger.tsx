"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SearchTrigger() {
  return (
    <Button 
        variant="outline" 
        className={cn(
            "relative h-9 w-full justify-start rounded-[0.5rem] text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
        )}
        onClick={() => {
            // Dispatch a keyboard event to open the command menu
            const event = new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true, // for Mac
                ctrlKey: true, // for Windows/Linux (simulated) - or typically one is checked
                bubbles: true,
                cancelable: true
            });
            document.dispatchEvent(event);
        }}
    >
        <span className="hidden lg:inline-flex">Search documentation...</span>
        <span className="inline-flex lg:hidden">Search...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
        </kbd>
    </Button>
  )
}
