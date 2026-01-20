import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

/**
 * WebSocket Hook
 * 
 * 连接到后端 WebSocket 服务，接收实时事件推送
 */

interface PoolUpdateEvent {
  id: number;
  pairAddress: string;
  token0Symbol: string;
  token1Symbol: string;
  reserve0: string;
  reserve1: string;
}

interface PoolCreatedEvent {
  id: number;
  pairAddress: string;
  token0Address: string;
  token1Address: string;
  token0Symbol: string;
  token1Symbol: string;
  reserve0: string;
  reserve1: string;
}

interface SwapEvent {
  pairAddress: string;
  sender: string;
  amount0In: string;
  amount1In: string;
  amount0Out: string;
  amount1Out: string;
  to: string;
}

interface LiquidityChangeEvent {
  type: 'mint' | 'burn';
  pairAddress: string;
  sender: string;
  amount0: string;
  amount1: string;
  to?: string;
}

interface WebSocketCallbacks {
  onPoolUpdate?: (data: PoolUpdateEvent) => void;
  onPoolCreated?: (data: PoolCreatedEvent) => void;
  onSwap?: (data: SwapEvent) => void;
  onLiquidityChange?: (data: LiquidityChangeEvent) => void;
}

/**
 * 使用 WebSocket 连接
 */
export const useWebSocket = (callbacks?: WebSocketCallbacks) => {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 使用 ref 存储 callbacks，避免 useEffect 依赖变化导致重连
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  useEffect(() => {
    // 连接到 WebSocket 服务器（默认连接到 trading-service 的 3002 端口）
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'http://localhost:3002';

    console.log('🔌 Connecting to WebSocket:', wsUrl);

    const socket = io(`${wsUrl}/events`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // 连接成功
    socket.on('connect', () => {
      console.log('✅ WebSocket connected:', socket.id);
      setIsConnected(true);
      setError(null);
    });

    // 连接断开
    socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    // 连接错误
    socket.on('connect_error', (err) => {
      console.error('🔴 WebSocket connection error:', err.message);
      setError(err.message);
    });

    // 监听 Pool 更新事件
    socket.on('pool:update', (data) => {
      callbacksRef.current?.onPoolUpdate?.(data);
    });

    // 监听 Pool 创建事件
    socket.on('pool:created', (data) => {
      callbacksRef.current?.onPoolCreated?.(data);
    });

    // 监听 Swap 事件
    socket.on('swap:executed', (data) => {
      callbacksRef.current?.onSwap?.(data);
    });

    // 监听流动性变化事件
    socket.on('liquidity:changed', (data) => {
      callbacksRef.current?.onLiquidityChange?.(data);
    });

    // 清理函数
    return () => {
      console.log('🔌 Closing WebSocket connection');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('pool:update');
      socket.off('pool:created');
      socket.off('swap:executed');
      socket.off('liquidity:changed');
      socket.close();
    };
  }, []); // 空依赖数组，只在组件挂载时连接一次

  return {
    socket: socketRef.current,
    isConnected,
    error,
  };
};

/**
 * 专门用于 Pool 列表的 WebSocket Hook
 */
export const usePoolWebSocket = (onUpdate: (data: PoolUpdateEvent) => void) => {
  return useWebSocket({
    onPoolUpdate: onUpdate,
    onPoolCreated: (data) => {
      console.log('🆕 New pool created:', data);
      // Pool 创建后也触发更新
      onUpdate(data as PoolUpdateEvent);
    },
  });
};

/**
 * 专门用于 Swap 页面的 WebSocket Hook
 */
export const useSwapWebSocket = (
  pairAddress: string | undefined,
  onSwap: (data: SwapEvent) => void,
) => {
  const handleSwap = (data: SwapEvent) => {
    // 只处理当前交易对的 Swap 事件
    if (pairAddress && data.pairAddress.toLowerCase() === pairAddress.toLowerCase()) {
      onSwap(data);
    }
  };

  return useWebSocket({
    onSwap: handleSwap,
    onPoolUpdate: (data) => {
      // Pool 更新时也刷新（因为储备量变化了）
      if (pairAddress && data.pairAddress.toLowerCase() === pairAddress.toLowerCase()) {
        console.log('🔄 Pool updated for current pair:', data);
      }
    },
  });
};

/**
 * 专门用于 Liquidity 页面的 WebSocket Hook
 */
export const useLiquidityWebSocket = (
  pairAddress: string | undefined,
  onLiquidityChange: (data: LiquidityChangeEvent) => void,
) => {
  const handleLiquidityChange = (data: LiquidityChangeEvent) => {
    // 只处理当前交易对的流动性变化
    if (pairAddress && data.pairAddress.toLowerCase() === pairAddress.toLowerCase()) {
      onLiquidityChange(data);
    }
  };

  return useWebSocket({
    onLiquidityChange: handleLiquidityChange,
    onPoolUpdate: (data) => {
      // Pool 更新时也刷新
      if (pairAddress && data.pairAddress.toLowerCase() === pairAddress.toLowerCase()) {
        console.log('🔄 Pool updated for current pair:', data);
      }
    },
  });
};

