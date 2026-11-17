import { Module } from '@nestjs/common';
import { SimulateErrorController } from './simulate-error.controller';

@Module({ controllers: [SimulateErrorController] })
export class DemoModule {}
