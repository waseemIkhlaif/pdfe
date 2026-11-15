import { Module } from '@nestjs/common';
import { PingController } from './mocks/ping.controller';

@Module({ controllers: [PingController] })
export class AppModule {}
