import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, TextField, IconButton, Card, CardContent, Button,
  CircularProgress, Avatar, Divider, Chip
} from '@mui/material';
import { Send, SmartToy, Person } from '@mui/icons-material';
import { useNavigate } from '@tanstack/react-router';
import apiClient from '../api/client';

interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  intent?: string;
  previewPayload?: any;
  confirmed?: boolean | null;
}

export function ChatPage() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load existing conversation if any (omitted for brevity, assume new chat for now)
  // In a real app we'd fetch the latest conversation or list them.

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMsg = input.trim();
    setInput('');
    const tempId = Date.now().toString();
    
    setMessages(prev => [...prev, { id: tempId, role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      const res = await apiClient.post('/agent/chat', {
        message: userMsg,
        conversationId: conversationId || undefined
      });
      
      const { conversationId: newConvId, messageId, reply, intent, previewPayload, requiresConfirmation } = res.data;
      
      if (!conversationId) {
        setConversationId(newConvId);
      }

      setMessages(prev => [...prev, {
        id: messageId,
        role: 'assistant',
        content: reply,
        intent,
        previewPayload,
        confirmed: requiresConfirmation ? false : null
      }]);
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => [...prev, {
        id: 'error',
        role: 'assistant',
        content: 'Xin lỗi, có lỗi xảy ra. Vui lòng kiểm tra lại kết nối hoặc Cấu hình AI trong Cài đặt.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAction = async (msgId: string, confirmed: boolean) => {
    try {
      await apiClient.patch(`/agent/messages/${msgId}/confirm`, { confirmed });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, confirmed } : m));
      
      if (confirmed) {
        // Navigate to workflows page after 1.5s
        setTimeout(() => {
          navigate({ to: '/workflows' });
        }, 1500);
      }
    } catch (err) {
      console.error('Confirm failed', err);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h2" sx={{ mb: 2 }}>Trợ lý AI XBuild</Typography>
      
      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Box sx={{ flex: 1, overflowY: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {messages.length === 0 && (
            <Box sx={{ textAlign: 'center', color: 'text.secondary', mt: 10 }}>
              <SmartToy sx={{ fontSize: 60, opacity: 0.2, mb: 2 }} />
              <Typography variant="h6">Chào bạn! Tôi có thể giúp gì?</Typography>
              <Typography variant="body2">Thử nói: "Tạo cho tôi quy trình duyệt đơn xin nghỉ phép"</Typography>
            </Box>
          )}

          {messages.map((msg, idx) => (
            <Box key={idx} sx={{ display: 'flex', gap: 2, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <Avatar sx={{ bgcolor: msg.role === 'user' ? 'primary.main' : 'secondary.main' }}>
                {msg.role === 'user' ? <Person /> : <SmartToy />}
              </Avatar>
              <Box sx={{ maxWidth: '75%' }}>
                <Box sx={{ 
                  p: 2, 
                  borderRadius: 2, 
                  bgcolor: msg.role === 'user' ? 'primary.main' : 'background.paper',
                  color: msg.role === 'user' ? 'primary.contrastText' : 'text.primary',
                  boxShadow: 1
                }}>
                  <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                    {msg.content}
                  </Typography>
                </Box>
                
                {/* Preview Card for Workflow Generation */}
                {msg.previewPayload && msg.confirmed === false && (
                  <Card sx={{ mt: 2, border: '1px solid', borderColor: 'primary.main' }}>
                    <CardContent>
                      <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                        ✨ Đề xuất quy trình: {msg.previewPayload.name || 'AI Generated Workflow'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        {msg.previewPayload.description || 'Quy trình được AI tạo tự động.'}
                      </Typography>
                      
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button variant="contained" size="small" onClick={() => handleConfirmAction(msg.id, true)}>
                          Chấp nhận & Tạo
                        </Button>
                        <Button variant="outlined" size="small" color="error" onClick={() => handleConfirmAction(msg.id, false)}>
                          Từ chối
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {msg.previewPayload && msg.confirmed === true && (
                  <Chip label="Đã chấp nhận và tạo quy trình" color="success" size="small" sx={{ mt: 1 }} />
                )}
                {msg.previewPayload && msg.confirmed === false && msg.confirmed !== null && msg.confirmed !== undefined && (
                  <Chip label="Đã từ chối" color="error" size="small" sx={{ mt: 1 }} />
                )}
              </Box>
            </Box>
          ))}
          {loading && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'secondary.main' }}><SmartToy /></Avatar>
              <Box sx={{ p: 2, borderRadius: 2, bgcolor: 'background.paper', boxShadow: 1, display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={20} />
              </Box>
            </Box>
          )}
          <div ref={messagesEndRef} />
        </Box>
        
        <Divider />
        <Box sx={{ p: 2, bgcolor: 'background.paper' }}>
          <TextField
            fullWidth
            placeholder="Nhập tin nhắn..."
            variant="outlined"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            InputProps={{
              endAdornment: (
                <IconButton color="primary" onClick={handleSend} disabled={!input.trim() || loading}>
                  <Send />
                </IconButton>
              )
            }}
          />
        </Box>
      </Card>
    </Box>
  );
}
