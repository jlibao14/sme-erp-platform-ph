import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  AuthenticatedUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { CreateRoleDto } from './dto/create-role.dto';
import { SetRolePermissionsDto } from './dto/set-role-permissions.dto';
import { RbacService } from './rbac.service';

@ApiTags('rbac')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('admin')
export class RbacController {
  constructor(private readonly rbac: RbacService) {}

  @Get('permissions')
  @RequirePermissions('admin.role.manage')
  async listPermissions() {
    return { success: true, data: await this.rbac.listPermissions() };
  }

  @Get('roles')
  @RequirePermissions('admin.role.manage')
  async listRoles(@CurrentUser() user: AuthenticatedUser) {
    return { success: true, data: await this.rbac.listRoles(user.tenantId) };
  }

  @Post('roles')
  @RequirePermissions('admin.role.manage')
  async createRole(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRoleDto) {
    const role = await this.rbac.createRole(user.tenantId, dto.name, dto.description, user.userId);
    return { success: true, data: role };
  }

  @Put('roles/:id/permissions')
  @RequirePermissions('admin.role.manage')
  async setRolePermissions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetRolePermissionsDto,
  ) {
    const role = await this.rbac.setRolePermissions(user.tenantId, id, dto.permissionKeys);
    return { success: true, data: role };
  }

  @Put('users/:userId/roles')
  @RequirePermissions('admin.user.manage')
  async assignUserRoles(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: AssignUserRolesDto,
  ) {
    const assignments = await this.rbac.assignUserRoles(user.tenantId, userId, dto.roleIds);
    return { success: true, data: assignments };
  }
}
