import React, { useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, CardActionArea, Button, TextField, InputAdornment, Chip, Divider, List, ListItemButton, ListItemText, ListItemIcon, CircularProgress } from '@mui/material';
import { SearchOutlined, AddOutlined, StorageOutlined, FolderOutlined } from '@mui/icons-material';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { dataClient as api } from '../api/data-client';

type Collection = {
  id: string;
  name: string;
  slug: string;
  recordCount: number;
  updatedAt: string;
  displayGroup?: string | null;
};

export function CollectionsHubPage() {
  const navigate = useNavigate();
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['collections', search],
    queryFn: async () => (await api.get('/collections', { params: { search } })).data as Collection[],
  });

  const collections = data ?? [];
  const groups = ['all', ...Array.from(new Set(collections.map((c) => c.displayGroup || 'other')))];
  const filtered = collections.filter((c) => selectedGroup === 'all' || (c.displayGroup || 'other') === selectedGroup);

  return (
    <Box sx={{ display: 'flex', gap: 3, height: '100%' }}>
      <Box sx={{ width: 200, flexShrink: 0 }}>
        <Typography variant="body2" sx={{ fontWeight: 600, mb: 1, color: 'text.secondary', textTransform: 'uppercase', fontSize: 11, letterSpacing: 0.5 }}>
          Nhom
        </Typography>
        <List dense disablePadding>
          {groups.map((g) => (
            <ListItemButton key={g} selected={selectedGroup === g} onClick={() => setSelectedGroup(g)} sx={{ borderRadius: 1.5, mb: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 28 }}><FolderOutlined fontSize="small" /></ListItemIcon>
              <ListItemText primary={<Typography variant="body2">{g}</Typography>} />
              <Chip label={g === 'all' ? collections.length : collections.filter((c) => (c.displayGroup || 'other') === g).length} size="small" sx={{ height: 18, fontSize: 11, minWidth: 24 }} />
            </ListItemButton>
          ))}
        </List>
      </Box>

      <Divider orientation="vertical" flexItem />

      <Box sx={{ flex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Typography variant="h2" sx={{ flex: 1 }}>Du lieu</Typography>
          <TextField
            size="small"
            placeholder="Tim bo suu tap..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> }}
            sx={{ width: 240 }}
          />
          <Button variant="contained" startIcon={<AddOutlined />} disabled>Tao moi</Button>
        </Box>

        {isLoading ? <CircularProgress size={24} /> : (
          <Grid container spacing={2}>
            {filtered.map((c) => (
              <Grid item xs={12} sm={6} md={4} key={c.id}>
                <Card>
                  <CardActionArea onClick={() => navigate({ to: `/collections/${c.id}` as any })}>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: 1.5, bgcolor: 'primary.light', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <StorageOutlined sx={{ fontSize: 18, color: 'primary.main' }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</Typography>
                          <Typography variant="caption" color="text.secondary">/{c.slug}</Typography>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="caption" color="text.secondary">{c.recordCount} ban ghi</Typography>
                        <Typography variant="caption" color="text.secondary">{new Date(c.updatedAt).toLocaleDateString('vi-VN')}</Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    </Box>
  );
}

