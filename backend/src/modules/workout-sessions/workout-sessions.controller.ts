import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorkoutSessionsService } from './workout-sessions.service';
import { StartSessionDto } from './dto/start-session.dto';
import { LogSetDto } from './dto/log-set.dto';
import { UpdateSetLogDto } from './dto/update-set-log.dto';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Fitness - sessões de treinos')
@ApiBearerAuth('access-token')
@Controller('workout-sessions')
@UseGuards(AuthGuard('jwt'))
export class WorkoutSessionsController {
  constructor(
    private readonly workoutSessionsService: WorkoutSessionsService,
  ) {}

  @Post('start')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Iniciar cronômetro e sessão de treino para um plano',
  })
  @ApiResponse({ status: 201, description: 'Treino iniciado com sucesso.' })
  @ApiResponse({
    status: 400,
    description: 'Já existe uma sessão de treino ativa.',
  })
  async startSession(
    @GetCurrentUserId() userId: string,
    @Body() dto: StartSessionDto,
  ) {
    return this.workoutSessionsService.startSession(userId, dto);
  }

  @Post(':id/sets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Registrar execução de uma série (peso e repetições)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da sessão de treino ativa (UUID)',
    type: String,
  })
  @ApiResponse({ status: 201, description: 'Série registrada com sucesso.' })
  async logSet(
    @Param('id') sessionId: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: LogSetDto,
  ) {
    return this.workoutSessionsService.logSet(sessionId, userId, dto);
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Finalizar e persistir sessão de treino executada' })
  @ApiParam({
    name: 'id',
    description: 'ID da sessão de treino ativa (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Sessão finalizada com marcas e logs gravados.',
  })
  async finishSession(
    @Param('id') sessionId: string,
    @GetCurrentUserId() userId: string,
  ) {
    return this.workoutSessionsService.finishSession(sessionId, userId);
  }

  @Patch('sets/:setId')
  @ApiOperation({
    summary: 'Editar dados de uma série executada no treino atual',
  })
  @ApiParam({
    name: 'setId',
    description: 'ID do log da série (UUID)',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Série atualizada.' })
  async updateSet(
    @Param('setId') setId: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: UpdateSetLogDto,
  ) {
    return this.workoutSessionsService.updateSet(setId, userId, dto);
  }

  @Delete('sets/:setId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remover log de execução de uma série de exercícios',
  })
  @ApiParam({
    name: 'setId',
    description: 'ID do log da série (UUID)',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Série excluída com sucesso.' })
  async removeSet(
    @Param('setId') setId: string,
    @GetCurrentUserId() userId: string,
  ) {
    return this.workoutSessionsService.removeSet(setId, userId);
  }

  @Get('exercises/:exerciseId/progress')
  @ApiOperation({
    summary: 'Histórico de progressão de carga de um exercício específico',
  })
  @ApiParam({
    name: 'exerciseId',
    description: 'ID do exercício estruturado (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description:
      'Retorna a lista cronológica de cargas levantadas e o volume de treino.',
  })
  async getExerciseProgress(
    @Param('exerciseId') exerciseId: string,
    @GetCurrentUserId() userId: string,
  ) {
    return this.workoutSessionsService.getExerciseProgress(exerciseId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Listar histórico de sessões de treino' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @GetCurrentUserId() userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.workoutSessionsService.findAll(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter painel completo da sessão e séries realizadas',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da sessão de treino (UUID)',
    type: String,
  })
  async findOne(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.workoutSessionsService.findOne(id, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover sessão de treino e logs em cascata' })
  @ApiParam({
    name: 'id',
    description: 'ID da sessão de treino (UUID)',
    type: String,
  })
  async remove(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.workoutSessionsService.remove(id, userId);
  }
}
