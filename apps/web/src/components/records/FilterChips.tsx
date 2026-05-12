import { Box, Chip, Typography } from '@mui/material';
import { FilterListOutlined } from '@mui/icons-material';

interface Filter {
  id: string;
  label: string;
  value: string;
}

interface FilterChipsProps {
  filters: Filter[];
  onRemove: (id: string) => void;
}

export function FilterChips({ filters, onRemove }: FilterChipsProps) {
  if (filters.length === 0) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
      <FilterListOutlined fontSize="small" sx={{ color: 'text.secondary' }} />
      <Typography variant="caption" color="text.secondary">Đang lọc:</Typography>
      {filters.map((f) => (
        <Chip
          key={f.id}
          label={`${f.label}: ${f.value}`}
          size="small"
          onDelete={() => onRemove(f.id)}
          sx={{ height: 24 }}
        />
      ))}
    </Box>
  );
}
