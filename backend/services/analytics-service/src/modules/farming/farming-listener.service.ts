import { Injectable, Logger, OnModuleInit, OnModuleDestroy, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseAbi, Log, decodeEventLog, formatUnits } from 'viem';
import { BlockchainProvider } from '../../providers/blockchain/blockchain.provider';
import { EventsGateway } from '../blockchain-listener/websocket.gateway';
import { FarmingService } from './farming.service';

/**
 * 挖矿事件监听器
 * 
 * 监听 MasterChef 合约事件：
 * - Deposit: 用户质押
 * - Withdraw: 用户提取
 * - RewardPaid: 奖励发放
 * - PoolAdded: 新增池子
 * - PoolUpdated: 池子权重更新
 */
@Injectable()
export class FarmingListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FarmingListenerService.name);
  
  private pollingInterval: NodeJS.Timeout;
  private lastProcessedBlock: bigint = 0n;
  private isRunning = false;

  // MasterChef ABI - 事件定义
  private readonly masterChefAbi = parseAbi([
    'event Deposit(address indexed user, uint256 indexed pid, uint256 amount)',
    'event Withdraw(address indexed user, uint256 indexed pid, uint256 amount)',
    'event EmergencyWithdraw(address indexed user, uint256 indexed pid, uint256 amount)',
    'event RewardPaid(address indexed user, uint256 amount)',
    'event PoolAdded(uint256 indexed pid, address indexed lpToken, uint256 allocPoint)',
    'event PoolUpdated(uint256 indexed pid, uint256 allocPoint)',
  ]);

  private masterChefAddress: string;

  constructor(
    private readonly blockchainProvider: BlockchainProvider,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => EventsGateway))
    private readonly eventsGateway: EventsGateway,
    private readonly farmingService: FarmingService,
  ) {
    this.masterChefAddress = this.configService.get<string>('MASTER_CHEF_ADDRESS', '');
  }

  async onModuleInit() {
    // 只有配置了 MasterChef 地址才启动监听
    if (!this.masterChefAddress) {
      this.logger.warn('⚠️  MasterChef address not configured, farming listener disabled');
      return;
    }

    this.logger.log('🌾 Initializing Farming Event Listener...');
    
    // 延迟启动
    setTimeout(() => {
      this.startListening().catch((error) => {
        this.logger.error('Failed to start farming listener', error);
      });
    }, 5000); // 等待其他模块初始化
  }

  async onModuleDestroy() {
    await this.stopListening();
  }

  /**
   * 开始监听挖矿事件
   */
  async startListening(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn('Farming listener is already running');
      return;
    }

    try {
      this.lastProcessedBlock = await this.blockchainProvider.getBlockNumber();
      this.logger.log(`🌾 Starting farming listener from block: ${this.lastProcessedBlock}`);

      await this.startPolling();
      this.isRunning = true;
      
      this.logger.log('✅ Farming listener started successfully');
    } catch (error) {
      this.logger.error('Failed to start farming listener:', error);
      throw error;
    }
  }

  /**
   * 停止监听
   */
  async stopListening(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.logger.log('Farming listener stopped');
    }
    this.isRunning = false;
  }

  /**
   * 轮询模式（适用于 Hardhat 本地节点）
   */
  private async startPolling(): Promise<void> {
    const publicClient = this.blockchainProvider.getPublicClient();

    this.logger.log('🔄 Starting farming events polling (every 30 seconds)...');

    this.pollingInterval = setInterval(async () => {
      try {
        const currentBlock = await this.blockchainProvider.getBlockNumber();
        
        if (currentBlock <= this.lastProcessedBlock) {
          return; // 没有新区块
        }

        this.logger.debug(
          `[Farming] Processing blocks ${this.lastProcessedBlock + 1n} to ${currentBlock}`,
        );

        // 获取 MasterChef 的所有事件
        const logs = await publicClient.getLogs({
          address: this.masterChefAddress as `0x${string}`,
          fromBlock: this.lastProcessedBlock + 1n,
          toBlock: currentBlock,
        });

        if (logs.length > 0) {
          this.logger.log(`Found ${logs.length} farming events`);
          
          for (const log of logs) {
            await this.handleFarmingEvent(log);
          }
        }

        this.lastProcessedBlock = currentBlock;
      } catch (error) {
        this.logger.error('Error in farming polling cycle:', error);
      }
    }, 30000); // 每 30 秒检查一次
  }

  /**
   * 处理挖矿事件
   */
  private async handleFarmingEvent(log: Log): Promise<void> {
    try {
      // 解码事件
      const decoded = decodeEventLog({
        abi: this.masterChefAbi,
        data: log.data,
        topics: log.topics,
      });

      const eventName = decoded.eventName;

      // 根据事件类型分发
      switch (eventName) {
        case 'Deposit':
          await this.handleDepositEvent(decoded.args as any);
          break;
        case 'Withdraw':
          await this.handleWithdrawEvent(decoded.args as any);
          break;
        case 'EmergencyWithdraw':
          await this.handleEmergencyWithdrawEvent(decoded.args as any);
          break;
        case 'RewardPaid':
          await this.handleRewardPaidEvent(decoded.args as any);
          break;
        case 'PoolAdded':
          await this.handlePoolAddedEvent(decoded.args as any);
          break;
        case 'PoolUpdated':
          await this.handlePoolUpdatedEvent(decoded.args as any);
          break;
        default:
          this.logger.debug(`Unknown farming event: ${eventName}`);
      }
    } catch (error) {
      this.logger.error('Error handling farming event:', error);
    }
  }

  /**
   * 处理 Deposit 事件（用户质押）
   */
  private async handleDepositEvent(event: {
    user: string;
    pid: bigint;
    amount: bigint;
  }): Promise<void> {
    this.logger.log(
      `💰 Deposit: user=${event.user}, pool=${event.pid}, amount=${formatUnits(event.amount, 18)}`,
    );

    try {
      // 更新用户质押信息
      await this.farmingService.updateUserStake(event.user, Number(event.pid));

      // 更新池子数据
      await this.farmingService.syncPoolFromChain(Number(event.pid));

      // 广播 WebSocket 事件
      this.eventsGateway.broadcastFarmingAction({
        type: 'deposit',
        user: event.user,
        poolId: Number(event.pid),
        amount: formatUnits(event.amount, 18),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error handling Deposit event:', error);
    }
  }

  /**
   * 处理 Withdraw 事件（用户提取）
   */
  private async handleWithdrawEvent(event: {
    user: string;
    pid: bigint;
    amount: bigint;
  }): Promise<void> {
    this.logger.log(
      `💸 Withdraw: user=${event.user}, pool=${event.pid}, amount=${formatUnits(event.amount, 18)}`,
    );

    try {
      // 更新用户质押信息
      await this.farmingService.updateUserStake(event.user, Number(event.pid));

      // 更新池子数据
      await this.farmingService.syncPoolFromChain(Number(event.pid));

      // 广播 WebSocket 事件
      this.eventsGateway.broadcastFarmingAction({
        type: 'withdraw',
        user: event.user,
        poolId: Number(event.pid),
        amount: formatUnits(event.amount, 18),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error handling Withdraw event:', error);
    }
  }

  /**
   * 处理 EmergencyWithdraw 事件（紧急提取）
   */
  private async handleEmergencyWithdrawEvent(event: {
    user: string;
    pid: bigint;
    amount: bigint;
  }): Promise<void> {
    this.logger.warn(
      `⚠️  EmergencyWithdraw: user=${event.user}, pool=${event.pid}, amount=${formatUnits(event.amount, 18)}`,
    );

    try {
      // 更新用户质押信息（应该会被删除，因为余额为 0）
      await this.farmingService.updateUserStake(event.user, Number(event.pid));

      // 更新池子数据
      await this.farmingService.syncPoolFromChain(Number(event.pid));

      // 广播 WebSocket 事件
      this.eventsGateway.broadcastFarmingAction({
        type: 'emergency_withdraw',
        user: event.user,
        poolId: Number(event.pid),
        amount: formatUnits(event.amount, 18),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error handling EmergencyWithdraw event:', error);
    }
  }

  /**
   * 处理 RewardPaid 事件（奖励发放）
   */
  private async handleRewardPaidEvent(event: {
    user: string;
    amount: bigint;
  }): Promise<void> {
    this.logger.log(
      `🎁 RewardPaid: user=${event.user}, amount=${formatUnits(event.amount, 18)} DEX`,
    );

    // 注意：RewardPaid 事件没有 poolId，需要从上下文推断
    // 暂时只记录日志，不更新数据库
    // 实际的奖励记录在 Withdraw 事件中更新

    // 广播 WebSocket 事件
    this.eventsGateway.broadcastFarmingAction({
      type: 'reward_paid',
      user: event.user,
      amount: formatUnits(event.amount, 18),
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * 处理 PoolAdded 事件（新增池子）
   */
  private async handlePoolAddedEvent(event: {
    pid: bigint;
    lpToken: string;
    allocPoint: bigint;
  }): Promise<void> {
    this.logger.log(
      `🆕 PoolAdded: pid=${event.pid}, lpToken=${event.lpToken}, allocPoint=${event.allocPoint}`,
    );

    try {
      // 同步新池子
      await this.farmingService.syncPoolFromChain(Number(event.pid));

      // 广播 WebSocket 事件
      this.eventsGateway.broadcastFarmingAction({
        type: 'pool_added',
        poolId: Number(event.pid),
        lpToken: event.lpToken,
        allocPoint: event.allocPoint.toString(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error handling PoolAdded event:', error);
    }
  }

  /**
   * 处理 PoolUpdated 事件（池子权重更新）
   */
  private async handlePoolUpdatedEvent(event: {
    pid: bigint;
    allocPoint: bigint;
  }): Promise<void> {
    this.logger.log(
      `🔄 PoolUpdated: pid=${event.pid}, newAllocPoint=${event.allocPoint}`,
    );

    try {
      // 重新同步池子
      await this.farmingService.syncPoolFromChain(Number(event.pid));

      // 广播 WebSocket 事件
      this.eventsGateway.broadcastFarmingAction({
        type: 'pool_updated',
        poolId: Number(event.pid),
        allocPoint: event.allocPoint.toString(),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error('Error handling PoolUpdated event:', error);
    }
  }
}

