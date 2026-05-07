import { useState, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Fonts, EngieColorTokens as C } from '../../theme.ts';

interface DebugWindowProps {
  logs: string[];
  open: boolean;
  onClose: () => void;
}

function TitleBar({ onClose, onPointerDown, onPointerMove, onPointerUp }: {
  onClose: () => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
}) {
  return (
    <Box
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}
      sx={{
        display: 'flex', alignItems: 'center', gap: 1,
        px: '10px', py: '7px', bgcolor: 'background.default',
        borderBottom: 1, borderColor: C.border,
        cursor: 'move', userSelect: 'none', flexShrink: 0,
      }}
    >
      <Typography sx={{
        fontFamily: Fonts.mono, fontSize: '1em', color: C.accent,
        letterSpacing: '0.1em', textTransform: 'uppercase', flex: 1,
      }}>
        &#128187; Debug Console
      </Typography>
      <Box component="button" onClick={onClose} title="Close" sx={{
        bgcolor: 'transparent', border: 'none', color: C.muted,
        fontSize: '1.4em', cursor: 'pointer', lineHeight: 1, p: '0 2px',
        '&:hover': { color: C.text },
      }}>
        &#10005;
      </Box>
    </Box>
  );
}

function LogHeader({ onClear }: { onClear: () => void }) {
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: '6px',
      px: '10px', py: '5px', borderBottom: 1, borderColor: C.border, flexShrink: 0,
    }}>
      <Typography sx={{ fontFamily: Fonts.mono, fontSize: '0.9em', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Call Log
      </Typography>
      <Box sx={{ flex: 1 }} />
      <Box component="button" onClick={onClear} title="Clear" sx={{
        fontFamily: Fonts.mono, fontSize: '0.8em', px: '7px', py: '2px',
        bgcolor: 'transparent', border: '1px solid', borderColor: C.border,
        borderRadius: '3px', color: C.muted, cursor: 'pointer', letterSpacing: '0.05em',
        '&:hover': { borderColor: C.accent, color: C.accent },
      }}>
        &#10006; Clear
      </Box>
    </Box>
  );
}

function LogEntries({ logs }: { logs: string[] }) {
  if (logs.length === 0) {
    return <Typography sx={{ color: C.muted, fontFamily: Fonts.mono, fontSize: '1em' }}>No events yet.</Typography>;
  }
  return (
    <>
      {logs.map((line, i) => (
        <Box key={i} sx={{ borderBottom: 1, borderColor: C.border, py: '2px' }}>{line}</Box>
      ))}
    </>
  );
}

export default function DebugWindow({ logs, open, onClose }: DebugWindowProps) {
  const [pos, setPos] = useState({ x: 80, y: 80 });
  const [clearIndex, setClearIndex] = useState(0);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const winRef = useRef<HTMLDivElement>(null);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    document.body.style.userSelect = 'none';
  }, [pos]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const win = winRef.current;
    const maxX = win ? window.innerWidth - win.offsetWidth : window.innerWidth - 360;
    const maxY = win ? window.innerHeight - win.offsetHeight : window.innerHeight - 200;
    setPos({
      x: Math.max(0, Math.min(maxX, e.clientX - offset.current.x)),
      y: Math.max(0, Math.min(maxY, e.clientY - offset.current.y)),
    });
  }, []);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    document.body.style.userSelect = '';
  }, []);

  if (!open) return null;

  const visibleLogs = clearIndex > 0 ? logs.slice(clearIndex) : logs;

  return (
    <Box ref={winRef} sx={{
      position: 'fixed', top: pos.y, left: pos.x,
      width: 360, minWidth: 220, minHeight: 160,
      zIndex: 1000, bgcolor: 'background.paper',
      border: 1, borderColor: C.border, borderRadius: '8px',
      boxShadow: '0 10px 40px rgba(0,0,0,0.7)',
      display: 'flex', flexDirection: 'column', resize: 'both', overflow: 'hidden',
    }}>
      <TitleBar onClose={onClose} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} />
      <LogHeader onClear={() => setClearIndex(logs.length)} />
      <Box sx={{
        flex: 1, overflowY: 'auto', px: '10px', py: '6px',
        fontFamily: Fonts.mono, fontSize: '1em', color: 'text.primary', lineHeight: 1.8, minHeight: 100,
      }}>
        <LogEntries logs={visibleLogs} />
      </Box>
    </Box>
  );
}
