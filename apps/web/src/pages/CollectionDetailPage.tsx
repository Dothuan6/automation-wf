import React, { useMemo, useState } from 'react';
import { Box, Typography, TextField, InputAdornment, Stack, CircularProgress } from '@mui/material';
import { SearchOutlined } from '@mui/icons-material';
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import api from '../api/client';
import { DataTable } from '../components/records/DataTable';

type SchemaField = { id: string; name: string; type: string };

type CollectionDetail = { id: string; name: string; schema: SchemaField[]; recordCount: number };

type RecordResp = { items: Array<{ id: string; data: Record<string, unknown> }>; total: number };

export function CollectionDetailPage() {
  const { collectionId } = useParams({ from: '/app/collections/$collectionId' });
  const [search, setSearch] = useState('');

  const { data: collection, isLoading: loadingCollection } = useQuery({
    queryKey: ['collection', collectionId],
    queryFn: async () => (await api.get(`/collections/${collectionId}`)).data as CollectionDetail,
  });

  const { data: records, isLoading: loadingRecords } = useQuery({
    queryKey: ['collection-records', collectionId],
    queryFn: async () => (await api.get(`/collections/${collectionId}/records`)).data as RecordResp,
  });

  const schema = useMemo(() => (collection?.schema ?? []).map((f) => ({ id: f.id, label: f.name || f.id, type: f.type || 'text' })), [collection]);

  const filteredItems = useMemo(() => {
    const items = records?.items ?? [];
    if (!search.trim()) return items;
    const q = search.toLowerCase();
    return items.filter((r) => JSON.stringify(r.data).toLowerCase().includes(q));
  }, [records, search]);

  if (loadingCollection || loadingRecords) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress size={28} /></Box>;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h2">{collection?.name ?? 'Collection'}</Typography>
          <Typography variant="caption" color="text.secondary">{collection?.recordCount ?? 0} ban ghi</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <TextField
            size="small"
            placeholder="Tim kiem..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> }}
            sx={{ width: 240 }}
          />
        </Stack>
      </Box>
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <DataTable schema={schema} records={filteredItems} />
      </Box>
    </Box>
  );
}
