import React from 'react';
import {
  Box, List, ListItemButton, ListItemIcon, ListItemText, Tooltip,
  IconButton, Divider,
} from '@mui/material';
import {
  HomeOutlined, AssignmentOutlined, StorageOutlined, AccountTreeOutlined,
  FolderOutlined, BarChartOutlined, SettingsOutlined, HelpOutlineOutlined,
  LightModeOutlined, DarkModeOutlined, MenuOpen, Menu, SmartToyOutlined
} from '@mui/icons-material';
import { useLocation, useNavigate } from '@tanstack/react-router';

const NAV_ITEMS = [
  { label: 'Trang chủ', icon: <HomeOutlined />, path: '/' },
  { label: 'Chat AI', icon: <SmartToyOutlined />, path: '/chat' },
  { label: 'Việc của tôi', icon: <AssignmentOutlined />, path: '/my-tasks' },
  { label: 'Dữ liệu', icon: <StorageOutlined />, path: '/collections' },
  { label: 'Workflow', icon: <AccountTreeOutlined />, path: '/workflows' },
  { label: 'File', icon: <FolderOutlined />, path: '/files' },
  { label: 'Báo cáo', icon: <BarChartOutlined />, path: '/reports' },
];

const FOOTER_ITEMS = [
  { label: 'Cài đặt', icon: <SettingsOutlined />, path: '/settings' },
  { label: 'Trợ giúp', icon: <HelpOutlineOutlined />, path: '/help' },
];

interface NavRailProps {
  expanded: boolean;
  onToggle: () => void;
}

export function NavRail({ expanded, onToggle }: NavRailProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const width = expanded ? 240 : 72;

  return (
    <Box
      sx={{
        width,
        minWidth: width,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderRight: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper',
        transition: 'width 0.2s ease',
        overflow: 'hidden',
      }}
    >
      {/* Toggle */}
      <Box sx={{ display: 'flex', justifyContent: expanded ? 'flex-end' : 'center', p: 2 }}>
        <IconButton size="small" onClick={onToggle}>
          {expanded ? <MenuOpen fontSize="small" /> : <Menu fontSize="small" />}
        </IconButton>
      </Box>

      {/* Main nav items */}
      <List sx={{ flex: 1, pt: 0 }}>
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
          return (
            <Tooltip key={item.path} title={expanded ? '' : item.label} placement="right">
              <ListItemButton
                onClick={() => navigate({ to: item.path })}
                selected={active}
                sx={{
                  minHeight: 48,
                  justifyContent: expanded ? 'initial' : 'center',
                  px: expanded ? 2 : 1.5,
                  mx: 1,
                  my: 0.25,
                  borderRadius: 2,
                  position: 'relative',
                  '&.Mui-selected': {
                    bgcolor: '#E8F0FE',
                    color: 'primary.main',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: -8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: 24,
                      bgcolor: 'primary.main',
                      borderRadius: '0 2px 2px 0',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: expanded ? 40 : 'unset',
                    color: active ? 'primary.main' : 'text.secondary',
                    justifyContent: 'center',
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                {expanded && (
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: 14, fontWeight: active ? 600 : 400 }}
                  />
                )}
              </ListItemButton>
            </Tooltip>
          );
        })}
      </List>

      <Divider />

      {/* Footer items */}
      <List sx={{ py: 1 }}>
        {FOOTER_ITEMS.map((item) => (
          <Tooltip key={item.path} title={expanded ? '' : item.label} placement="right">
            <ListItemButton
              onClick={() => navigate({ to: item.path })}
              sx={{
                minHeight: 44,
                justifyContent: expanded ? 'initial' : 'center',
                px: expanded ? 2 : 1.5,
                mx: 1,
                my: 0.25,
                borderRadius: 2,
              }}
            >
              <ListItemIcon sx={{ minWidth: expanded ? 40 : 'unset', color: 'text.secondary', justifyContent: 'center' }}>
                {item.icon}
              </ListItemIcon>
              {expanded && (
                <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 13 }} />
              )}
            </ListItemButton>
          </Tooltip>
        ))}
      </List>
    </Box>
  );
}
