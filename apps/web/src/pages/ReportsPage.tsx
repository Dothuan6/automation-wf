import React from 'react';
import { Box, Typography, Grid, Card, CardContent } from '@mui/material';
import { BarChartOutlined } from '@mui/icons-material';

export function ReportsPage() {
  return (
    <Box>
      <Typography variant="h2" sx={{ mb: 3 }}>Báo cáo</Typography>
      <Grid container spacing={3}>
        {['Tổng quan hiệu suất', 'Workflow hoàn thành', 'Hoạt động nhân sự', 'Doanh thu'].map((title) => (
          <Grid item xs={12} sm={6} key={title}>
            <Card>
              <CardContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
                <BarChartOutlined sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                <Typography variant="body1" color="text.secondary">{title}</Typography>
                <Typography variant="caption" color="text.disabled">Sắp ra mắt</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
