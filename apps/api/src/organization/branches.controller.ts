import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/require-permissions.decorator';
import { PaginationQueryDto } from '../common/dto/pagination.dto';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { BranchesService } from './branches.service';
import { CreateBranchDto, UpdateBranchDto } from './dto/branch.dto';

@ApiTags('branches')
@ApiBearerAuth()
@UseGuards(PermissionsGuard)
@Controller('branches')
export class BranchesController {
  constructor(private readonly branches: BranchesService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
    @Query('companyId') companyId?: string,
  ) {
    return this.branches.list(user.tenantId, query, companyId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.branches.get(user.tenantId, id);
  }

  @Post()
  @RequirePermissions('admin.branch.manage')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateBranchDto) {
    return this.branches.create(user.tenantId, dto, user.userId);
  }

  @Patch(':id')
  @RequirePermissions('admin.branch.manage')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branches.update(user.tenantId, id, dto, user.userId);
  }

  @Delete(':id')
  @RequirePermissions('admin.branch.manage')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.branches.remove(user.tenantId, id, user.userId);
  }
}
