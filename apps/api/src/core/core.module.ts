import { Global, Module } from '@nestjs/common';
import {
  IdGenerator,
  SystemClock,
  SystemRandom,
  type ClockService,
  type RandomService,
} from '@pdfe/platform-core';
import { DbConfigReader } from '../config/db-config-reader';
import { CLOCK, CONFIG_READER, RANDOM } from './tokens';

/** Provides the injected time, randomness and ID sources. Application code never reads the wall clock directly. */
@Global()
@Module({
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    { provide: RANDOM, useClass: SystemRandom },
    DbConfigReader,
    { provide: CONFIG_READER, useExisting: DbConfigReader },
    {
      provide: IdGenerator,
      useFactory: (clock: ClockService, random: RandomService) => new IdGenerator(clock, random),
      inject: [CLOCK, RANDOM],
    },
  ],
  exports: [CLOCK, RANDOM, CONFIG_READER, DbConfigReader, IdGenerator],
})
export class CoreModule {}
