import 'reflect-metadata';
import { Controller, Get, SetMetadata } from '@nestjs/common';
import { Trace } from '../../../../../src/modules/traces/normal/decorators/trace.decorator';
import { getControllerRouteAttributes } from '../../../../../src/modules/traces/shared/functions/framework-metadata.function';

describe('controller metadata', () => {
  @Controller('admin/dashboard')
  class Dashboard {
    @Get('transactions')
    @Trace({ type: 'controller' })
    async below() {
      return [];
    }

    @Trace({ type: 'controller' })
    @Get('stats')
    @SetMetadata('roles', ['admin'])
    async above() {
      return [];
    }
  }

  it('reads controller and route metadata with Trace below the route decorator', () => {
    expect(getControllerRouteAttributes(Dashboard, Dashboard.prototype.below)).toEqual({ 'http.request.method': 'GET', 'traceflow.controller.route': '/admin/dashboard/transactions' });
  });

  it('preserves routes and security metadata with Trace above other decorators', () => {
    expect(getControllerRouteAttributes(Dashboard, Dashboard.prototype.above)).toEqual({ 'http.request.method': 'GET', 'traceflow.controller.route': '/admin/dashboard/stats' });
    expect(Reflect.getMetadata('roles', Dashboard.prototype.above)).toEqual(['admin']);
  });

  it('does not invent HTTP routes for regular methods', () => {
    class Service {
      run() {
        return 1;
      }
    }
    expect(getControllerRouteAttributes(Service, Service.prototype.run)).toEqual({});
  });
});
