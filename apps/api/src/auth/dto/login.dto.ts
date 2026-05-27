import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  // Tenant slug identifies which company the user is logging into (emails are
  // only unique per tenant).
  @IsString()
  @IsNotEmpty()
  tenantSlug!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
