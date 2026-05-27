import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { DepartmentsService } from './departments.service';
import { CreateDepartmentDto, UpdateDepartmentDto } from './dto/department.dto';

@ApiTags('departments')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('departments')
export class DepartmentsController {
  constructor(private readonly departments: DepartmentsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
    @Query('companyId') companyId?: string,
  ) {
    return this.departments.list(user.tenantId, query, companyId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.departments.get(user.tenantId, id);
  }

  @Post()
  @RequirePermissions('admin.department.manage')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDepartmentDto) {
    return this.departments.create(user.tenantId, dto, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('admin.department.manage')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDepartmentDto,
  ) {
    return this.departments.update(user.tenantId, id, dto, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('admin.department.manage')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.departments.remove(user.tenantId, id, user.userId);
  }
}
