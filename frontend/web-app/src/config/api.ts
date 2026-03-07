/**
 * API 服务配置
 */

export const API_CONFIG = {
  // Trading Service API (Analytics Service)
  TRADING_SERVICE: import.meta.env.VITE_TRADING_SERVICE_URL || '/api/v1',

  // WebSocket URL
  WS_URL: import.meta.env.VITE_WS_URL || 'http://localhost:3002',

  // 请求超时时间（毫秒）
  TIMEOUT: 10000,
} as const


