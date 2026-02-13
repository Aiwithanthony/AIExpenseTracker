import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { ChallengesService, CreateChallengeDto, UpdateChallengeDto } from './challenges.service';

@Controller('challenges')
@UseGuards(JwtAuthGuard)
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Post()
  create(@CurrentUser() user: User, @Body() createDto: CreateChallengeDto) {
    return this.challengesService.create(user.id, createDto);
  }

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.challengesService.findAll(user.id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id') id: string) {
    return this.challengesService.findOne(user.id, id);
  }

  @Post(':id/update-progress')
  updateProgress(@CurrentUser() user: User, @Param('id') id: string) {
    return this.challengesService.updateProgress(user.id, id);
  }

  @Patch(':id')
  update(@CurrentUser() user: User, @Param('id') id: string, @Body() updateDto: UpdateChallengeDto) {
    return this.challengesService.update(user.id, id, updateDto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    return this.challengesService.remove(user.id, id);
  }
}

