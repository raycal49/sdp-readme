import { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useColorMode } from '../../context/ColorModeContext.tsx';
import { Fonts, EngieColorTokens as C } from '../../theme.ts';

interface SciFiTopBarProps {
  roomId?: string;
  onDebugToggle: () => void;
}

function useClock() {
  const [time, setTime] = useState(() => new Date().toTimeString().split(' ')[0]);
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toTimeString().split(' ')[0]), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function AboutPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const theme = useTheme();
  const credits = [
    { role: 'Project Lead',                             name: 'Salvador Gonzalez' },
    { role: 'Front End Developer',                      name: 'William Ngo' },
    { role: 'Web App Backend Developer',                name: 'Daniel Calvac' },
    { role: 'Web App Backend Developer',                name: 'Ronit Pillai' },
    { role: 'Backend Developer',                        name: 'Raymond Calderon' },
    { role: 'Backend Developer',                        name: 'Amrinder Singh' },
  ];
  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 480, bgcolor: theme.palette.background.paper,
        border: 1, borderColor: 'divider', borderRadius: 3,
        boxShadow: '0 16px 48px rgba(0,0,0,0.7)',
        p: 4, outline: 'none',
      }}>
        <Typography sx={{ fontFamily: Fonts.mono, fontSize: '1.4em', color: C.accent, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 3 }}>
          About
        </Typography>
        <Typography sx={{ fontFamily: Fonts.mono, fontSize: '1em', color: C.muted, mb: 1 }}>
          Field Troubleshooting Control Center
        </Typography>
        <Typography sx={{ fontFamily: Fonts.mono, fontSize: '0.9em', color: 'text.secondary', mb: 3 }}>
          Version 1.0.0
        </Typography>
        <Typography sx={{ fontFamily: Fonts.mono, fontSize: '0.9em', color: 'text.secondary', mb: 3 }}>
          Made by Team Insomniacs
        </Typography>
        <Box sx={{ height: '1px', bgcolor: theme.palette.divider, mb: 3 }} />
        <Typography sx={{ fontFamily: Fonts.mono, fontSize: '0.85em', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.1em', mb: 1 }}>
          Credits
        </Typography>
        {credits.map(({ role, name }) => (
          <Box key={role} sx={{ display: 'flex', justifyContent: 'space-between', py: '4px' }}>
            <Typography sx={{ fontFamily: Fonts.mono, fontSize: '0.9em', color: C.muted }}>{role}</Typography>
            <Typography sx={{ fontFamily: Fonts.mono, fontSize: '0.9em', color: 'text.primary' }}>{name}</Typography>
          </Box>
        ))}
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Box component="button" onClick={onClose} sx={{
            fontFamily: Fonts.mono, fontSize: '1em', px: '16px', py: '6px',
            bgcolor: 'transparent', border: '1px solid', borderColor: 'divider',
            borderRadius: '3px', color: C.muted, cursor: 'pointer',
            '&:hover': { borderColor: C.accent, color: C.accent },
          }}>
            Close
          </Box>
        </Box>
      </Box>
    </Modal>
  );
}

function SettingsDropdown({ open, onClose, onDebugToggle, onAbout }: {
  open: boolean; onClose: () => void; onDebugToggle: () => void; onAbout: () => void;
}) {
  const theme = useTheme();
  const { mode, toggleColorMode } = useColorMode();

  const itemSx = {
    display: 'flex', alignItems: 'center', gap: '10px',
    px: 2, py: 1, fontFamily: Fonts.mono, fontSize: '1.1em',
    color: theme.palette.text.primary, cursor: 'pointer',
    whiteSpace: 'nowrap', transition: 'background 0.1s, color 0.1s',
    '&:hover': { bgcolor: 'rgba(0,212,255,0.07)', color: C.accent },
  };

  const divSx = { height: '1px', bgcolor: theme.palette.divider, my: '4px' };

  return (
    <Box sx={{
      position: 'absolute', top: 'calc(100% + 8px)', right: 0,
      minWidth: 180, bgcolor: 'background.paper',
      border: 1, borderColor: 'divider', borderRadius: '8px',
      boxShadow: '0 8px 28px rgba(0,0,0,0.6)', py: '6px', zIndex: 100,
      opacity: open ? 1 : 0, pointerEvents: open ? 'all' : 'none',
      transform: open ? 'translateY(0)' : 'translateY(-4px)',
      transition: 'opacity 0.15s, transform 0.15s',
    }}>
      <Box sx={itemSx} onClick={() => { toggleColorMode(mode === 'dark' ? 'light' : 'dark'); onClose(); }}>
        &#127912; Light &amp; Dark Mode
      </Box>
      <Box sx={divSx} />
      <Box sx={itemSx} onClick={() => { onAbout(); onClose(); }}>&#128712; About</Box>
      <Box sx={divSx} />
      <Box sx={itemSx} onClick={() => { onDebugToggle(); onClose(); }}>&#128187; Debug</Box>
    </Box>
  );
}

function TopBarLeft({ roomId }: { roomId?: string }) {
  const theme = useTheme();
  return (
    <>
      <Box component="img" src="https://www.engie.com/themes/engie/engie_smal.png" alt="ENGIE" sx={{ height: 28, width: 'auto', flexShrink: 0 }} />
      <Box sx={{ width: '1px', height: 24, bgcolor: theme.palette.divider, flexShrink: 0 }} />
      <Box sx={{ fontFamily: Fonts.mono, fontSize: '10px', color: C.muted, lineHeight: 1.5 }}>
        ROOM NUMBER <Box component="span" sx={{ color: C.accent3 }}>{roomId || '—'}</Box>
      </Box>
    </>
  );
}

function TopBarRight({ clock }: { clock: string }) {
  const theme = useTheme();
  return (
    <>
      <Typography sx={{ fontFamily: Fonts.mono, fontSize: '1.2em', color: theme.palette.text.primary }}>{clock}</Typography>
    </>
  );
}

export default function SciFiTopBar({ roomId, onDebugToggle }: SciFiTopBarProps) {
  const theme = useTheme();
  const clock = useClock();
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [menuOpen]);

  return (
    <Box sx={{
      height: 44, bgcolor: theme.palette.background.paper,
      borderBottom: 1, borderColor: 'divider',
      display: 'flex', alignItems: 'center', px: '14px', gap: 2, flexShrink: 0,
    }}>
      <TopBarLeft roomId={roomId} />
      <Box sx={{ flex: 1 }} />
      <Typography sx={{ fontFamily: Fonts.mono, fontSize: '1.1em', color: C.accent, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
        Field Troubleshooting Control Center
      </Typography>
      <Box sx={{ flex: 1 }} />
      <TopBarRight clock={clock} />

      <Box ref={wrapRef} sx={{ position: 'relative' }}>
        <IconButton
          size="small"
          onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
          title="Settings"
          sx={{
            width: 28, height: 28, borderRadius: '4px',
            border: 1, borderColor: 'divider', color: C.muted, fontSize: '1.3em',
            '&:hover': { borderColor: C.accent, color: C.accent },
          }}
        >
          &#9881;
        </IconButton>
        <SettingsDropdown open={menuOpen} onClose={() => setMenuOpen(false)} onDebugToggle={onDebugToggle} onAbout={() => setAboutOpen(true)} />
      </Box>
      <AboutPanel open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </Box>
  );
}
