import { useState, useRef, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { Fonts, EngieColorTokens as C } from '../../theme.ts';
import type { ConnectionStatus } from '../../webrtc/BaseInterfaces.ts';

interface CallControlsProps {
  status: ConnectionStatus;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onConnect: () => void;
  onDisconnect: () => void;
  onLeaveCall: () => void;
}

const btnBase = {
  width: 36, height: 36, borderRadius: '50%',
  border: '1px solid', borderColor: C.border,
  bgcolor: 'transparent', color: C.text,
  fontSize: '1.4em', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s', position: 'relative' as const, flexShrink: 0,
  '&:hover': { borderColor: C.accent, color: C.accent, bgcolor: 'rgba(0,212,255,0.08)' },
};

const labelSx = {
  fontFamily: Fonts.mono, fontSize: '0.7em', color: C.muted,
  textTransform: 'uppercase' as const, position: 'absolute' as const,
  bottom: -13, left: '50%', transform: 'translateX(-50%)', whiteSpace: 'nowrap' as const,
  letterSpacing: '0.04em',
};

const greenBtnSx = {
  bgcolor: '#16a34a', borderColor: '#16a34a', color: '#fff',
  boxShadow: '0 0 10px rgba(22,163,74,0.4)', '&:hover': { bgcolor: '#15803d' },
};

function Divider() {
  const theme = useTheme();
  return <Box sx={{ width: '1px', height: 20, bgcolor: theme.palette.divider, mx: '2px', flexShrink: 0 }} />;
}

function PickupButton({ status, onConnect }: { status: ConnectionStatus; onConnect: () => void }) {
  const isConnecting = status === 'connecting';
  const canDisconnect = status === 'waiting' || status === 'streaming';
  const label = isConnecting ? '...' : canDisconnect ? 'In Call' : 'Connect';
  return (
    <Box component="button" onClick={onConnect} sx={{
      ...btnBase, ...greenBtnSx,
      ...(isConnecting && { opacity: 0.7, pointerEvents: 'none' }),
    }}>
      &#128222;
      <Typography sx={labelSx}>{label}</Typography>
    </Box>
  );
}

function MicButton() {
  const [muted, setMuted] = useState(false);
  return (
    <Box component="button" onClick={() => setMuted(!muted)} sx={{
      ...btnBase,
      ...(muted && { borderColor: C.danger, color: C.danger, bgcolor: 'rgba(255,51,68,0.1)' }),
    }}>
      {muted ? <>&#128263;</> : <>&#127897;</>}
      <Typography sx={labelSx}>Mic</Typography>
    </Box>
  );
}

function getVolPopupSx(open: boolean) {
  return {
    position: 'absolute' as const, bottom: 'calc(100% + 14px)', left: '50%',
    transform: open ? 'translateX(-50%) translateY(0)' : 'translateX(-50%) translateY(4px)',
    bgcolor: 'rgba(8,12,16,0.96)', border: 1, borderColor: 'divider',
    borderRadius: '10px', p: '10px 8px',
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '6px',
    zIndex: 30, boxShadow: '0 6px 24px rgba(0,0,0,0.55)',
    opacity: open ? 1 : 0, pointerEvents: open ? 'all' as const : 'none' as const,
    transition: 'opacity 0.15s, transform 0.15s', minWidth: 36,
  };
}

function VolumePopup({ open, muted, volume, onToggleMute, onVolumeChange }: {
  open: boolean; muted: boolean; volume: number;
  onToggleMute: () => void; onVolumeChange: (v: number) => void;
}) {
  const displayVol = muted ? 0 : volume;
  const pctLabel = muted ? '0%' : Math.round(volume * 100) + '%';
  const speakerIcon = muted ? '\uD83D\uDD07' : '\uD83D\uDD0A';
  return (
    <Box sx={getVolPopupSx(open)}>
      <Box component="button" onClick={onToggleMute}
        sx={{ bgcolor: 'transparent', border: 'none', color: C.accent, cursor: 'pointer', fontSize: '1.3em', p: 0, lineHeight: 1 }}>
        {speakerIcon}
      </Box>
      <Box component="input" type="range" min={0} max={1} step={0.02} value={displayVol}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onVolumeChange(parseFloat(e.target.value))}
        sx={{ writingMode: 'vertical-lr', direction: 'rtl', height: 64, accentColor: C.accent, cursor: 'pointer' }}
      />
      <Typography sx={{ fontFamily: Fonts.mono, fontSize: '0.9em', color: C.muted }}>{pctLabel}</Typography>
    </Box>
  );
}

function VolumeBubble({ videoRef }: { videoRef: React.RefObject<HTMLVideoElement | null> }) {
  const [open, setOpen] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [open]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = muted ? 0 : volume;
    v.muted = muted;
  }, [volume, muted, videoRef]);

  const handleVolumeChange = (v: number) => {
    setVolume(v);
    if (v > 0) setMuted(false);
  };

  return (
    <Box ref={wrapRef} sx={{ position: 'relative', flexShrink: 0 }}>
      <Box component="button" onClick={(e: React.MouseEvent) => { e.stopPropagation(); setOpen(!open); }} sx={btnBase}>
        {muted ? <>&#128263;</> : <>&#128266;</>}
        <Typography sx={labelSx}>Volume</Typography>
      </Box>
      <VolumePopup open={open} muted={muted} volume={volume} onToggleMute={() => setMuted(!muted)} onVolumeChange={handleVolumeChange} />
    </Box>
  );
}

function HangupButton({ disabled, onClick }: { disabled: boolean; onClick: () => void }) {
  return (
    <Box component="button" onClick={onClick} disabled={disabled} sx={{
      ...btnBase,
      bgcolor: C.danger, borderColor: C.danger, color: '#fff',
      boxShadow: '0 0 10px rgba(255,51,68,0.4)',
      '&:hover': { bgcolor: '#cc0011' },
      ...(disabled && { opacity: 0.4, pointerEvents: 'none' }),
    }}>
      &#128245;
      <Typography sx={labelSx}>End</Typography>
    </Box>
  );
}

export default function CallControls({ status, videoRef, onConnect, onDisconnect, onLeaveCall }: CallControlsProps) {
  const isDisconnected = status === 'disconnected' || status === 'call-ended' || status === 'error';
  const handleHangup = () => {
    if (status === 'streaming') onLeaveCall();
    else if (!isDisconnected) onDisconnect();
  };

  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: '6px',
      bgcolor: 'rgba(8,12,16,0.90)', border: 1, borderColor: 'divider',
      borderRadius: '40px', px: '12px', py: '6px',
    }}>
      <PickupButton status={status} onConnect={onConnect} />
      <Divider />
      <MicButton />
      {/* Share Docs — commented out, feature may not be implemented */}
      <VolumeBubble videoRef={videoRef} />
      <Divider />
      <HangupButton disabled={isDisconnected} onClick={handleHangup} />
    </Box>
  );
}
