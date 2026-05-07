import { useState, useRef, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import DrawIcon from '@mui/icons-material/Draw';
import { Fonts, EngieColorTokens as C } from '../../theme.ts';
import { useAnnotation } from './AnnotationContext.tsx';

const COLORS = [
  '#ff3344', '#00cc55', '#2979ff', '#ffe800', '#ff44aa',
];

function ColorSwatches({ activeColor, onSelect }: { activeColor: string; onSelect: (c: string) => void }) {
  return (
    <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {COLORS.map(c => (
        <Box key={c} onClick={() => onSelect(c)} sx={{
          width: 26, height: 26, borderRadius: '4px', bgcolor: c,
          border: '2px solid', borderColor: activeColor === c ? '#fff' : 'transparent',
          cursor: 'pointer', flexShrink: 0, transition: 'transform 0.1s, border-color 0.1s',
          transform: activeColor === c ? 'scale(1.15)' : 'scale(1)',
          '&:hover': { transform: 'scale(1.2)' },
        }} />
      ))}
    </Box>
  );
}

function SliderControl({ label, value, unit, min, max, onChange }: {
  label: string; value: number; unit: string; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px', width: 110 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Typography sx={{ fontFamily: Fonts.mono, fontSize: '1.1em', color: C.muted }}>{label}</Typography>
        <Typography sx={{ fontFamily: Fonts.mono, fontSize: '1.1em', color: C.accent }}>{value}{unit}</Typography>
      </Box>
      <Box component="input" type="range" min={min} max={max} value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(parseInt(e.target.value))}
        sx={{ width: '100%', accentColor: C.accent, cursor: 'pointer' }}
      />
    </Box>
  );
}

function ActionButtons({ onClear }: { onClear: () => void }) {
  const actionSx = {
    fontFamily: Fonts.mono, fontSize: '1.3em', px: '14px', py: '7px',
    bgcolor: 'transparent', border: '1px solid', borderRadius: '3px',
    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap' as const,
  };
  return (
    <Box component="button" onClick={onClear} sx={{
      ...actionSx, borderColor: C.danger, color: C.danger,
      '&:hover': { bgcolor: 'rgba(255,51,68,0.1)' },
    }}>
      &#10005; Clear
    </Box>
  );
}

function ResizeHandle({ onPointerDown }: { onPointerDown: (e: React.PointerEvent) => void }) {
  const theme = useTheme();
  return (
    <Box onPointerDown={onPointerDown} sx={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 4,
      cursor: 'ns-resize', bgcolor: 'transparent', zIndex: 10,
      '&:hover': { bgcolor: 'rgba(0,212,255,0.2)' },
      '&::after': {
        content: '""', position: 'absolute', top: 1, left: '50%',
        transform: 'translateX(-50%)', width: 28, height: 2,
        borderRadius: '1px', bgcolor: theme.palette.divider,
      },
      '&:hover::after': { bgcolor: C.accent },
    }} />
  );
}

function useResizableHeight(initial: number) {
  const [height, setHeight] = useState(initial);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(initial);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = height;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
  }, [height]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      setHeight(Math.min(300, Math.max(56, startH.current - (e.clientY - startY.current))));
    };
    const onUp = () => { dragging.current = false; document.body.style.userSelect = ''; };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, []);

  return { height, onPointerDown };
}

function AnnotateToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <Box component="button" onClick={onToggle} sx={{
      fontFamily: Fonts.mono, fontSize: '1.3em', px: '14px', py: '7px',
      bgcolor: enabled ? 'rgba(0,212,255,0.08)' : 'transparent',
      border: '1px solid', borderColor: enabled ? C.accent : C.border,
      borderRadius: '3px', color: enabled ? C.accent : C.muted,
      cursor: 'pointer', letterSpacing: '0.06em', whiteSpace: 'nowrap', transition: 'all 0.15s',
      display: 'flex', alignItems: 'center', gap: '6px',
    }}>
      <DrawIcon fontSize="small" /> Annotate <Box component="span" sx={{ fontSize: '0.8em', opacity: 0.7 }}>{enabled ? 'ON' : 'OFF'}</Box>
    </Box>
  );
}

function StrokeTypeToggle({ strokeType, onToggle }: { strokeType: 'fading' | 'permanent'; onToggle: () => void }) {
  const isFading = strokeType === 'fading';
  return (
    <Box component="button" onClick={onToggle} sx={{
      fontFamily: Fonts.mono, fontSize: '1.3em', px: '14px', py: '7px',
      bgcolor: isFading ? 'transparent' : 'rgba(0,212,255,0.08)',
      border: '1px solid', borderColor: isFading ? C.border : C.accent,
      borderRadius: '3px', color: isFading ? C.muted : C.accent,
      cursor: 'pointer', letterSpacing: '0.06em', whiteSpace: 'nowrap' as const, transition: 'all 0.15s',
    }}>
      {isFading ? 'Fading' : 'Permanent'}
    </Box>
  );
}

function PaletteDivider() {
  const theme = useTheme();
  return <Box sx={{ width: '1px', height: 36, bgcolor: theme.palette.divider, flexShrink: 0 }} />;
}

export default function PaletteFooter() {
  const theme = useTheme();
  const ann = useAnnotation();
  const { height, onPointerDown } = useResizableHeight(72);

  return (
    <Box sx={{
      bgcolor: theme.palette.background.paper, borderTop: 1, borderColor: 'divider',
      display: 'flex', alignItems: 'center', gap: '10px', px: '14px',
      flexWrap: 'nowrap', overflowX: 'auto',
      height, minHeight: 56, maxHeight: 300, position: 'relative', flexShrink: 0,
    }}>
      <ResizeHandle onPointerDown={onPointerDown} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <AnnotateToggle enabled={ann.enabled} onToggle={ann.toggleEnabled} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <PaletteDivider />
        <ColorSwatches activeColor={ann.color} onSelect={ann.setColor} />
        <PaletteDivider />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
        <SliderControl label="SIZE" value={ann.brushSize} unit="px" min={2} max={30} onChange={ann.setBrushSize} />
        <PaletteDivider />
        <StrokeTypeToggle strokeType={ann.strokeType} onToggle={ann.toggleStrokeType} />
        <PaletteDivider />
        <ActionButtons onClear={ann.clear} />
      </Box>
    </Box>
  );
}
