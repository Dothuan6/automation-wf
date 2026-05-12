import React, { useState } from 'react';
import {
  AppBar, Toolbar, Box, IconButton, Avatar, Tooltip,
  Badge, Typography, Popover, List, ListItem, ListItemText,
  ListItemAvatar, Divider, Tabs, Tab, Button, Chip,
} from '@mui/material';
import {
  NotificationsOutlined, SearchOutlined, CheckCircleOutline,
  ErrorOutline, InfoOutlined,
} from '@mui/icons-material';
import { useAuthStore } from '../../stores/auth.store';

interface AppHeaderProps {
  onOpenCommandPalette: () => void;
}

const MOCK_NOTIFICATIONS = [
  { id: '1', type: 'task', title: 'Phê duyệt hợp đồng mới', body: 'Nguyễn Văn A yêu cầu phê duyệt', time: '5 phút trước', read: false },
  { id: '2', type: 'info', title: 'Workflow hoàn thành', body: 'Quy trình onboarding nhân viên đã xong', time: '1 giờ trước', read: false },
  { id: '3', type: 'success', title: 'Nhập dữ liệu thành công', body: '250 bản ghi đã được import', time: '2 giờ trước', read: true },
];

function NotificationIcon({ type }: { type: string }) {
  if (type === 'success') return <CheckCircleOutline sx={{ color: 'success.main' }} />;
  if (type === 'task') return <ErrorOutline sx={{ color: 'warning.main' }} />;
  return <InfoOutlined sx={{ color: 'info.main' }} />;
}

export function AppHeader({ onOpenCommandPalette }: AppHeaderProps) {
  const { user, logout } = useAuthStore();
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [avatarAnchor, setAvatarAnchor] = useState<HTMLElement | null>(null);
  const [notifTab, setNotifTab] = useState(0);

  const unreadCount = MOCK_NOTIFICATIONS.filter((n) => !n.read).length;

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{ bgcolor: 'background.paper', borderBottom: '1px solid', borderColor: 'divider', zIndex: 10 }}
    >
      <Toolbar sx={{ minHeight: '56px !important', px: 2, gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
          <Box
            sx={{
              width: 28, height: 28, borderRadius: 1.5,
              bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Typography sx={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>X</Typography>
          </Box>
          <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary', display: { xs: 'none', sm: 'block' } }}>
            XBuild
          </Typography>
        </Box>

        <Box
          onClick={onOpenCommandPalette}
          sx={{
            flex: 1, maxWidth: 480,
            display: 'flex', alignItems: 'center', gap: 1,
            height: 36, px: 1.5, borderRadius: 2,
            border: '1px solid', borderColor: 'divider',
            cursor: 'pointer', bgcolor: 'background.default',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'background.paper' },
          }}
        >
          <SearchOutlined sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Typography variant="body2" sx={{ color: 'text.secondary', flex: 1 }}>
            Tìm kiếm...
          </Typography>
          <Chip label="Ctrl K" size="small" sx={{ height: 20, fontSize: 11, borderRadius: 1 }} />
        </Box>

        <Box sx={{ flex: 1 }} />

        <Tooltip title="Thông báo">
          <IconButton size="small" onClick={(e) => setNotifAnchor(e.currentTarget)}>
            <Badge badgeContent={unreadCount} color="error" max={9}>
              <NotificationsOutlined fontSize="small" />
            </Badge>
          </IconButton>
        </Tooltip>

        <Tooltip title={user?.fullName ?? user?.email ?? ''}>
          <IconButton size="small" onClick={(e) => setAvatarAnchor(e.currentTarget)} sx={{ ml: 0.5 }}>
            <Avatar
              src={user?.avatarUrl}
              sx={{ width: 32, height: 32, fontSize: 13, bgcolor: 'primary.main' }}
            >
              {(user?.fullName ?? user?.email ?? 'U')[0].toUpperCase()}
            </Avatar>
          </IconButton>
        </Tooltip>
      </Toolbar>

      <Popover
        open={Boolean(notifAnchor)}
        anchorEl={notifAnchor}
        onClose={() => setNotifAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 380, maxHeight: 520 } }}
      >
        <Box sx={{ p: 2, pb: 0 }}>
          <Typography variant="h3" sx={{ mb: 1 }}>Thông báo</Typography>
          <Tabs value={notifTab} onChange={(_, v) => setNotifTab(v)} sx={{ minHeight: 36 }}>
            <Tab label="Tất cả" sx={{ minHeight: 36, py: 0, fontSize: 13 }} />
            <Tab label="Chưa đọc" sx={{ minHeight: 36, py: 0, fontSize: 13 }} />
            <Tab label="Đề cập" sx={{ minHeight: 36, py: 0, fontSize: 13 }} />
          </Tabs>
        </Box>
        <Divider />
        <List sx={{ py: 0 }}>
          {MOCK_NOTIFICATIONS.map((n) => (
            <React.Fragment key={n.id}>
              <ListItem
                alignItems="flex-start"
                sx={{
                  py: 1.5, cursor: 'pointer',
                  bgcolor: n.read ? 'transparent' : 'action.hover',
                  '&:hover': { bgcolor: 'action.selected' },
                }}
              >
                <ListItemAvatar sx={{ minWidth: 36, mt: 0.25 }}>
                  <NotificationIcon type={n.type} />
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography variant="body2" sx={{ fontWeight: n.read ? 400 : 600 }}>{n.title}</Typography>}
                  secondary={
                    <>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>{n.body}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.disabled' }}>{n.time}</Typography>
                    </>
                  }
                />
              </ListItem>
              <Divider component="li" />
            </React.Fragment>
          ))}
        </List>
        <Box sx={{ p: 1.5, textAlign: 'center' }}>
          <Button size="small" sx={{ fontSize: 12 }}>Xem tất cả thông báo</Button>
        </Box>
      </Popover>

      <Popover
        open={Boolean(avatarAnchor)}
        anchorEl={avatarAnchor}
        onClose={() => setAvatarAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 220 } }}
      >
        <Box sx={{ p: 2, pb: 1.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{user?.fullName ?? 'Người dùng'}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>{user?.email}</Typography>
        </Box>
        <Divider />
        <List dense sx={{ py: 0.5 }}>
          <ListItem button sx={{ borderRadius: 1, mx: 0.5 }}>
            <ListItemText primary={<Typography variant="body2">Hồ sơ cá nhân</Typography>} />
          </ListItem>
          <ListItem button sx={{ borderRadius: 1, mx: 0.5 }}>
            <ListItemText primary={<Typography variant="body2">Cài đặt</Typography>} />
          </ListItem>
        </List>
        <Divider />
        <Box sx={{ p: 1 }}>
          <Button fullWidth size="small" color="error" onClick={() => { logout(); setAvatarAnchor(null); }}>
            Đăng xuất
          </Button>
        </Box>
      </Popover>
    </AppBar>
  );
}
