import { DynamicModule, Module } from '@nestjs/common';
import { TraceController } from './trace.controller';
import { TraceService } from './trace.service';
import { TraceStore } from './trace.store';

@Module({
  controllers: [TraceController],
  providers: [TraceService],
  exports: [TraceService],
})
export class TracesModule {
  static forRoot(store?: TraceStore): DynamicModule {
    return {
      module: TracesModule,
      providers: [store ? { provide: TraceStore, useValue: store } : TraceStore],
      exports: [TraceStore, TraceService],
    };
  }
}
