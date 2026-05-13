import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Tabs, Tab, Card, CardContent, TextField,
  Button, Switch, FormControlLabel, Divider, List, ListItem,
  ListItemText, ListItemSecondaryAction, Chip, Avatar, IconButton, Tooltip,
  Snackbar, Alert
} from '@mui/material';
import { AddOutlined, EditOutlined, DeleteOutlined } from '@mui/icons-material';
import apiClient from '../api/client';

const MOCK_USERS = [
  { id: '1', name: 'Nguyễn Văn Admin', email: 'admin@company.vn', role: 'admin', status: 'active' },
  { id: '2', name: 'Trần Thị Manager', email: 'manager@company.vn', role: 'manager', status: 'active' },
  { id: '3', name: 'Lê Văn Member', email: 'member@company.vn', role: 'member', status: 'active' },
  { id: '4', name: 'Phạm Thị Viewer', email: 'viewer@company.vn', role: 'viewer', status: 'suspended' },
];

function roleColor(r: string) {
  if (r === 'admin') return 'error';
  if (r === 'manager') return 'warning';
  if (r === 'member') return 'primary';
  return 'default';
}

export function SettingsPage() {
  const [tab, setTab] = useState(0);

  // AI Config state
  const [aiEndpoint, setAiEndpoint] = useState('https://api.openai.com/v1');
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [aiEnabled, setAiEnabled] = useState(true);
  
  const [toast, setToast] = useState<{msg: string, type: 'success'|'error'} | null>(null);

  useEffect(() => {
    if (tab === 2) {
      loadAiSettings();
    }
  }, [tab]);

  const loadAiSettings = async () => {
    try {
      const [ep, key, mod, en] = await Promise.all([
        apiClient.get('/settings/key/ai_api_endpoint').then(res => res.data),
        apiClient.get('/settings/key/ai_api_key').then(res => res.data),
        apiClient.get('/settings/key/ai_model').then(res => res.data),
        apiClient.get('/settings/key/ai_enabled').then(res => res.data)
      ]);
      if (ep) setAiEndpoint(ep);
      if (key) setAiKey(key);
      if (mod) setAiModel(mod);
      if (en !== null && en !== undefined) setAiEnabled(en === 'true' || en === true);
    } catch (err) {
      console.error('Failed to load AI settings', err);
    }
  };

  const saveAiSettings = async () => {
    try {
      await Promise.all([
        apiClient.patch('/settings/ai_api_endpoint', { value: aiEndpoint }),
        apiClient.patch('/settings/ai_api_key', { value: aiKey }),
        apiClient.patch('/settings/ai_model', { value: aiModel }),
        apiClient.patch('/settings/ai_enabled', { value: String(aiEnabled) }),
      ]);
      setToast({ msg: 'Lưu cấu hình thành công', type: 'success' });
    } catch (err) {
      console.error(err);
      setToast({ msg: 'Lỗi khi lưu cấu hình', type: 'error' });
    }
  };

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>Cài đặt</Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab label="Công ty" />
        <Tab label="Người dùng" />
        <Tab label="AI & Tích hợp" />
        <Tab label="Thông báo" />
      </Tabs>

      {tab === 0 && (
        <Card sx={{ maxWidth: 600 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h3" sx={{ mb: 2 }}>Thông tin công ty</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="Tên công ty" size="small" defaultValue="XBuild Demo Company" fullWidth />
              <TextField label="Địa chỉ" size="small" fullWidth />
              <TextField label="Số điện thoại" size="small" fullWidth />
              <TextField label="Website" size="small" fullWidth />
              <Button variant="contained" sx={{ alignSelf: 'flex-start' }}>Lưu thay đổi</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {tab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h3" sx={{ flex: 1 }}>Người dùng ({MOCK_USERS.length})</Typography>
            <Button variant="contained" size="small" startIcon={<AddOutlined />}>Mời người dùng</Button>
          </Box>
          <Card>
            <List disablePadding>
              {MOCK_USERS.map((user, i) => (
                <React.Fragment key={user.id}>
                  {i > 0 && <Divider />}
                  <ListItem sx={{ py: 1.5, px: 2 }}>
                    <Avatar sx={{ width: 36, height: 36, mr: 1.5, bgcolor: 'primary.light', color: 'primary.main', fontSize: 14 }}>
                      {user.name[0]}
                    </Avatar>
                    <ListItemText
                      primary={<Typography variant="body2" sx={{ fontWeight: 500 }}>{user.name}</Typography>}
                      secondary={user.email}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip label={user.role} size="small" color={roleColor(user.role) as any} sx={{ height: 20 }} />
                      {user.status === 'suspended' && <Chip label="Tạm khóa" size="small" color="default" sx={{ height: 20 }} />}
                      <Tooltip title="Chỉnh sửa">
                        <IconButton size="small"><EditOutlined fontSize="small" /></IconButton>
                      </Tooltip>
                    </Box>
                  </ListItem>
                </React.Fragment>
              ))}
            </List>
          </Card>
        </Box>
      )}

      {tab === 2 && (
        <Card sx={{ maxWidth: 600 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h3" sx={{ mb: 2 }}>Cấu hình AI</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField label="API Endpoint" size="small" fullWidth value={aiEndpoint} onChange={(e) => setAiEndpoint(e.target.value)} />
              <TextField label="API Key" size="small" fullWidth type="password" value={aiKey} onChange={(e) => setAiKey(e.target.value)} placeholder="Nhập API Key để cập nhật" />
              <TextField label="Model" size="small" fullWidth value={aiModel} onChange={(e) => setAiModel(e.target.value)} />
              <FormControlLabel control={<Switch checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} />} label="Bật AI Assistant" />
              <Button variant="contained" sx={{ alignSelf: 'flex-start' }} onClick={saveAiSettings}>Lưu cấu hình</Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {tab === 3 && (
        <Card sx={{ maxWidth: 600 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h3" sx={{ mb: 2 }}>Kênh thông báo</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <FormControlLabel control={<Switch defaultChecked />} label="In-app (luôn bật)" disabled />
              <FormControlLabel control={<Switch />} label="Email (SMTP)" />
              <FormControlLabel control={<Switch />} label="Zalo OA" />
              <FormControlLabel control={<Switch />} label="Slack" />
            </Box>
          </CardContent>
        </Card>
      )}
      
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)}>
        <Alert severity={toast?.type || 'info'} onClose={() => setToast(null)}>{toast?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
