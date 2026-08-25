import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MealLogsService } from './meal-logs.service';
import { CreateMealLogDto } from './dto/create-meal-log.dto';
import { UpdateMealLogDto } from './dto/update-meal-log.dto';
import { AddMealItemDto } from './dto/add-meal-item.dto';
import { UpdateMealItemDto } from './dto/update-meal-item.dto';
import { FindMealLogsQueryDto } from './dto/find-meal-logs-query.dto';
import { DailySummaryQueryDto } from './dto/daily-summary-query.dto';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Nutrição - Refeições')
@ApiBearerAuth('access-token')
@Controller('meal-logs')
@UseGuards(AuthGuard('jwt'))
export class MealLogsController {
  constructor(private readonly mealLogsService: MealLogsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar nova refeição (opcionalmente com lista de alimentos)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Refeição registrada com snapshots calculados.',
  })
  async create(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateMealLogDto,
  ) {
    return this.mealLogsService.create(userId, dto);
  }

  @Get('daily-summary')
  @ApiOperation({
    summary: 'Obter resumo nutricional do dia vs metas cadastradas e refeições',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resumo diário com progresso e balanço nutricional retornado.',
  })
  async getDailySummary(
    @GetCurrentUserId() userId: string,
    @Query() query: DailySummaryQueryDto,
  ) {
    return this.mealLogsService.getDailySummary(userId, query);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar refeições com filtros de período/data e paginação',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista paginada de refeições retornada.',
  })
  async findAll(
    @GetCurrentUserId() userId: string,
    @Query() query: FindMealLogsQueryDto,
  ) {
    return this.mealLogsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter detalhes completos de uma refeição e seus itens',
  })
  @ApiParam({ name: 'id', description: 'ID da refeição (UUID)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Refeição localizada.' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Refeição não encontrada.',
  })
  async findOne(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.mealLogsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar metadados de uma refeição (data, tipo, notas)',
  })
  @ApiParam({ name: 'id', description: 'ID da refeição (UUID)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Refeição atualizada.' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Refeição não encontrada.',
  })
  async update(
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: UpdateMealLogDto,
  ) {
    return this.mealLogsService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover logicamente uma refeição (Soft Delete)' })
  @ApiParam({ name: 'id', description: 'ID da refeição (UUID)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Refeição removida.' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Refeição não encontrada.',
  })
  async remove(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.mealLogsService.remove(id, userId);
  }

  @Post(':id/items')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Adicionar alimento à refeição calculando o snapshot nutricional',
  })
  @ApiParam({ name: 'id', description: 'ID da refeição (UUID)' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Item adicionado.' })
  async addItem(
    @Param('id') mealLogId: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: AddMealItemDto,
  ) {
    return this.mealLogsService.addItem(mealLogId, userId, dto);
  }

  @Patch(':id/items/:itemId')
  @ApiOperation({
    summary:
      'Atualizar a quantidade consumida de um alimento e recalcular o snapshot',
  })
  @ApiParam({ name: 'id', description: 'ID da refeição (UUID)' })
  @ApiParam({ name: 'itemId', description: 'ID do item da refeição (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Item recalculado e atualizado.',
  })
  async updateItem(
    @Param('id') mealLogId: string,
    @Param('itemId') itemId: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: UpdateMealItemDto,
  ) {
    return this.mealLogsService.updateItem(mealLogId, itemId, userId, dto);
  }

  @Delete(':id/items/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover um alimento de uma refeição' })
  @ApiParam({ name: 'id', description: 'ID da refeição (UUID)' })
  @ApiParam({ name: 'itemId', description: 'ID do item da refeição (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Item removido da refeição.',
  })
  async removeItem(
    @Param('id') mealLogId: string,
    @Param('itemId') itemId: string,
    @GetCurrentUserId() userId: string,
  ) {
    return this.mealLogsService.removeItem(mealLogId, itemId, userId);
  }
}
