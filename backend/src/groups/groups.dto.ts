import {
  IsString,
  IsOptional,
  IsArray,
  IsNumber,
  IsDateString,
  IsEnum,
  IsEmail,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SplitType } from '../entities/group-expense.entity';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  baseCurrency?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  memberIds?: string[];
}

export class UpdateGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  baseCurrency?: string;
}

export class SplitEntryDto {
  @IsString()
  userId: string;

  @Type(() => Number)
  @IsNumber()
  amount: number;
}

export class AddGroupExpenseDto {
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsString()
  description: string;

  @IsDateString()
  date: string;

  @IsEnum(SplitType)
  splitType: SplitType;

  @IsOptional()
  @IsString()
  paidBy?: string;

  @IsArray()
  @IsString({ each: true })
  splitBetween: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitEntryDto)
  splits?: SplitEntryDto[];
}

export class CreateSettlementDto {
  @IsString()
  toUserId: string;

  @Type(() => Number)
  @IsNumber()
  amount: number;

  @IsString()
  currency: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class JoinGroupDto {
  @IsString()
  inviteCode: string;
}

export class AddMembersDto {
  @IsArray()
  @IsString({ each: true })
  memberIds: string[];
}

export class CreateInviteDto {
  @IsEmail()
  email: string;
}
