"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "../../lib/utils"

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-4", className)}
      {...props}
    />
  )
}

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex items-center gap-1 rounded-xl border border-[var(--border-custom)] bg-[var(--panel2)]/60 p-1",
        className
      )}
      {...props}
    />
  )
}

function TabsTab({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-tab"
      className={cn(
        "px-4 py-2 rounded-lg text-[12px] font-medium text-[var(--text-secondary)] transition-colors",
        "data-selected:bg-[var(--blue)] data-selected:text-white",
        "hover:text-[var(--text-primary)] data-selected:hover:text-white",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--blue)]/50",
        className
      )}
      {...props}
    />
  )
}

function TabsPanel({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-panel"
      className={cn("focus-visible:outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTab, TabsPanel }
