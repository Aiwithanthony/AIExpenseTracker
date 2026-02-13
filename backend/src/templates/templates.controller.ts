import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { TemplatesService, CreateTemplateDto, UpdateTemplateDto } from './templates.service';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() createDto: CreateTemplateDto) {
    return this.templatesService.create(user.id, createDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.templatesService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.templatesService.findOne(user.id, id);
  }

  @Post(':id/create-expense')
  createExpense(@CurrentUser() user: User, @Param('id') id: string, @Query('date') date?: string) {
    return this.templatesService.createExpenseFromTemplate(
      user.id,
      id,
      date ? new Date(date) : undefined,
    );
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() updateDto: UpdateTemplateDto) {
    return this.templatesService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.templatesService.remove(user.id, id);
  }
}

