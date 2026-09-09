import { DynamicModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TracesModule } from './modules/traces/trace.module';
import { TraceStore } from './modules/traces/trace.store';

@Module({})
export class AppModule {
  static forRoot(store?: TraceStore): DynamicModule {
    return {
      module: AppModule,
      imports: [TracesModule.forRoot(store)],
      controllers: [AppController],
      providers: [AppService],
    };
  }
}

/** Alias histórico para no romper integraciones que usaban el nombre del kit. */
export { AppModule as TraceFlowKitModule };
