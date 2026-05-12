import React, { useState, useMemo } from 'react';
import {
  Box, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Checkbox, TableSortLabel, Chip, Typography,
  IconButton, Tooltip, Skeleton,
} from '@mui/material';
import { MoreVertOutlined } from '@mui/icons-material';

interface FieldSchema {
  id: string;
  label: string;
  type: string;
  options?: string[];
}

interface DataRecord {
  id: string;
  data: { [key: string]: any };
}

interface DataTableProps {
  schema: FieldSchema[];
  records: DataRecord[];
  loading?: boolean;
  onRowClick?: (record: DataRecord) => void;
}

function CellValue({ type, value }: { type: string; value: any }) {
  if (value === null || value === undefined) return <Typography variant="body2" color="text.disabled">—</Typography>;

  if (type === 'currency') {
    return (
      <Typography variant="body2">
        {Number(value).toLocaleString('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })}
      </Typography>
    );
  }
  if (type === 'date') {
    return <Typography variant="body2">{new Date(value).toLocaleDateString('vi-VN')}</Typography>;
  }
  if (type === 'boolean') {
    return <Chip label={value ? 'Có' : 'Không'} size="small" color={value ? 'success' : 'default'} sx={{ height: 20 }} />;
  }
  if (type === 'select') {
    return <Chip label={value} size="small" sx={{ height: 20, fontSize: 12 }} />;
  }
  return <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{String(value)}</Typography>;
}

export function DataTable({ schema, records, loading, onRowClick }: DataTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [orderBy, setOrderBy] = useState<string | null>(null);
  const [orderDir, setOrderDir] = useState<'asc' | 'desc'>('asc');

  const handleSort = (fieldId: string) => {
    if (orderBy === fieldId) {
      setOrderDir((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(fieldId);
      setOrderDir('asc');
    }
  };

  const sorted = useMemo(() => {
    if (!orderBy) return records;
    return [...records].sort((a, b) => {
      const av = a.data[orderBy];
      const bv = b.data[orderBy];
      if (av === bv) return 0;
      const cmp = String(av ?? '').localeCompare(String(bv ?? ''), 'vi');
      return orderDir === 'asc' ? cmp : -cmp;
    });
  }, [records, orderBy, orderDir]);

  const toggleAll = () => {
    if (selected.size === records.length) setSelected(new Set());
    else setSelected(new Set(records.map((r) => r.id)));
  };

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <Box>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={48} sx={{ mb: 0.5 }} />
        ))}
      </Box>
    );
  }

  return (
    <TableContainer sx={{ height: '100%', overflow: 'auto' }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" sx={{ bgcolor: 'background.paper' }}>
              <Checkbox
                size="small"
                indeterminate={selected.size > 0 && selected.size < records.length}
                checked={selected.size === records.length && records.length > 0}
                onChange={toggleAll}
              />
            </TableCell>
            {schema.map((col) => (
              <TableCell key={col.id} sx={{ bgcolor: 'background.paper', fontWeight: 600, whiteSpace: 'nowrap' }}>
                <TableSortLabel
                  active={orderBy === col.id}
                  direction={orderBy === col.id ? orderDir : 'asc'}
                  onClick={() => handleSort(col.id)}
                >
                  {col.label}
                </TableSortLabel>
              </TableCell>
            ))}
            <TableCell sx={{ bgcolor: 'background.paper', width: 40 }} />
          </TableRow>
        </TableHead>
        <TableBody>
          {sorted.map((record) => (
            <TableRow
              key={record.id}
              hover
              selected={selected.has(record.id)}
              onClick={() => onRowClick?.(record)}
              sx={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              <TableCell padding="checkbox" onClick={(e) => { e.stopPropagation(); toggleRow(record.id); }}>
                <Checkbox size="small" checked={selected.has(record.id)} />
              </TableCell>
              {schema.map((col) => (
                <TableCell key={col.id}>
                  <CellValue type={col.type} value={record.data[col.id]} />
                </TableCell>
              ))}
              <TableCell padding="none" onClick={(e) => e.stopPropagation()}>
                <Tooltip title="Thêm tùy chọn">
                  <IconButton size="small"><MoreVertOutlined fontSize="small" /></IconButton>
                </Tooltip>
              </TableCell>
            </TableRow>
          ))}
          {records.length === 0 && (
            <TableRow>
              <TableCell colSpan={schema.length + 2} sx={{ textAlign: 'center', py: 6, color: 'text.secondary' }}>
                Chưa có bản ghi nào
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
