import api from './client';
import { mockApi } from '../mock/mockApi';

const useMock = (import.meta as any).env?.VITE_USE_MOCK !== 'false';

export const dataClient = {
  get: (path: string, config?: any) => (useMock ? mockApi.get(path, config) : api.get(path, config)),
  post: (path: string, body?: any, config?: any) => (useMock ? mockApi.post(path, body) : api.post(path, body, config)),
  resetMock: () => mockApi.reset(),
  isMock: useMock,
};
