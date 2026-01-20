import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pool } from './entities/pool.entity';
import { PriceService } from '../price/price.service';
import { PoolInfoDto } from './dto/pool.dto';

/**
 * PoolUsdService
 * 
 * 扩展 Pool 服务，添加 USD 价值计算功能
 */
@Injectable()
export class PoolUsdService {
  private readonly logger = new Logger(PoolUsdService.name);

  constructor(
    @InjectRepository(Pool)
    private readonly poolRepository: Repository<Pool>,
    @Inject(forwardRef(() => PriceService))
    private readonly priceService: PriceService,
  ) {}

  /**
   * 为池子信息添加 USD 价格
   */
  async enrichPoolWithUsdPrices(poolDto: PoolInfoDto): Promise<PoolInfoDto> {
    try {
      // 获取两个代币的价格
      const [token0Price, token1Price] = await Promise.all([
        this.priceService.getTokenPrice(poolDto.token0Address).catch(() => null),
        this.priceService.getTokenPrice(poolDto.token1Address).catch(() => null),
      ]);

      // 计算流动性 USD 价值（需要先标准化储备量）
      if (token0Price && token1Price) {
        const decimals0 = poolDto.token0Decimals || 18;
        const decimals1 = poolDto.token1Decimals || 18;

        // 将原始储备量转换为标准化数值
        const normalizedReserve0 = Number(BigInt(poolDto.reserve0 || '0')) / Math.pow(10, decimals0);
        const normalizedReserve1 = Number(BigInt(poolDto.reserve1 || '0')) / Math.pow(10, decimals1);

        const reserve0Usd = normalizedReserve0 * parseFloat(token0Price.priceUsd);
        const reserve1Usd = normalizedReserve1 * parseFloat(token1Price.priceUsd);
        const liquidityUsd = reserve0Usd + reserve1Usd;

        poolDto.liquidityUsd = liquidityUsd.toFixed(2);

        // 添加代币价格信息（扩展字段）
        (poolDto as any).token0PriceUsd = token0Price.priceUsd;
        (poolDto as any).token1PriceUsd = token1Price.priceUsd;
      }

      return poolDto;
    } catch (error) {
      this.logger.warn(`Failed to enrich pool ${poolDto.id} with USD prices:`, error.message);
      return poolDto;
    }
  }

  /**
   * 批量为池子列表添加 USD 价格
   */
  async enrichPoolsWithUsdPrices(pools: PoolInfoDto[]): Promise<PoolInfoDto[]> {
    // 并行处理所有池子
    const enrichedPools = await Promise.all(
      pools.map(pool => this.enrichPoolWithUsdPrices(pool)),
    );

    return enrichedPools;
  }

  /**
   * 计算总 TVL (USD)
   */
  async calculateTotalTvl(): Promise<string> {
    const pools = await this.poolRepository.find({ where: { isActive: true } });

    let totalTvl = 0;

    for (const pool of pools) {
      try {
        const [token0Price, token1Price] = await Promise.all([
          this.priceService.getTokenPrice(pool.token0Address).catch(() => null),
          this.priceService.getTokenPrice(pool.token1Address).catch(() => null),
        ]);

        if (token0Price && token1Price) {
          const decimals0 = pool.token0Decimals || 18;
          const decimals1 = pool.token1Decimals || 18;

          // 将原始储备量转换为标准化数值
          const normalizedReserve0 = Number(BigInt(pool.reserve0 || '0')) / Math.pow(10, decimals0);
          const normalizedReserve1 = Number(BigInt(pool.reserve1 || '0')) / Math.pow(10, decimals1);

          const reserve0Usd = normalizedReserve0 * parseFloat(token0Price.priceUsd);
          const reserve1Usd = normalizedReserve1 * parseFloat(token1Price.priceUsd);
          totalTvl += reserve0Usd + reserve1Usd;
        }
      } catch (error) {
        this.logger.warn(`Failed to calculate TVL for pool ${pool.id}`);
      }
    }

    return totalTvl.toFixed(2);
  }
}

