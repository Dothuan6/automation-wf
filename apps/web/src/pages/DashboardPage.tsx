import React from 'react';
import { Box, Grid, Card, CardContent, Typography, List, ListItem, ListItemText, ListItemIcon, Chip, Divider, Avatar, CircularProgress } from '@mui/material';
import { AssignmentOutlined, ErrorOutline } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { dataClient as api } from '../api/data-client';

function KpiCard({ title, value, color }: { title: string; value: string | number; color?: string }) {
  return (
    <Card>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>{title}</Typography>
        <Typography variant="h2" sx={{ color: color ?? 'text.primary' }}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

function TaskRow({ task }: { task: { type: 'task' | 'approval'; title: string; subtitle: string } }) {
  const isApproval = task.type === 'approval';
  return (
    <ListItem sx={{ px: 0, py: 1 }}>
      <ListItemIcon sx={{ minWidth: 36 }}>
        {isApproval
          ? <ErrorOutline sx={{ color: 'warning.main', fontSize: 20 }} />
          : <AssignmentOutlined sx={{ color: 'primary.main', fontSize: 20 }} />}
      </ListItemIcon>
      <ListItemText
        primary={<Typography variant="body2" sx={{ fontWeight: 500 }}>{task.title}</Typography>}
        secondary={<Typography variant="caption" color="text.secondary">{task.subtitle}</Typography>}
      />
      <Chip label={isApproval ? 'Phe duyet' : 'Nhiem vu'} size="small" color={isApproval ? 'warning' : 'primary'} variant="outlined" />
    </ListItem>
  );
}

export function DashboardPage() {
  const { data: kpi, isLoading: loadingKpi } = useQuery({
    queryKey: ['dashboard-kpi'],
    queryFn: async () => (await api.get('/dashboard/kpi')).data as {
      totalCollections: number;
      totalRecords: number;
      totalWorkflowDefinitions: number;
      activeRuns: number;
      totalFiles: number;
    },
  });

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: async () => (await api.get('/dashboard/summary')).data as {
      myTasksCount: number;
      myApprovalsCount: number;
      recentRuns: Array<{ id: string; status: string; triggeredAt: string; workflow: { name: string } }>;
    },
  });

  if (loadingKpi || loadingSummary) {
    return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress size={28} /></Box>;
  }

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>Trang chu</Typography>
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}><KpiCard title="Tong ban ghi" value={kpi?.totalRecords ?? 0} /></Grid>
        <Grid item xs={6} sm={3}><KpiCard title="Viec dang cho" value={summary?.myTasksCount ?? 0} color="warning.main" /></Grid>
        <Grid item xs={6} sm={3}><KpiCard title="Workflow" value={kpi?.totalWorkflowDefinitions ?? 0} color="primary.main" /></Grid>
        <Grid item xs={6} sm={3}><KpiCard title="Workflow dang chay" value={kpi?.activeRuns ?? 0} color="success.main" /></Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h3" sx={{ mb: 1 }}>Viec can lam</Typography>
              <Divider sx={{ mb: 1 }} />
              <List disablePadding>
                <TaskRow task={{ type: 'task', title: `${summary?.myTasksCount ?? 0} task dang cho`, subtitle: 'Task cua toi' }} />
                <Divider />
                <TaskRow task={{ type: 'approval', title: `${summary?.myApprovalsCount ?? 0} yeu cau phe duyet`, subtitle: 'Approval cua toi' }} />
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography variant="h3" sx={{ mb: 1 }}>Run gan day</Typography>
              <Divider sx={{ mb: 1 }} />
              <List disablePadding>
                {(summary?.recentRuns ?? []).map((run, i) => (
                  <React.Fragment key={run.id}>
                    {i > 0 && <Divider />}
                    <ListItem sx={{ px: 0, py: 0.75 }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.light' }}>R</Avatar>
                      </ListItemIcon>
                      <ListItemText
                        primary={<Typography variant="body2">{run.workflow.name} - {run.status}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary">{new Date(run.triggeredAt).toLocaleString('vi-VN')}</Typography>}
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

