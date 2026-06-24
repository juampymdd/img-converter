'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';
  // Until mounted, label/behavior must match the server render (theme unknown).
  const label = !mounted ? 'Toggle theme' : isDark ? 'Switch to light theme' : 'Switch to dark theme';

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={label}
      onClick={() => mounted && setTheme(isDark ? 'light' : 'dark')}
    >
      {mounted && isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}
