import React, { useState, useCallback } from 'react';
import {
  Box, Typography, Button, Paper, Drawer, TextField, Select,
  MenuItem, FormControl, InputLabel, Divider, Chip, IconButton,
  Tooltip, Stack,
} from '@mui/material';
import {
  SaveOutlined, PlayArrowOutlined, CloseOutlined,
  AccountTreeOutlined, AssignmentOutlined, HttpOutlined,
  NotificationsOutlined, CallSplitOutlined, TimerOutlined,
  LoopOutlined, StopOutlined,
} from '@mui/icons-material';
import ReactFlow, {
  Background, Controls, MiniMap, addEdge, useNodesState,
  useEdgesState, Node, Edge, Connection,
} from 'reactflow';
import 'reactflow/dist/style.css';

const NODE_TYPES_CATALOG = [
  { type: 'manual_trigger', label: 'Trigger thủ công', icon: <PlayArrowOutlined />, color: '#1A73E8' },
  { type: 'record_trigger', label: 'Trigger bản ghi', icon: <AccountTreeOutlined />, color: '#1A73E8' },
  { type: 'user_task', label: 'Nhiệm vụ người dùng', icon: <AssignmentOutlined />, color: '#F9AB00' },
  { type: 'approval_task', label: 'Phê duyệt', icon: <AssignmentOutlined />, color: '#F9AB00' },
  { type: 'http_request', label: 'HTTP Request', icon: <HttpOutlined />, color: '#5F6368' },
  { type: 'notification', label: 'Thông báo', icon: <NotificationsOutlined />, color: '#1E8E3E' },
  { type: 'business_rule', label: 'Quy tắc nghiệp vụ', icon: <CallSplitOutlined />, color: '#9334E6' },
  { type: 'if_else', label: 'Rẽ nhánh If/Else', icon: <CallSplitOutlined />, color: '#9334E6' },
  { type: 'timer_wait', label: 'Hẹn giờ chờ', icon: <TimerOutlined />, color: '#E8711A' },
  { type: 'sub_workflow', label: 'Sub-workflow', icon: <LoopOutlined />, color: '#5F6368' },
  { type: 'end', label: 'Kết thúc', icon: <StopOutlined />, color: '#D93025' },
];

const INITIAL_NODES: Node[] = [
  { id: 'n1', type: 'default', position: { x: 250, y: 50 }, data: { label: 'Trigger thủ công', nodeType: 'manual_trigger' } },
  { id: 'n2', type: 'default', position: { x: 250, y: 200 }, data: { label: 'Kết thúc', nodeType: 'end' } },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1-2', source: 'n1', target: 'n2', animated: false },
];

export function WorkflowEditorPage() {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const onConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge(params, eds));
  }, []);

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setDrawerOpen(true);
  };

  const addNode = (type: typeof NODE_TYPES_CATALOG[0]) => {
    const id = `n${Date.now()}`;
    setNodes((nds) => [...nds, {
      id,
      type: 'default',
      position: { x: 250 + Math.random() * 100, y: 150 + nds.length * 80 },
      data: { label: type.label, nodeType: type.type },
    }]);
  };

  return (
    <Box sx={{ display: 'flex', height: '100%', mx: -4, my: -4 }}>
      {/* Node Library (left panel) */}
      <Box sx={{ width: 220, borderRight: '1px solid', borderColor: 'divider', bgcolor: 'background.paper', overflowY: 'auto', p: 1.5 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 1 }}>
          Thư viện node
        </Typography>
        {NODE_TYPES_CATALOG.map((nt) => (
          <Paper
            key={nt.type}
            variant="outlined"
            sx={{
              display: 'flex', alignItems: 'center', gap: 1, p: 1, mb: 0.75,
              cursor: 'grab', '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
            }}
            onClick={() => addNode(nt)}
          >
            <Box sx={{ color: nt.color, display: 'flex', fontSize: 18 }}>{nt.icon}</Box>
            <Typography variant="body2" sx={{ fontSize: 12 }}>{nt.label}</Typography>
          </Paper>
        ))}
      </Box>

      {/* Canvas */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        {/* Topbar */}
        <Box sx={{ position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10, display: 'flex', gap: 1 }}>
          <Button variant="outlined" size="small" startIcon={<SaveOutlined />}>Lưu nháp</Button>
          <Button variant="contained" size="small" startIcon={<PlayArrowOutlined />} color="success">Xuất bản</Button>
        </Box>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </Box>

      {/* Inspector (right drawer) */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        variant="persistent"
        sx={{ '& .MuiDrawer-paper': { width: 320, position: 'relative', border: 'none', borderLeft: '1px solid', borderColor: 'divider' } }}
      >
        {selectedNode && (
          <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h3">Cấu hình node</Typography>
              <IconButton size="small" onClick={() => setDrawerOpen(false)}><CloseOutlined fontSize="small" /></IconButton>
            </Box>
            <Chip label={selectedNode.data.nodeType} size="small" sx={{ mb: 2 }} />
            <Divider sx={{ mb: 2 }} />
            <Stack spacing={2}>
              <TextField label="Tên node" size="small" defaultValue={selectedNode.data.label} fullWidth />
              {selectedNode.data.nodeType === 'user_task' && (
                <>
                  <TextField label="Tiêu đề nhiệm vụ" size="small" fullWidth />
                  <FormControl size="small" fullWidth>
                    <InputLabel>Người thực hiện</InputLabel>
                    <Select label="Người thực hiện" defaultValue="role">
                      <MenuItem value="role">Theo vai trò</MenuItem>
                      <MenuItem value="user">Người dùng cụ thể</MenuItem>
                      <MenuItem value="team">Theo nhóm</MenuItem>
                    </Select>
                  </FormControl>
                </>
              )}
              {selectedNode.data.nodeType === 'http_request' && (
                <>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Phương thức</InputLabel>
                    <Select label="Phương thức" defaultValue="GET">
                      {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField label="URL" size="small" fullWidth placeholder="https://..." />
                </>
              )}
              {selectedNode.data.nodeType === 'notification' && (
                <>
                  <FormControl size="small" fullWidth>
                    <InputLabel>Kênh</InputLabel>
                    <Select label="Kênh" defaultValue="in_app">
                      <MenuItem value="in_app">In-app</MenuItem>
                      <MenuItem value="email">Email</MenuItem>
                      <MenuItem value="slack">Slack</MenuItem>
                    </Select>
                  </FormControl>
                  <TextField label="Nội dung" size="small" fullWidth multiline rows={3} />
                </>
              )}
            </Stack>
          </Box>
        )}
      </Drawer>
    </Box>
  );
}
