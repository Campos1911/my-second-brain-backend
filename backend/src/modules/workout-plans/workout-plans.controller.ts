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
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WorkoutPlansService } from './workout-plans.service';
import { CreateWorkoutPlanDto } from './dto/create-workout-plan.dto';
import { UpdateWorkoutPlanDto } from './dto/update-workout-plan.dto';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Fitness - planos de treinos')
@ApiBearerAuth('access-token')
@Controller('workout-plans')
@UseGuards(AuthGuard('jwt'))
export class WorkoutPlansController {
  constructor(private readonly workoutPlansService: WorkoutPlansService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Criar um plano de treino estruturado (opcionalmente com exercícios iniciais)',
  })
  @ApiResponse({
    status: 201,
    description: 'Plano e exercícios vinculados criados.',
  })
  async create(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateWorkoutPlanDto,
  ) {
    return this.workoutPlansService.create(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos os planos de treino cadastrados pelo usuário',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Retorna a lista de planos.' })
  async findAll(
    @GetCurrentUserId() userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.workoutPlansService.findAll(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter exercícios e detalhes de um plano de treino',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do plano de treino (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Ficha de treino retornada com sucesso.',
  })
  async findOne(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.workoutPlansService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar o cabeçalho do plano de treino' })
  @ApiParam({
    name: 'id',
    description: 'ID do plano de treino (UUID)',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Dados atualizados com sucesso.' })
  async update(
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: UpdateWorkoutPlanDto,
  ) {
    return this.workoutPlansService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Excluir plano e exercícios associados em cascata (Soft Delete)',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do plano de treino (UUID)',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Plano de treino removido.' })
  async remove(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.workoutPlansService.remove(id, userId);
  }
}
