import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceService } from './price.service';
import { PriceController } from './price.controller';
import { TokenPrice } from './entities/token-price.entity';
import { Pool } from '../pool/entities/pool.entity';

/**
 * PriceModule
 *
 * 价格预言机模块
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TokenPrice, Pool]),
  ],
  controllers: [PriceController],
  providers: [PriceService],
  exports: [PriceService],
})
export class PriceModule {}

