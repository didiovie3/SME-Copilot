
'use client';

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="h-9 w-9" />
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="h-9 w-9 rounded-full bg-background/50 backdrop-blur-sm border shadow-sm"
    >
      {theme === "light" ? (
        <Sun className="h-[1.2rem] w-[1.2rem] text-orange-500" />
      ) : (
        <Moon className="h-[1.2rem] w-[1.2rem] text-blue-400" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
