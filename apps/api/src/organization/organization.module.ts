import { Module } from '@nestjs/common';
import { BranchesController } from './branches.controller';
import { BranchesService } from './branches.service';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { DepartmentsController } from './departments.controller';
import { DepartmentsService } from './departments.service';

@Module({
  controllers: [CompaniesController, BranchesController, DepartmentsController],
  providers: [CompaniesService, BranchesService, DepartmentsService],
})
export class OrganizationModule {}
