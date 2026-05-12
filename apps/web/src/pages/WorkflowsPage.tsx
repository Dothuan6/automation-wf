import React, { useState } from 'react';
import { Box, Typography, Grid, Card, CardContent, Chip, TextField, InputAdornment, Tabs, Tab, Avatar, IconButton, CircularProgress } from '@mui/material';
import { SearchOutlined, AccountTreeOutlined, EditOutlined } from '@mui/icons-material';
import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { dataClient as api } from '../api/data-client';

type Workflow = { id: string; name: string; status: string; _count?: { runs: number }; updatedAt: string };
type RunItem = { id: string; status: string; triggeredAt: string; workflow: { name: string } };

export function WorkflowsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [search, setSearch] = useState('');

  const { data: wfData, isLoading: loadingWf } = useQuery({
    queryKey: ['workflows', search],
    queryFn: async () => (await api.get('/workflows', { params: { search } })).data as { items: Workflow[] },
  });

  const { data: runData, isLoading: loadingRuns } = useQuery({
    queryKey: ['workflow-runs'],
    queryFn: async () => (await api.get('/workflows/runs/all')).data as { items: RunItem[] },
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="h2" sx={{ flex: 1 }}>Workflow</Typography>
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab label="Tat ca workflow" />
        <Tab label="Lich su chay" />
      </Tabs>

      {tab === 0 && (
        <>
          <TextField size="small" placeholder="Tim workflow..." value={search} onChange={(e) => setSearch(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><SearchOutlined fontSize="small" /></InputAdornment> }} sx={{ mb: 2, width: 280 }} />
          {loadingWf ? <CircularProgress size={24} /> : (
            <Grid container spacing={2}>
              {(wfData?.items ?? []).map((wf) => (
                <Grid item xs={12} sm={6} md={4} key={wf.id}>
                  <Card>
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.light', mr: 1.5 }}><AccountTreeOutlined sx={{ fontSize: 18, color: 'primary.main' }} /></Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.25 }}>{wf.name}</Typography>
                          <Chip label={wf.status} size="small" sx={{ height: 18, fontSize: 11 }} />
                        </Box>
                        <IconButton size="small" onClick={() => navigate({ to: `/workflows/${wf.id}/edit` as any })}><EditOutlined fontSize="small" /></IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {tab === 1 && (
        <Box>
          {loadingRuns ? <CircularProgress size={24} /> : (runData?.items ?? []).map((run) => (
            <Card key={run.id} sx={{ mb: 1, cursor: 'pointer' }} onClick={() => navigate({ to: `/workflows/runs/${run.id}` as any })}>
              <CardContent sx={{ py: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip label={run.status} size="small" sx={{ minWidth: 100 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{run.workflow.name}</Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">{new Date(run.triggeredAt).toLocaleString('vi-VN')}</Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}

