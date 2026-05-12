import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, InputBase, Box, List, ListItem,
  ListItemIcon, ListItemText, Typography, Divider, Chip,
} from '@mui/material';
import {
  SearchOutlined, AddOutlined, AssignmentOutlined,
  AccountTreeOutlined, StorageOutlined, PersonOutlined,
  PlayArrowOutlined, SettingsOutlined,
} from '@mui/icons-material';
import { useNavigate } from '@tanstack/react-router';

interface CommandItem {
  id: string;
  group: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const nav = (path: string) => { navigate({ to: path as any }); onClose(); };

  const ALL_COMMANDS: CommandItem[] = [
    // Quick Actions
    { id: 'new-record', group: 'HÃ nh Ä‘á»™ng nhanh', label: 'Táº¡o báº£n ghi má»›i', icon: <AddOutlined fontSize="small" />, shortcut: 'N', action: () => nav('/collections') },
    { id: 'new-workflow', group: 'HÃ nh Ä‘á»™ng nhanh', label: 'Táº¡o workflow má»›i', icon: <AccountTreeOutlined fontSize="small" />, shortcut: 'W', action: () => nav('/workflows') },
    { id: 'my-tasks', group: 'HÃ nh Ä‘á»™ng nhanh', label: 'Viá»‡c cá»§a tÃ´i', icon: <AssignmentOutlined fontSize="small" />, action: () => nav('/my-tasks') },
    { id: 'settings', group: 'HÃ nh Ä‘á»™ng nhanh', label: 'CÃ i Ä‘áº·t há»‡ thá»‘ng', icon: <SettingsOutlined fontSize="small" />, action: () => nav('/settings') },
    // Workflow
    { id: 'wf-list', group: 'Workflow', label: 'Danh sÃ¡ch workflow', icon: <AccountTreeOutlined fontSize="small" />, action: () => nav('/workflows') },
    { id: 'wf-runs', group: 'Workflow', label: 'Lá»‹ch sá»­ cháº¡y workflow', icon: <PlayArrowOutlined fontSize="small" />, action: () => nav('/workflows/runs') },
    // Records / Collections
    { id: 'collections', group: 'Dá»¯ liá»‡u', label: 'Bá»™ sÆ°u táº­p dá»¯ liá»‡u', icon: <StorageOutlined fontSize="small" />, action: () => nav('/collections') },
    // People
    { id: 'people', group: 'NhÃ¢n sá»±', label: 'Quáº£n lÃ½ ngÆ°á»i dÃ¹ng', icon: <PersonOutlined fontSize="small" />, action: () => nav('/settings') },
  ];

  const filtered = query.trim()
    ? ALL_COMMANDS.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.group.toLowerCase().includes(query.toLowerCase()),
      )
    : ALL_COMMANDS;

  const groups = Array.from(new Set(filtered.map((c) => c.group)));

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => setSelected(0), [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected((s) => Math.min(s + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected((s) => Math.max(s - 1, 0)); }
    if (e.key === 'Enter') { filtered[selected]?.action(); }
    if (e.key === 'Escape') onClose();
  };

  let flatIndex = -1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          width: 640, maxHeight: '70vh', borderRadius: 3,
          overflow: 'hidden', mt: '10vh', mx: 'auto',
        },
      }}
      BackdropProps={{ sx: { backdropFilter: 'blur(2px)' } }}
    >
      <DialogContent sx={{ p: 0 }}>
        {/* Search input */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
          <SearchOutlined sx={{ color: 'text.secondary', mr: 1.5 }} />
          <InputBase
            inputRef={inputRef}
            fullWidth
            placeholder="TÃ¬m kiáº¿m hoáº·c gÃµ lá»‡nh..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            sx={{ fontSize: 15 }}
          />
          <Chip label="Esc" size="small" sx={{ height: 20, fontSize: 11, borderRadius: 1 }} onClick={onClose} />
        </Box>

        {/* Results */}
        {filtered.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">KhÃ´ng tÃ¬m tháº¥y káº¿t quáº£ cho "{query}"</Typography>
          </Box>
        ) : (
          <Box sx={{ overflowY: 'auto', maxHeight: 'calc(70vh - 70px)' }}>
            {groups.map((group, gi) => {
              const items = filtered.filter((c) => c.group === group);
              return (
                <React.Fragment key={group}>
                  {gi > 0 && <Divider />}
                  <Box sx={{ px: 2, pt: 1.5, pb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {group}
                    </Typography>
                  </Box>
                  <List dense sx={{ py: 0 }}>
                    {items.map((item) => {
                      flatIndex++;
                      const idx = flatIndex;
                      return (
                        <ListItem
                          key={item.id}
                          button
                          selected={selected === idx}
                          onClick={item.action}
                          sx={{
                            px: 2, py: 0.75, borderRadius: 1.5, mx: 1, my: 0.25,
                            '&.Mui-selected': { bgcolor: 'primary.main', color: 'primary.contrastText', '& .MuiListItemIcon-root': { color: 'primary.contrastText' } },
                          }}
                        >
                          <ListItemIcon sx={{ minWidth: 32, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
                          <ListItemText
                            primary={<Typography variant="body2">{item.label}</Typography>}
                            secondary={item.description ? <Typography variant="caption">{item.description}</Typography> : undefined}
                          />
                          {item.shortcut && (
                            <Chip label={item.shortcut} size="small" sx={{ height: 18, fontSize: 11, borderRadius: 0.5 }} />
                          )}
                        </ListItem>
                      );
                    })}
                  </List>
                </React.Fragment>
              );
            })}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

