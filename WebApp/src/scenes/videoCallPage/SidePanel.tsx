import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { Fonts } from '../../theme.ts';
import type { ConnectionStatus } from '../../webrtc/BaseInterfaces.ts';

const CONNECTED_STATUSES = new Set<ConnectionStatus>(['waiting', 'streaming', 'connecting']);

function MemberEntry({ name, detail, connected }: { name: string; detail: string; connected: boolean }) {
  return (
    <Box sx={{ py: 0.5, px: 1, borderRadius: '4px', borderLeft: 3, borderColor: connected ? 'success.main' : 'divider' }}>
      <Typography sx={{ fontFamily: Fonts.mono, fontSize: '1.1em', color: 'text.primary' }}>{name}</Typography>
      <Typography sx={{ fontFamily: Fonts.mono, fontSize: '0.9em', color: 'text.secondary' }}>{detail}</Typography>
    </Box>
  );
}

function MembersSection({ status }: { status: ConnectionStatus }) {
  const isConnected = CONNECTED_STATUSES.has(status);
  const theme = useTheme();
  return (
    <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', py: '10px', px: '12px', gap: '6px', overflowY: 'auto' }}>
      <Typography sx={{
        fontFamily: Fonts.mono, fontSize: '0.8em', color: theme.palette.text.secondary,
        textTransform: 'uppercase', letterSpacing: '0.1em', mb: '4px',
      }}>
        Members
      </Typography>
      <MemberEntry name="You" detail={isConnected ? 'Connected' : 'Offline'} connected={isConnected} />
      {status === 'streaming' && <MemberEntry name="Quest User" detail="Streaming" connected />}
    </Box>
  );
}

export default function SidePanel({ status }: { status: ConnectionStatus }) {
  const theme = useTheme();
  return (
    <Box sx={{
      width: 200, bgcolor: theme.palette.background.paper,
      borderRight: 1, borderColor: 'divider',
      display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
    }}>
      <MembersSection status={status} />
      <Box sx={{ width: '100%', height: '1px', bgcolor: theme.palette.divider, flexShrink: 0 }} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', py: '10px', px: '12px', alignItems: 'center', justifyContent: 'center'}}>
        {/* <Box
          component="img"
          src="src\assets\evernight.gif"
          alt="animation"
          sx={{ width: '100%', borderRadius: 2 }}
        /> */}
      </Box>
    </Box>
  );
}
