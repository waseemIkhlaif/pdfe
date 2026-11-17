import { Module } from '@nestjs/common';
import { MockHubControl } from './mock-hub-control';
import { ScenarioController } from './scenario.controller';
import { ScenarioHooks, ScenarioRunner } from './scenario-runner';
import { SCENARIOS_DIR, ScenarioRegistry, defaultScenariosDir } from './scenario-registry';
import { SimulateErrorController } from './simulate-error.controller';

@Module({
  controllers: [SimulateErrorController, ScenarioController],
  providers: [
    { provide: SCENARIOS_DIR, useFactory: () => defaultScenariosDir() },
    ScenarioRegistry,
    ScenarioRunner,
    ScenarioHooks,
    MockHubControl,
  ],
})
export class DemoModule {}
