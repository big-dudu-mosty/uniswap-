import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Pool } from '../pool/entities/pool.entity';
import { SwapHistory } from '../history/entities/swap-history.entity';
import { LiquidityHistory } from '../history/entities/liquidity-history.entity';
import { PriceHistory } from './entities/price-history.entity';
import { OverviewDto, PoolAnalyticsDto, PoolHistoryDto, UserStatsDto, LeaderboardResponseDto, UserChartDataDto } from './dto/analytics.dto';
import { SlippageStatsDto } from '../quote/dto/quote.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Pool)
    private readonly poolRepository: Repository<Pool>,
    @InjectRepository(SwapHistory)
    private readonly swapHistoryRepository: Repository<SwapHistory>,
    @InjectRepository(LiquidityHistory)
    private readonly liquidityHistoryRepository: Repository<LiquidityHistory>,
    @InjectRepository(PriceHistory)
    private readonly priceHistoryRepository: Repository<PriceHistory>,
  ) {}

  /**
   * 获取全局概览数据
   */
  async getOverview(): Promise<OverviewDto> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 总池子数
    const totalPools = await this.poolRepository.count({ where: { isActive: true } });

    // 24h 交易笔数
    const transactions24h = await this.swapHistoryRepository.count({
      where: {
        createdAt: MoreThanOrEqual(since24h),
      },
    });

    // 获取所有活跃池子
    const pools = await this.poolRepository.find({ where: { isActive: true } });

    // 计算总 TVL
    let totalTVL = 0;
    for (const pool of pools) {
      const decimals0 = pool.token0Decimals || 18;
      const decimals1 = pool.token1Decimals || 18;
      const normalizedReserve0 = Number(BigInt(pool.reserve0)) / Math.pow(10, decimals0);
      const normalizedReserve1 = Number(BigInt(pool.reserve1)) / Math.pow(10, decimals1);
      totalTVL += normalizedReserve0 + normalizedReserve1;
    }

    // 计算 24h 总交易量
    let totalVolume24h = 0;
    for (const pool of pools) {
      const decimals0 = pool.token0Decimals || 18;
      const decimals1 = pool.token1Decimals || 18;

      // 获取该池子的 24h 交易记录
      const swaps = await this.swapHistoryRepository.find({
        where: {
          poolId: pool.id,
          createdAt: MoreThanOrEqual(since24h),
        },
      });

      for (const swap of swaps) {
        // 根据 tokenIn 确定使用哪个 decimals
        const isToken0In = swap.tokenIn.toLowerCase() === pool.token0Address.toLowerCase();
        const decimalsIn = isToken0In ? decimals0 : decimals1;
        const decimalsOut = isToken0In ? decimals1 : decimals0;

        const amountIn = Number(BigInt(swap.amountIn || '0')) / Math.pow(10, decimalsIn);
        const amountOut = Number(BigInt(swap.amountOut || '0')) / Math.pow(10, decimalsOut);
        totalVolume24h += (amountIn + amountOut) / 2;
      }
    }

    // 获取 Top 5 交易活跃的池子
    const topPools = await this.getTopPoolsByVolume(5);

    return {
      totalPools,
      totalTVL: totalTVL.toFixed(2),
      volume24h: totalVolume24h.toFixed(2),
      transactions24h,
      topPools,
    };
  }

  /**
   * 获取单个池子的详细分析数据
   */
  async getPoolAnalytics(poolId: number): Promise<PoolAnalyticsDto> {
    const pool = await this.poolRepository.findOne({ where: { id: poolId } });
    if (!pool) {
      throw new Error('Pool not found');
    }

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 统计交易笔数
    const [transactions24h, transactions7d, transactionsAll] = await Promise.all([
      this.swapHistoryRepository.count({
        where: { poolId, createdAt: MoreThanOrEqual(since24h) },
      }),
      this.swapHistoryRepository.count({
        where: { poolId, createdAt: MoreThanOrEqual(since7d) },
      }),
      this.swapHistoryRepository.count({ where: { poolId } }),
    ]);

    // 统计流动性操作
    const [liquidityAdds24h, liquidityRemoves24h] = await Promise.all([
      this.liquidityHistoryRepository.count({
        where: { poolId, actionType: 'add', createdAt: MoreThanOrEqual(since24h) },
      }),
      this.liquidityHistoryRepository.count({
        where: { poolId, actionType: 'remove', createdAt: MoreThanOrEqual(since24h) },
      }),
    ]);

    // 计算当前价格（考虑代币小数位数）
    const reserve0 = BigInt(pool.reserve0);
    const reserve1 = BigInt(pool.reserve1);

    // 将储备量转换为标准化数值（考虑不同代币的小数位数）
    const decimals0 = pool.token0Decimals || 18;
    const decimals1 = pool.token1Decimals || 18;
    const normalizedReserve0 = Number(reserve0) / Math.pow(10, decimals0);
    const normalizedReserve1 = Number(reserve1) / Math.pow(10, decimals1);

    const currentPrice = normalizedReserve0 > 0
      ? (normalizedReserve1 / normalizedReserve0).toFixed(6)
      : '0';

    // 计算24h交易量
    const volume24h = await this.calculateVolume24h(poolId, decimals0, decimals1);
    const volume7d = await this.calculateVolume7d(poolId, decimals0, decimals1);

    // 计算 TVL（简化：假设稳定币价值为 $1）
    const tvl = (normalizedReserve0 + normalizedReserve1).toFixed(2);

    return {
      poolId: pool.id,
      pairAddress: pool.pairAddress,
      token0Symbol: pool.token0Symbol,
      token1Symbol: pool.token1Symbol,
      reserve0: normalizedReserve0.toString(), // 使用标准化后的值
      reserve1: normalizedReserve1.toString(), // 使用标准化后的值
      tvl,
      volume24h,
      volume7d,
      volumeAll: '0', // TODO
      transactions24h,
      transactions7d,
      transactionsAll,
      liquidityAdds24h,
      liquidityRemoves24h,
      currentPrice,
      priceChange24h: '0', // TODO
      apy: undefined,
      fees24h: undefined,
    };
  }

  /**
   * 获取池子的历史数据（用于图表）
   */
  async getPoolHistory(poolId: number, hours: number = 24): Promise<PoolHistoryDto> {
    // TODO: 实现时间序列数据查询
    // 这需要定期快照池子状态或者从事件历史中聚合数据
    
    return {
      poolId,
      priceHistory: [],
      volumeHistory: [],
      tvlHistory: [],
    };
  }

  /**
   * 获取用户统计数据
   */
  async getUserStats(userAddress: string): Promise<UserStatsDto> {
    const normalizedAddress = userAddress.toLowerCase();

    const [totalSwaps, totalLiquidityAdds, totalLiquidityRemoves, recentSwap, recentLiquidity] =
      await Promise.all([
        this.swapHistoryRepository.count({
          where: { userAddress: normalizedAddress },
        }),
        this.liquidityHistoryRepository.count({
          where: { userAddress: normalizedAddress, actionType: 'add' },
        }),
        this.liquidityHistoryRepository.count({
          where: { userAddress: normalizedAddress, actionType: 'remove' },
        }),
        this.swapHistoryRepository.findOne({
          where: { userAddress: normalizedAddress },
          order: { createdAt: 'DESC' },
        }),
        this.liquidityHistoryRepository.findOne({
          where: { userAddress: normalizedAddress },
          order: { createdAt: 'DESC' },
        }),
      ]);

    // 获取用户活跃的池子
    const swaps = await this.swapHistoryRepository
      .createQueryBuilder('swap')
      .select('DISTINCT swap.poolId', 'poolId')
      .where('swap.userAddress = :address', { address: normalizedAddress })
      .getRawMany();

    const activePools = swaps.map((s) => s.poolId);

    // 最后活动时间
    const lastSwapTime = recentSwap?.createdAt?.getTime() || 0;
    const lastLiquidityTime = recentLiquidity?.createdAt?.getTime() || 0;
    const lastActivityAt = new Date(Math.max(lastSwapTime, lastLiquidityTime));

    return {
      userAddress,
      totalSwaps,
      totalSwapVolume: '0', // TODO: 需要计算总交易量
      totalLiquidityAdds,
      totalLiquidityRemoves,
      activePools,
      lastActivityAt,
    };
  }

  /**
   * 获取排行榜数据
   */
  async getLeaderboard(type: string = 'swap', period: string = 'all'): Promise<LeaderboardResponseDto> {
    // 根据 period 计算起始时间
    let sinceDate: Date | null = null;
    const now = Date.now();
    switch (period) {
      case '24h':
        sinceDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        sinceDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        sinceDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        sinceDate = null; // 'all'
    }

    let rawResults: Array<{ userAddress: string; count: string }>;

    if (type === 'liquidity') {
      const qb = this.liquidityHistoryRepository.createQueryBuilder('lh')
        .select('lh.userAddress', 'userAddress')
        .addSelect('COUNT(*)', 'count');
      if (sinceDate) {
        qb.where('lh.createdAt >= :since', { since: sinceDate });
      }
      rawResults = await qb
        .groupBy('lh.userAddress')
        .orderBy('count', 'DESC')
        .limit(20)
        .getRawMany();
    } else {
      const qb = this.swapHistoryRepository.createQueryBuilder('sh')
        .select('sh.userAddress', 'userAddress')
        .addSelect('COUNT(*)', 'count');
      if (sinceDate) {
        qb.where('sh.createdAt >= :since', { since: sinceDate });
      }
      rawResults = await qb
        .groupBy('sh.userAddress')
        .orderBy('count', 'DESC')
        .limit(20)
        .getRawMany();
    }

    return {
      period,
      type,
      data: rawResults.map((row, index) => ({
        rank: index + 1,
        userAddress: row.userAddress,
        count: Number(row.count),
      })),
    };
  }

  /**
   * 获取用户图表数据（交易频率趋势 + 交易对分布）
   */
  async getUserChartData(userAddress: string): Promise<UserChartDataDto> {
    const normalizedAddress = userAddress.toLowerCase();

    // 1. 每日交易频率
    const dailyRaw = await this.swapHistoryRepository
      .createQueryBuilder('sh')
      .select("DATE(sh.createdAt)", 'date')
      .addSelect('COUNT(*)', 'count')
      .where('sh.userAddress = :addr', { addr: normalizedAddress })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany();

    const dailyStats = dailyRaw.map((row) => ({
      date: row.date,
      swapCount: Number(row.count),
    }));

    // 2. 交易对分布
    const poolDistRaw = await this.swapHistoryRepository
      .createQueryBuilder('sh')
      .select('sh.poolId', 'poolId')
      .addSelect('COUNT(*)', 'count')
      .where('sh.userAddress = :addr', { addr: normalizedAddress })
      .groupBy('sh.poolId')
      .orderBy('count', 'DESC')
      .getRawMany();

    // 查询对应的 pool 信息获取 token symbol
    const poolDistribution: Array<{ poolId: number; token0Symbol: string; token1Symbol: string; count: number }> = [];
    for (const row of poolDistRaw) {
      const pool = await this.poolRepository.findOne({ where: { id: row.poolId } });
      poolDistribution.push({
        poolId: row.poolId,
        token0Symbol: pool?.token0Symbol || '?',
        token1Symbol: pool?.token1Symbol || '?',
        count: Number(row.count),
      });
    }

    return { dailyStats, poolDistribution };
  }

  /**
   * 获取交易量最高的池子
   */
  private async getTopPoolsByVolume(limit: number = 5): Promise<PoolAnalyticsDto[]> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 统计每个池子的交易笔数
    const poolStats = await this.swapHistoryRepository
      .createQueryBuilder('swap')
      .select('swap.poolId', 'poolId')
      .addSelect('COUNT(*)', 'count')
      .where('swap.createdAt >= :since', { since: since24h })
      .groupBy('swap.poolId')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    // 获取这些池子的详细信息
    const result: PoolAnalyticsDto[] = [];
    for (const stat of poolStats) {
      try {
        const analytics = await this.getPoolAnalytics(stat.poolId);
        result.push(analytics);
      } catch (error) {
        this.logger.error(`Failed to get analytics for pool ${stat.poolId}`, error);
      }
    }

    return result;
  }

  /**
   * 计算池子的 24h 交易量
   */
  private async calculateVolume24h(poolId: number, decimals0: number, decimals1: number): Promise<string> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 获取池子信息
    const pool = await this.poolRepository.findOne({ where: { id: poolId } });
    if (!pool) return '0';

    const swaps = await this.swapHistoryRepository.find({
      where: {
        poolId,
        createdAt: MoreThanOrEqual(since24h),
      },
    });

    let totalVolume = 0;
    for (const swap of swaps) {
      // 根据 tokenIn 地址确定使用哪个 decimals
      const isToken0In = swap.tokenIn.toLowerCase() === pool.token0Address.toLowerCase();
      const decimalsIn = isToken0In ? decimals0 : decimals1;
      const decimalsOut = isToken0In ? decimals1 : decimals0;

      const amountIn = Number(BigInt(swap.amountIn || '0')) / Math.pow(10, decimalsIn);
      const amountOut = Number(BigInt(swap.amountOut || '0')) / Math.pow(10, decimalsOut);
      totalVolume += (amountIn + amountOut) / 2;
    }

    return totalVolume.toFixed(2);
  }

  /**
   * 计算池子的 7d 交易量
   */
  private async calculateVolume7d(poolId: number, decimals0: number, decimals1: number): Promise<string> {
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // 获取池子信息
    const pool = await this.poolRepository.findOne({ where: { id: poolId } });
    if (!pool) return '0';

    const swaps = await this.swapHistoryRepository.find({
      where: {
        poolId,
        createdAt: MoreThanOrEqual(since7d),
      },
    });

    let totalVolume = 0;
    for (const swap of swaps) {
      // 根据 tokenIn 地址确定使用哪个 decimals
      const isToken0In = swap.tokenIn.toLowerCase() === pool.token0Address.toLowerCase();
      const decimalsIn = isToken0In ? decimals0 : decimals1;
      const decimalsOut = isToken0In ? decimals1 : decimals0;

      const amountIn = Number(BigInt(swap.amountIn || '0')) / Math.pow(10, decimalsIn);
      const amountOut = Number(BigInt(swap.amountOut || '0')) / Math.pow(10, decimalsOut);
      totalVolume += (amountIn + amountOut) / 2;
    }

    return totalVolume.toFixed(2);
  }

  /**
   * 获取滑点统计数据
   */
  async getSlippageStats(poolId: number): Promise<SlippageStatsDto> {
    this.logger.log(`Getting slippage stats for pool ${poolId}`);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
      // 获取历史价格数据（24h）
      const history24h = await this.priceHistoryRepository.find({
        where: {
          poolId,
          timestamp: MoreThanOrEqual(since24h),
        },
        order: { timestamp: 'ASC' },
      });

      // 获取历史价格数据（7d）
      const history7d = await this.priceHistoryRepository.find({
        where: {
          poolId,
          timestamp: MoreThanOrEqual(since7d),
        },
        order: { timestamp: 'ASC' },
      });

      if (history24h.length < 2) {
        this.logger.warn(`Insufficient price history data for pool ${poolId}`);
        return {
          avgSlippage24h: '0',
          avgSlippage7d: '0',
          p50Slippage: '0',
          p95Slippage: '0',
          p99Slippage: '0',
        };
      }

      // 计算价格变化（作为滑点的近似）
      const priceChanges24h = this.calculatePriceChanges(history24h);
      const priceChanges7d = this.calculatePriceChanges(history7d);

      // 计算统计值
      const avg24h = this.calculateAverage(priceChanges24h);
      const avg7d = this.calculateAverage(priceChanges7d);
      
      // 使用所有数据计算百分位数
      const allChanges = [...priceChanges24h, ...priceChanges7d].sort((a, b) => a - b);
      const p50 = this.calculatePercentile(allChanges, 50);
      const p95 = this.calculatePercentile(allChanges, 95);
      const p99 = this.calculatePercentile(allChanges, 99);

      return {
        avgSlippage24h: avg24h.toFixed(2),
        avgSlippage7d: avg7d.toFixed(2),
        p50Slippage: p50.toFixed(2),
        p95Slippage: p95.toFixed(2),
        p99Slippage: p99.toFixed(2),
      };
    } catch (error) {
      this.logger.error(`Failed to get slippage stats for pool ${poolId}`, error);
      throw error;
    }
  }

  /**
   * 记录价格历史
   */
  async recordPriceHistory(poolId: number, reserve0: string, reserve1: string, blockNumber: string): Promise<void> {
    try {
      // 计算价格
      const price = BigInt(reserve1) > 0n 
        ? (Number(BigInt(reserve1)) / Number(BigInt(reserve0))).toString()
        : '0';

      await this.priceHistoryRepository.save({
        poolId,
        price,
        reserve0,
        reserve1,
        blockNumber,
      });

      this.logger.debug(`Price history recorded for pool ${poolId}`);
    } catch (error) {
      this.logger.error(`Failed to record price history for pool ${poolId}`, error);
    }
  }

  /**
   * 计算价格变化百分比
   */
  private calculatePriceChanges(history: PriceHistory[]): number[] {
    const changes: number[] = [];

    for (let i = 1; i < history.length; i++) {
      const priceBefore = parseFloat(history[i - 1].price);
      const priceAfter = parseFloat(history[i].price);

      if (priceBefore > 0) {
        const change = Math.abs((priceAfter - priceBefore) / priceBefore) * 100;
        changes.push(change);
      }
    }

    return changes;
  }

  /**
   * 计算平均值
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    const sum = values.reduce((a, b) => a + b, 0);
    return sum / values.length;
  }

  /**
   * 计算百分位数
   */
  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
    return sortedValues[Math.max(0, Math.min(index, sortedValues.length - 1))];
  }
}

