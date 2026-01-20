import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Farm } from './entities/farm.entity';
import { UserFarm } from './entities/user-farm.entity';
import { FarmingService } from './farming.service';

/**
 * FarmingSchedulerService
 * 
 * 定时任务：
 * 1. 每分钟更新所有池子数据
 * 2. 每 5 分钟更新活跃用户的待领取奖励
 * 3. 每小时记录历史数据（可选，暂未实现）
 */
@Injectable()
export class FarmingSchedulerService {
  private readonly logger = new Logger(FarmingSchedulerService.name);

  constructor(
    private readonly farmingService: FarmingService,
    @InjectRepository(Farm)
    private readonly farmRepository: Repository<Farm>,
    @InjectRepository(UserFarm)
    private readonly userFarmRepository: Repository<UserFarm>,
  ) {}

  /**
   * 每分钟更新所有池子数据
   * 
   * 更新内容：
   * - 总质押量
   * - APR
   * - TVL
   * - 每日奖励
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async updateAllPools() {
    this.logger.debug('Running scheduled task: updateAllPools');

    try {
      const farms = await this.farmRepository.find({ where: { active: true } });

      for (const farm of farms) {
        try {
          await this.farmingService.syncPoolFromChain(farm.poolId);
        } catch (error) {
          this.logger.error(`Failed to sync pool ${farm.poolId}:`, error.message);
        }
      }

      this.logger.log(`✅ Updated ${farms.length} farming pools`);
    } catch (error) {
      this.logger.error('Error in updateAllPools:', error);
    }
  }

  /**
   * 每 5 分钟更新活跃用户的待领取奖励
   * 
   * "活跃用户"定义：
   * - 有质押余额 (stakedAmount > 0)
   * - 最近 24 小时内有操作
   */
  @Cron('*/5 * * * *') // 每 5 分钟
  async updateUserRewards() {
    this.logger.debug('Running scheduled task: updateUserRewards');

    try {
      // 查询活跃用户（有质押且最近 24 小时内操作过）
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      const activeUserFarms = await this.userFarmRepository
        .createQueryBuilder('uf')
        .select('uf.userAddress', 'userAddress')
        .addSelect('uf.poolId', 'poolId')
        .where('CAST(uf.stakedAmount AS DECIMAL) > 0')
        .andWhere('uf.lastActionAt >= :date', { date: twentyFourHoursAgo })
        .groupBy('uf.userAddress')
        .addGroupBy('uf.poolId')
        .getRawMany();

      this.logger.log(`Updating rewards for ${activeUserFarms.length} active user-farm pairs`);

      let updated = 0;
      for (const { userAddress, poolId } of activeUserFarms) {
        try {
          await this.farmingService.updateUserStake(userAddress, poolId);
          updated++;
        } catch (error) {
          this.logger.error(
            `Failed to update user ${userAddress} in pool ${poolId}:`,
            error.message,
          );
        }
      }

      this.logger.log(`✅ Updated ${updated} user rewards`);
    } catch (error) {
      this.logger.error('Error in updateUserRewards:', error);
    }
  }

  /**
   * 每 30 分钟清理无质押的用户记录
   * 
   * 清理条件：
   * - stakedAmount = 0
   * - 最后操作时间超过 7 天
   */
  @Cron('*/30 * * * *') // 每 30 分钟
  async cleanupInactiveUsers() {
    this.logger.debug('Running scheduled task: cleanupInactiveUsers');

    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const result = await this.userFarmRepository
        .createQueryBuilder()
        .delete()
        .where('CAST(stakedAmount AS DECIMAL) = 0')
        .andWhere('lastActionAt < :date', { date: sevenDaysAgo })
        .execute();

      if (result.affected && result.affected > 0) {
        this.logger.log(`🗑️  Cleaned up ${result.affected} inactive user records`);
      }
    } catch (error) {
      this.logger.error('Error in cleanupInactiveUsers:', error);
    }
  }

  /**
   * 每小时记录历史数据（可选）
   * 
   * TODO: 实现历史数据记录
   * - 池子 TVL 历史
   * - 用户收益历史
   * - APR 历史
   */
  @Cron(CronExpression.EVERY_HOUR)
  async recordHistory() {
    this.logger.debug('Running scheduled task: recordHistory');
    
    // TODO: 实现历史数据记录
    // 可以创建新的实体来存储历史数据
    // 例如：FarmHistory、UserFarmHistory
  }
}

