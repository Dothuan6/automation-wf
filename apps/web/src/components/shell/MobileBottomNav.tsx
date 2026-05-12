import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import {
  HomeOutlined, AssignmentOutlined, StorageOutlined,
  AccountTreeOutlined, FolderOutlined,
} from '@mui/icons-material';
import { useLocation, useNavigate } from '@tanstack/react-router';

const MOBILE_NAV = [
  { label: 'Trang chủ', icon: <HomeOutlined />, path: '/' },
  { label: 'Việc của tôi', icon: <AssignmentOutlined />, path: '/my-tasks' },
  { label: 'Dữ liệu', icon: <StorageOutlined />, path: '/collections' },
  { label: 'Workflow', icon: <AccountTreeOutlined />, path: '/workflows' },
  { label: 'File', icon: <FolderOutlined />, path: '/files' },
];

export function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  const current = MOBILE_NAV.findIndex(
    (n) => location.pathname === n.path || location.pathname.startsWith(n.path + '/'),
  );

  return (
    <Paper
      sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100 }}
      elevation={8}
    >
      <BottomNavigation
        value={current === -1 ? false : current}
        onChange={(_, idx) => navigate({ to: MOBILE_NAV[idx].path as any })}
        showLabels
        sx={{ height: 64 }}
      >
        {MOBILE_NAV.map((n) => (
          <BottomNavigationAction key={n.path} label={n.label} icon={n.icon} sx={{ fontSize: 10 }} />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
