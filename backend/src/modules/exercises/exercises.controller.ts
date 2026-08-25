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
import { ExercisesService } from './exercises.service';
import { CreateExerciseDto } from './dto/create-exercise.dto';
import { UpdateExerciseDto } from './dto/update-exercise.dto';
import { FindExercisesQueryDto } from './dto/find-exercises-query.dto';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Fitness - Exercícios')
@ApiBearerAuth('access-token')
@Controller('exercises')
@UseGuards(AuthGuard('jwt'))
export class ExercisesController {
  constructor(private readonly exercisesService: ExercisesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar um exercício de forma independente' })
  @ApiResponse({ status: 201, description: 'Exercício criado com sucesso.' })
  async create(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateExerciseDto,
  ) {
    return this.exercisesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todos os exercícios com suporte a paginação e filtros',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de exercícios obtida com sucesso.',
  })
  async findAll(
    @GetCurrentUserId() userId: string,
    @Query() query: FindExercisesQueryDto,
  ) {
    return this.exercisesService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um exercício específico' })
  @ApiParam({ name: 'id', description: 'ID do exercício (UUID)' })
  @ApiResponse({ status: 200, description: 'Exercício localizado.' })
  @ApiResponse({ status: 404, description: 'Exercício não encontrado.' })
  async findOne(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.exercisesService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar propriedades de um exercício existente' })
  @ApiParam({ name: 'id', description: 'ID do exercício (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Exercício atualizado com sucesso.',
  })
  async update(
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: UpdateExerciseDto,
  ) {
    return this.exercisesService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover logicamente um exercício (Soft Delete)' })
  @ApiParam({ name: 'id', description: 'ID do exercício (UUID)' })
  @ApiResponse({ status: 200, description: 'Exercício removido.' })
  async remove(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.exercisesService.remove(id, userId);
  }
}
