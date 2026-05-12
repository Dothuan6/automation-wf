import React from 'react';
import { Box, Typography, Card, CardContent, Grid, Chip, Button, IconButton, Tooltip } from '@mui/material';
import { FolderOutlined, InsertDriveFileOutlined, AddOutlined, DownloadOutlined } from '@mui/icons-material';

const MOCK_FILES = [
  { id: '1', name: 'Hợp đồng khách hàng ABC.pdf', type: 'pdf', size: '2.4 MB', updatedAt: '2026-05-11', folder: 'Hợp đồng' },
  { id: '2', name: 'Bảng lương tháng 5.xlsx', type: 'excel', size: '1.1 MB', updatedAt: '2026-05-10', folder: 'Nhân sự' },
  { id: '3', name: 'Catalog sản phẩm 2026.pdf', type: 'pdf', size: '8.7 MB', updatedAt: '2026-05-09', folder: 'Marketing' },
  { id: '4', name: 'Logo công ty.png', type: 'image', size: '0.4 MB', updatedAt: '2026-05-08', folder: 'Tài nguyên' },
];

const FOLDERS = ['Tất cả', 'Hợp đồng', 'Nhân sự', 'Marketing', 'Tài nguyên'];

function fileColor(type: string) {
  if (type === 'pdf') return '#D93025';
  if (type === 'excel') return '#1E8E3E';
  if (type === 'image') return '#1A73E8';
  return '#5F6368';
}

export function FilesPage() {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Typography variant="h2" sx={{ flex: 1 }}>File</Typography>
        <Button variant="contained" startIcon={<AddOutlined />}>Tải lên</Button>
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {FOLDERS.map((f) => (
          <Chip key={f} label={f} clickable variant={f === 'Tất cả' ? 'filled' : 'outlined'} color={f === 'Tất cả' ? 'primary' : 'default'} />
        ))}
      </Box>

      <Grid container spacing={2}>
        {MOCK_FILES.map((file) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={file.id}>
            <Card>
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                  <InsertDriveFileOutlined sx={{ fontSize: 36, color: fileColor(file.type), flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {file.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">{file.size}</Typography>
                  </Box>
                  <Tooltip title="Tải xuống">
                    <IconButton size="small"><DownloadOutlined fontSize="small" /></IconButton>
                  </Tooltip>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Chip label={file.folder} size="small" sx={{ height: 18, fontSize: 11 }} />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(file.updatedAt).toLocaleDateString('vi-VN')}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
