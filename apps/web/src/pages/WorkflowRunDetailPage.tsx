import React, { useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, Chip, Stepper, Step, StepLabel, StepContent, Button, Divider, Accordion, AccordionSummary, AccordionDetails, TextField, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress } from '@mui/material';
import { ExpandMoreOutlined } from '@mui/icons-material';
import { useParams } from '@tanstack/react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../api/client';

type RunDetail = {
  id: string;
  status: string;
  triggeredAt: string;
  workflow: { name: string };
  context: Record<string, unknown>;
  variables: Record<string, unknown>;
  nodeExecutions: Array<{ id: string; nodeId: string; nodeType: string; status: string; output: unknown; startedAt: string; completedAt?: string | null }>;
  taskItems: Array<{ id: string; title: string; status: string; nodeId: string }>;
  approvalItems: Array<{ id: string; status: string; nodeId: string }>;
};

export function WorkflowRunDetailPage() {
  const { runId } = useParams({ from: '/app/workflows/runs/$runId' });
  const qc = useQueryClient();
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [taskNote, setTaskNote] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['workflow-run', runId],
    queryFn: async () => (await api.get(`/workflows/runs/${runId}`)).data as RunDetail,
  });

  const completeTask = useMutation({
    mutationFn: async (taskId: string) => api.post(`/workflows/tasks/${taskId}/complete`, { formValues: { note: taskNote } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflow-run', runId] }),
  });

  if (isLoading || !data) return <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}><CircularProgress size={28} /></Box>;

  const waitingTask = data.taskItems.find((t) => t.status === 'pending');

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h2" sx={{ mb: 0.5 }}>{data.workflow.name}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={data.status} size="small" color="warning" />
            <Typography variant="caption" color="text.secondary">Bat dau {new Date(data.triggeredAt).toLocaleString('vi-VN')}</Typography>
          </Box>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card><CardContent>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>Context</Typography>
            <Box component="pre" sx={{ fontSize: 12, fontFamily: 'monospace', overflow: 'auto' }}>{JSON.stringify(data.context, null, 2)}</Box>
          </CardContent></Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card><CardContent>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 2 }}>Tien trinh</Typography>
            <Stepper orientation="vertical" nonLinear>
              {data.nodeExecutions.map((step) => (
                <Step key={step.id} active={step.status === 'running' || step.status === 'waiting'} completed={step.status === 'completed'}>
                  <StepLabel>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">{step.nodeId}</Typography>
                      <Chip label={step.nodeType} size="small" sx={{ height: 18, fontSize: 10 }} />
                      <Chip label={step.status} size="small" sx={{ height: 18, fontSize: 10 }} />
                    </Box>
                  </StepLabel>
                  <StepContent>
                    {Boolean(step.output) && (
                      <Accordion elevation={0} sx={{ mt: 1, border: '1px solid', borderColor: 'divider' }}>
                        <AccordionSummary expandIcon={<ExpandMoreOutlined fontSize="small" />} sx={{ minHeight: 36, py: 0 }}>
                          <Typography variant="caption">Output</Typography>
                        </AccordionSummary>
                        <AccordionDetails sx={{ pt: 0 }}>
                          <Box component="pre" sx={{ fontSize: 12, fontFamily: 'monospace', m: 0, overflow: 'auto' }}>{JSON.stringify(step.output, null, 2)}</Box>
                        </AccordionDetails>
                      </Accordion>
                    )}
                  </StepContent>
                </Step>
              ))}
            </Stepper>
          </CardContent></Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card><CardContent>
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.5 }}>Task dang cho</Typography>
            {waitingTask ? (
              <>
                <Typography variant="body2" sx={{ mb: 1 }}>{waitingTask.title}</Typography>
                <Button variant="contained" size="small" onClick={() => setTaskDialogOpen(true)}>Hoan thanh nhiem vu</Button>
              </>
            ) : <Typography variant="caption" color="text.secondary">Khong co task cho</Typography>}
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Variables</Typography>
            <Box component="pre" sx={{ fontSize: 12, fontFamily: 'monospace', overflow: 'auto', bgcolor: 'background.default', p: 1, borderRadius: 1 }}>{JSON.stringify(data.variables, null, 2)}</Box>
          </CardContent></Card>
        </Grid>
      </Grid>

      <Dialog open={taskDialogOpen} onClose={() => setTaskDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Hoan thanh task</DialogTitle>
        <DialogContent>
          <TextField label="Ghi chu" multiline rows={3} fullWidth size="small" sx={{ mt: 1 }} value={taskNote} onChange={(e) => setTaskNote(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDialogOpen(false)}>Huy</Button>
          <Button variant="contained" disabled={!waitingTask || completeTask.isPending} onClick={() => waitingTask && completeTask.mutate(waitingTask.id)}>Xac nhan</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
