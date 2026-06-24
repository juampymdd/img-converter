'use client';

import { ENCODABLE_TARGETS, FORMATS } from '@/lib/formats';
import type { ImageFormat } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Props {
  value: ImageFormat;
  onChange: (value: ImageFormat) => void;
  id?: string;
  compact?: boolean;
}

export function FormatSelector({ value, onChange, id, compact }: Props) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ImageFormat)}>
      <SelectTrigger id={id} className={compact ? 'h-8 text-xs' : undefined} aria-label="Output format">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {ENCODABLE_TARGETS.map((f) => (
          <SelectItem key={f} value={f}>
            <span className="flex items-baseline gap-2">
              <span className="font-medium">{FORMATS[f].label}</span>
              {!compact && <span className="text-xs text-muted-foreground">{FORMATS[f].note}</span>}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
