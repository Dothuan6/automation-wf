import React, { useState } from 'react';
import { Box, Typography, Tabs, Tab, Card, List, ListItem, Chip, Button, Divider, Avatar, CircularProgress } from '@mui/material';
import { AssignmentOutlined, ErrorOutline } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

type TaskItem = {
  id: string;
  title: string;
  dueAt: string | null;
  priority: string | null;
  status: string;
  run: { workflow: { name: string } };
};

type ApprovalItem = {
  id: string;
  status: string;
  dueAt: string | null;
  run: { workflow: { name: string } };
};

export function MyTasksPage() {
  const [tab, setTab] = useState(0);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['my-tasks'],
    queryFn: async () => (await api.get('/workflows/runs/my-tasks')).data as { tasks: TaskItem[]; approvals: ApprovalItem[] },
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => api.post(`/workflows/tasks/${taskId}/complete`, { formValues: {} }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-tasks'] }),
  });

  const approve = useMutation({
    mutationFn: async (approvalId: string) => api.post(`/workflows/approvals/${approvalId}/decision`, { decision: 'approved' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-tasks'] }),
  });

  if (isLoading) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress size={28} /></Box>;

  const tasks = data?.tasks ?? [];
  const approvals = data?.approvals ?? [];

  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>Viec cua toi</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Tab label="Task" />
        <Tab label="Phe duyet" />
      </Tabs>

      <Card>
        <List disablePadding>
          {tab === 0 && tasks.map((task, i) => (
            <React.Fragment key={task.id}>
              {i > 0 && <Divider />}
              <ListItem sx={{ py: 2, px: 2.5, display: 'flex', gap: 1.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.light' }}><AssignmentOutlined sx={{ fontSize: 18, color: 'primary.main' }} /></Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>{task.title}</Typography>
                  <Typography variant="caption" color="text.secondary">{task.run.workflow.name}</Typography>
                </Box>
                <Button variant="contained" size="small" disabled={completeTask.isPending} onClick={() => completeTask.mutate(task.id)}>Hoan thanh</Button>
              </ListItem>
            </React.Fragment>
          ))}

          {tab === 1 && approvals.map((ap, i) => (
            <React.Fragment key={ap.id}>
              {i > 0 && <Divider />}
              <ListItem sx={{ py: 2, px: 2.5, display: 'flex', gap: 1.5 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'warning.light' }}><ErrorOutline sx={{ fontSize: 18, color: 'warning.main' }} /></Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>Approval dang cho</Typography>
                  <Typography variant="caption" color="text.secondary">{ap.run.workflow.name}</Typography>
                </Box>
                <Chip label={ap.status} size="small" sx={{ mr: 1 }} />
                <Button variant="contained" size="small" disabled={approve.isPending} onClick={() => approve.mutate(ap.id)}>Phe duyet</Button>
              </ListItem>
            </React.Fragment>
          ))}

          {tab === 0 && tasks.length === 0 && <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">Khong co task</Typography></Box>}
          {tab === 1 && approvals.length === 0 && <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="text.secondary">Khong co approval</Typography></Box>}
        </List>
      </Card>
    </Box>
  );
}
