import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { NavRail } from './NavRail';
import { AppHeader } from './AppHeader';
import { CommandPalette } from './CommandPalette';
import { MobileBottomNav } from './MobileBottomNav';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));         // <600px
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md')); // 600-960
  const isDesktop = useMediaQuery(theme.breakpoints.up('lg'));           // ≥1280

  const [railExpanded, setRailExpanded] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  // Ctrl/Cmd+K shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', bgcolor: 'background.default' }}>
      {/* Navigation Rail — hidden on mobile */}
      {!isMobile && (
        <NavRail
          expanded={isDesktop ? railExpanded : false}
          onToggle={() => setRailExpanded((v) => !v)}
        />
      )}

      {/* Main content area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AppHeader onOpenCommandPalette={() => setCmdOpen(true)} />
        <Box
          component="main"
          sx={{
            flex: 1,
            overflow: 'auto',
            p: { xs: 2, sm: 3, md: 4 },
            pb: isMobile ? '72px' : undefined,
          }}
        >
          {children}
        </Box>
      </Box>

      {/* Mobile Bottom Nav */}
      {isMobile && <MobileBottomNav />}

      {/* Command Palette */}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </Box>
  );
}
