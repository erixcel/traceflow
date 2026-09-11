import 'reflect-metadata';
import { Controller, Get, Query } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNumber, IsOptional, IsIn, IsInt, Min } from 'class-validator';
import { extractValidationContract, getValidationSchemaAttributes } from '../../../../../src/modules/traces/shared/functions/validation-schema.function';

describe('validation schema extraction', () => {
  class DashboardFilterDto {
    @ApiProperty({ example: '2024-01-01', description: 'Start date YYYY-MM-DD' })
    @IsDateString()
    startDate!: string;

    @ApiProperty({ example: '2024-01-31', description: 'End date YYYY-MM-DD' })
    @IsDateString()
    endDate!: string;

    @ApiPropertyOptional({ example: 1, description: 'Optional branch ID filter' })
    @IsOptional()
    @IsNumber()
    branchId?: number;

    @ApiPropertyOptional({ example: 1, default: 1 })
    @IsOptional()
    @IsInt()
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ example: 10, default: 10 })
    @IsOptional()
    @IsInt()
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional({ enum: ['all', 'bath', 'treatment', 'income'], default: 'all' })
    @IsOptional()
    @IsIn(['all', 'bath', 'treatment', 'income'])
    type?: 'all' | 'bath' | 'treatment' | 'income' = 'all';
  }

  @Controller('admin/dashboard')
  class DashboardController {
    @Get('transactions')
    getTransactions(@Query() filter: DashboardFilterDto) {
      return filter;
    }
  }

  it('extracts full schema contract from DashboardFilterDto', () => {
    const contract = extractValidationContract(DashboardFilterDto, 'query');
    expect(contract).not.toBeNull();
    expect(contract?.dtoName).toBe('DashboardFilterDto');
    expect(contract?.location).toBe('query');
    expect(contract?.parameters).toHaveLength(6);

    const startDate = contract?.parameters.find((p) => p.name === 'startDate');
    expect(startDate).toBeDefined();
    expect(startDate?.required).toBe(true);
    expect(startDate?.type).toBe('string');
    expect(startDate?.description).toBe('Start date YYYY-MM-DD');
    expect(startDate?.example).toBe('2024-01-01');
    expect(startDate?.rules.some((r) => r.name === 'isDateString')).toBe(true);

    const branchId = contract?.parameters.find((p) => p.name === 'branchId');
    expect(branchId).toBeDefined();
    expect(branchId?.required).toBe(false);
    expect(branchId?.type).toBe('number');
    expect(branchId?.description).toBe('Optional branch ID filter');
    expect(branchId?.rules.some((r) => r.name === 'isNumber')).toBe(true);

    const page = contract?.parameters.find((p) => p.name === 'page');
    expect(page).toBeDefined();
    expect(page?.required).toBe(false);
    expect(page?.type).toBe('number');
    expect(page?.default).toBe(1);
    expect(page?.rules.some((r) => r.name === 'min')).toBe(true);

    const type = contract?.parameters.find((p) => p.name === 'type');
    expect(type).toBeDefined();
    expect(type?.required).toBe(false);
    expect(type?.enum).toEqual(['all', 'bath', 'treatment', 'income']);
    expect(type?.default).toBe('all');
  });

  it('generates attributes from controller method and arguments', () => {
    const filterInstance = new DashboardFilterDto();
    const attrs = getValidationSchemaAttributes(DashboardController, DashboardController.prototype.getTransactions, [filterInstance]);

    expect(attrs['traceflow.controller.dto']).toBe('DashboardFilterDto');
    expect(typeof attrs['traceflow.validation.schema']).toBe('string');

    const parsed = JSON.parse(attrs['traceflow.validation.schema'] as string);
    expect(parsed.dtoName).toBe('DashboardFilterDto');
    expect(parsed.parameters).toHaveLength(6);
  });

  it('returns empty attributes when method has no DTO or validations', () => {
    class RegularService {
      doWork(count: number) {
        return count * 2;
      }
    }

    const attrs = getValidationSchemaAttributes(RegularService, RegularService.prototype.doWork, [5]);
    expect(attrs).toEqual({});
  });
});
