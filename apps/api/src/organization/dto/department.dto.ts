import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateDepartmentDto {
  @IsUUID('4')
  companyId!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(128)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code!: string;
}

export class UpdateDepartmentDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(128)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  code?: string;
}
