import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * WebSocket Gateway
 * 
 * 功能：
 * - 实时推送 Pool 更新
 * - 实时推送交易事件
 * - 实时推送流动性变化
 */
@WebSocketGateway({
  cors: {
    origin: '*', // 开发环境允许所有来源，生产环境应该配置具体域名
    credentials: true,
  },
  namespace: '/events',
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  afterInit(server: Server) {
    this.logger.log('🔌 WebSocket Gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`✅ Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`❌ Client disconnected: ${client.id}`);
  }

  /**
   * 广播 Pool 更新事件
   */
  broadcastPoolUpdate(poolData: any) {
    this.server.emit('pool:update', poolData);
    this.logger.debug(`📡 Broadcasted pool update: ${poolData.pairAddress}`);
  }

  /**
   * 广播新 Pool 创建事件
   */
  broadcastPoolCreated(poolData: any) {
    this.server.emit('pool:created', poolData);
    this.logger.log(`📡 Broadcasted pool created: ${poolData.pairAddress}`);
  }

  /**
   * 广播 Swap 事件
   */
  broadcastSwap(swapData: any) {
    this.server.emit('swap:executed', swapData);
    this.logger.debug(`📡 Broadcasted swap: ${swapData.pairAddress}`);
  }

  /**
   * 广播流动性变化事件
   */
  broadcastLiquidityChange(liquidityData: any) {
    this.server.emit('liquidity:changed', liquidityData);
    this.logger.debug(
      `📡 Broadcasted liquidity change: ${liquidityData.pairAddress}`,
    );
  }

  /**
   * 发送给特定客户端
   */
  sendToClient(clientId: string, event: string, data: any) {
    this.server.to(clientId).emit(event, data);
  }
}

