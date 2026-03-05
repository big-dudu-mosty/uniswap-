import { Injectable, Logger, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, MoreThanOrEqual } from 'typeorm';
import { Pool } from './entities/pool.entity';
import { SwapHistory } from '../history/entities/swap-history.entity';
import { BlockchainProvider } from '../../providers/blockchain/blockchain.provider';
import { CacheProvider } from '../../providers/cache/cache.provider';
import { ConfigService } from '@nestjs/config';
import { PriceService } from '../price/price.service';
import {
  CreatePoolDto,
  PoolListQueryDto,
  PoolInfoDto,
  PoolListResponseDto,
  UpdatePoolDto,
  PoolStatsDto,
} from './dto/pool.dto';
import { Address } from 'viem';

/**
 * Pool Service - 流动性池管理服务
 */
@Injectable()
export class PoolService {
  private readonly logger = new Logger(PoolService.name);
  private readonly cacheTtl: number;

  constructor(
    @InjectRepository(Pool)
    private readonly poolRepository: Repository<Pool>,
    @InjectRepository(SwapHistory)
    private readonly swapHistoryRepository: Repository<SwapHistory>,
    private readonly blockchainProvider: BlockchainProvider,
    private readonly cacheProvider: CacheProvider,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => PriceService))
    private readonly priceService: PriceService,
  ) {
    this.cacheTtl = this.configService.get<number>('cache.ttl', 300);
  }

  /**
   * 获取或创建池子
   */
  async getOrCreatePool(createPoolDto: CreatePoolDto): Promise<PoolInfoDto> {
    const { token0Address, token1Address } = createPoolDto;

    // 从链上获取交易对地址
    const pairAddress = await this.blockchainProvider.getPair(
      token0Address as Address,
      token1Address as Address,
    );

    if (!pairAddress || pairAddress === '0x0000000000000000000000000000000000000000') {
      throw new NotFoundException('Trading pair does not exist');
    }

    // 检查数据库中是否已存在
    let pool = await this.poolRepository.findOne({
      where: { pairAddress: pairAddress.toLowerCase() },
    });

    if (pool) {
      // 更新池子数据
      return await this.refreshPoolData(pool.id);
    }

    // 创建新池子
    pool = await this.createPoolFromChain(pairAddress as Address);
    return this.toDto(pool);
  }

  /**
   * 从链上创建池子记录
   */
  private async createPoolFromChain(pairAddress: Address): Promise<Pool> {
    this.logger.log(`Creating pool from chain: ${pairAddress}`);

    // 获取交易对的代币地址
    const { token0, token1 } = await this.blockchainProvider.getPairTokens(pairAddress);

    // 获取代币信息
    const [token0Info, token1Info] = await Promise.all([
      this.blockchainProvider.getTokenInfo(token0),
      this.blockchainProvider.getTokenInfo(token1),
    ]);

    // 获取储备量
    const reserves = await this.blockchainProvider.getReserves(pairAddress);

    // 获取总供应量
    const totalSupply = await this.blockchainProvider.getLpTotalSupply(pairAddress);

    // 计算价格
    const price = this.calculatePrice(
      reserves.reserve0,
      reserves.reserve1,
      token0Info.decimals,
      token1Info.decimals,
    );

    // 获取当前区块号
    const blockNumber = await this.blockchainProvider.getBlockNumber();

    // 创建池子实体
    const pool = this.poolRepository.create();
    pool.pairAddress = pairAddress.toLowerCase();
    pool.token0Address = token0.toLowerCase();
    pool.token1Address = token1.toLowerCase();
    pool.token0Symbol = token0Info.symbol;
    pool.token0Name = token0Info.name;
    pool.token0Decimals = token0Info.decimals;
    pool.token1Symbol = token1Info.symbol;
    pool.token1Name = token1Info.name;
    pool.token1Decimals = token1Info.decimals;
    pool.reserve0 = reserves.reserve0.toString();
    pool.reserve1 = reserves.reserve1.toString();
    pool.totalSupply = totalSupply.toString();
    pool.price = price;
    pool.lastUpdateBlock = blockNumber.toString();
    pool.lastUpdateTimestamp = reserves.blockTimestampLast;
    pool.isActive = true;
    pool.isVerified = false;

    await this.poolRepository.save(pool);

    // 自动注册代币到 token_prices 表（用于价格追踪）
    await Promise.all([
      this.priceService.addTokenForPriceTracking(token0, token0Info.symbol).catch(err => {
        this.logger.warn(`Failed to register token ${token0Info.symbol} for price tracking: ${err.message}`);
      }),
      this.priceService.addTokenForPriceTracking(token1, token1Info.symbol).catch(err => {
        this.logger.warn(`Failed to register token ${token1Info.symbol} for price tracking: ${err.message}`);
      }),
    ]);

    this.logger.log(`Pool created: ${pairAddress}`);
    return pool;
  }

  /**
   * 刷新池子数据
   */
  async refreshPoolData(poolId: number): Promise<PoolInfoDto> {
    const pool = await this.poolRepository.findOne({ where: { id: poolId } });

    if (!pool) {
      throw new NotFoundException(`Pool with ID ${poolId} not found`);
    }

    try {
      // 从链上获取最新数据
      const reserves = await this.blockchainProvider.getReserves(
        pool.pairAddress as Address,
      );
      const totalSupply = await this.blockchainProvider.getLpTotalSupply(
        pool.pairAddress as Address,
      );
      const blockNumber = await this.blockchainProvider.getBlockNumber();

      // 计算价格
      const price = this.calculatePrice(
        reserves.reserve0,
        reserves.reserve1,
        pool.token0Decimals,
        pool.token1Decimals,
      );

      // 更新池子数据
      pool.reserve0 = reserves.reserve0.toString();
      pool.reserve1 = reserves.reserve1.toString();
      pool.totalSupply = totalSupply.toString();
      pool.price = price;
      pool.lastUpdateBlock = blockNumber.toString();
      pool.lastUpdateTimestamp = reserves.blockTimestampLast;

      await this.poolRepository.save(pool);

      // 清除缓存
      await this.cacheProvider.del(`pool:${pool.pairAddress}`);

      this.logger.log(`Pool data refreshed: ${pool.pairAddress}`);

      return this.toDto(pool);
    } catch (error) {
      this.logger.error(`Failed to refresh pool data: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据代币地址查找池子
   */
  async findPoolByTokens(
    token0Address: string,
    token1Address: string,
  ): Promise<PoolInfoDto | null> {
    // 尝试两种顺序
    let pool = await this.poolRepository.findOne({
      where: {
        token0Address: token0Address.toLowerCase(),
        token1Address: token1Address.toLowerCase(),
      },
    });

    if (!pool) {
      pool = await this.poolRepository.findOne({
        where: {
          token0Address: token1Address.toLowerCase(),
          token1Address: token0Address.toLowerCase(),
        },
      });
    }

    return pool ? this.toDto(pool) : null;
  }

  /**
   * 根据交易对地址查找池子
   */
  async findPoolByPairAddress(pairAddress: string): Promise<PoolInfoDto | null> {
    const cacheKey = `pool:${pairAddress.toLowerCase()}`;

    // 尝试从缓存获取
    const cached = await this.cacheProvider.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const pool = await this.poolRepository.findOne({
      where: { pairAddress: pairAddress.toLowerCase() },
    });

    if (!pool) {
      return null;
    }

    const dto = this.toDto(pool);

    // 缓存结果
    await this.cacheProvider.set(cacheKey, JSON.stringify(dto), this.cacheTtl);

    return dto;
  }

  /**
   * 获取池子列表
   */
  async getPoolList(query: PoolListQueryDto): Promise<PoolListResponseDto> {
    const { page = 1, limit = 20, sortBy = 'liquidity', sortOrder = 'desc', activeOnly, verifiedOnly, search } = query;

    const queryBuilder = this.poolRepository.createQueryBuilder('pool');

    // 筛选条件
    if (activeOnly) {
      queryBuilder.andWhere('pool.isActive = :isActive', { isActive: true });
    }

    if (verifiedOnly) {
      queryBuilder.andWhere('pool.isVerified = :isVerified', { isVerified: true });
    }

    if (search) {
      queryBuilder.andWhere(
        '(pool.token0Symbol ILIKE :search OR pool.token1Symbol ILIKE :search OR pool.pairAddress ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // 排序
    const orderField = this.getSortField(sortBy);
    queryBuilder.orderBy(orderField, sortOrder.toUpperCase() as 'ASC' | 'DESC');

    // 分页
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [pools, total] = await queryBuilder.getManyAndCount();

    // 为每个池子计算 24h 交易量
    const poolDtos = await Promise.all(
      pools.map(async (pool) => {
        const dto = this.toDto(pool);
        // 计算 24h 交易量
        dto.volume24h = await this.calculatePoolVolume24h(
          pool.id,
          pool.token0Decimals || 18,
          pool.token1Decimals || 18,
        );
        return dto;
      }),
    );

    return {
      pools: poolDtos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * 获取池子详情
   */
  async getPoolById(poolId: number): Promise<PoolInfoDto> {
    const pool = await this.poolRepository.findOne({ where: { id: poolId } });

    if (!pool) {
      throw new NotFoundException(`Pool with ID ${poolId} not found`);
    }

    return this.toDto(pool);
  }

  /**
   * 更新池子信息
   */
  async updatePool(poolId: number, updateDto: UpdatePoolDto): Promise<PoolInfoDto> {
    const pool = await this.poolRepository.findOne({ where: { id: poolId } });

    if (!pool) {
      throw new NotFoundException(`Pool with ID ${poolId} not found`);
    }

    // 更新字段
    if (updateDto.reserve0 !== undefined) pool.reserve0 = updateDto.reserve0;
    if (updateDto.reserve1 !== undefined) pool.reserve1 = updateDto.reserve1;
    if (updateDto.totalSupply !== undefined) pool.totalSupply = updateDto.totalSupply;
    if (updateDto.price !== undefined) pool.price = updateDto.price;
    if (updateDto.liquidityUsd !== undefined) pool.liquidityUsd = updateDto.liquidityUsd;
    if (updateDto.isActive !== undefined) pool.isActive = updateDto.isActive;
    if (updateDto.isVerified !== undefined) pool.isVerified = updateDto.isVerified;

    await this.poolRepository.save(pool);

    // 清除缓存
    await this.cacheProvider.del(`pool:${pool.pairAddress}`);

    return this.toDto(pool);
  }

  /**
   * 获取池子统计信息
   */
  async getPoolStats(): Promise<PoolStatsDto> {
    const totalPools = await this.poolRepository.count();
    const activePools = await this.poolRepository.count({ where: { isActive: true } });

    // TODO: 实现 TVL 和交易量统计
    return {
      totalPools,
      activePools,
      totalValueLocked: '0',
      volume24h: '0',
      averageApy: '0',
    };
  }

  /**
   * 计算价格（token1 / token0）
   */
  private calculatePrice(
    reserve0: bigint,
    reserve1: bigint,
    decimals0: number,
    decimals1: number,
  ): string {
    if (reserve0 === 0n) {
      return '0';
    }

    // 调整精度后计算价格
    const adjustedReserve0 = Number(reserve0) / Math.pow(10, decimals0);
    const adjustedReserve1 = Number(reserve1) / Math.pow(10, decimals1);

    const price = adjustedReserve1 / adjustedReserve0;

    return price.toFixed(18);
  }

  /**
   * 获取排序字段
   */
  private getSortField(sortBy: string): string {
    const fieldMap: Record<string, string> = {
      liquidity: 'pool.liquidityUsd',
      volume: 'pool.volume24h',
      created: 'pool.createdAt',
    };

    return fieldMap[sortBy] || 'pool.createdAt';
  }

  /**
   * 转换为 DTO
   */
  private toDto(pool: Pool): PoolInfoDto {
    // 计算标准化的价格
    const reserve0 = BigInt(pool.reserve0 || '0');
    const reserve1 = BigInt(pool.reserve1 || '0');
    const decimals0 = pool.token0Decimals || 18;
    const decimals1 = pool.token1Decimals || 18;

    // 标准化储备量
    const normalizedReserve0 = Number(reserve0) / Math.pow(10, decimals0);
    const normalizedReserve1 = Number(reserve1) / Math.pow(10, decimals1);

    // token0Price = reserve1 / reserve0 (以 token1 计价的 token0 价格)
    // token1Price = reserve0 / reserve1 (以 token0 计价的 token1 价格)
    let token0Price = '0';
    let token1Price = '0';

    if (reserve0 > 0n && reserve1 > 0n) {
      token0Price = (normalizedReserve1 / normalizedReserve0).toFixed(6);
      token1Price = (normalizedReserve0 / normalizedReserve1).toFixed(6);
    }

    // 计算 TVL (假设稳定币价值为 $1)
    const liquidityUsd = (normalizedReserve0 + normalizedReserve1).toFixed(2);

    return {
      id: pool.id,
      pairAddress: pool.pairAddress,
      token0Address: pool.token0Address,
      token1Address: pool.token1Address,
      token0Symbol: pool.token0Symbol,
      token0Name: pool.token0Name,
      token0Decimals: pool.token0Decimals,
      token1Symbol: pool.token1Symbol,
      token1Name: pool.token1Name,
      token1Decimals: pool.token1Decimals,
      reserve0: pool.reserve0,
      reserve1: pool.reserve1,
      totalSupply: pool.totalSupply,
      price: pool.price,
      token0Price,
      token1Price,
      liquidityUsd,
      volume24h: pool.volume24h || '0',
      feeRate: pool.feeRate,
      isActive: pool.isActive,
      isVerified: pool.isVerified,
      lastUpdateBlock: pool.lastUpdateBlock,
      createdAt: pool.createdAt,
    };
  }

  /**
   * 计算池子的 24h 交易量
   */
  async calculatePoolVolume24h(poolId: number, decimals0: number, decimals1: number): Promise<string> {
    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // 获取池子信息以确定 token 地址
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

      // 使用输入和输出的平均值作为交易量
      totalVolume += (amountIn + amountOut) / 2;
    }

    return totalVolume.toFixed(2);
  }
}

