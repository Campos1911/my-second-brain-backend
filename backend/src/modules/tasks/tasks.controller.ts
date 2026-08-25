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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { FindTasksQueryDto } from './dto/find-tasks-query.dto';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Tarefas')
@ApiBearerAuth('access-token')
@Controller('tasks')
@UseGuards(AuthGuard('jwt'))
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar uma nova tarefa' })
  @ApiResponse({ status: 201, description: 'Tarefa criada com sucesso.' })
  async create(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar todas as tarefas com suporte a paginação e filtros',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de tarefas obtida com sucesso.',
  })
  async findAll(
    @GetCurrentUserId() userId: string,
    @Query() query: FindTasksQueryDto,
  ) {
    return this.tasksService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma tarefa específica' })
  @ApiParam({ name: 'id', description: 'ID da tarefa (UUID)' })
  @ApiResponse({ status: 200, description: 'Tarefa localizada.' })
  @ApiResponse({ status: 404, description: 'Tarefa não encontrada.' })
  async findOne(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.tasksService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar propriedades de uma tarefa existente' })
  @ApiParam({ name: 'id', description: 'ID da tarefa (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Tarefa updated com sucesso.',
  })
  async update(
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover logicamente uma tarefa (Soft Delete)' })
  @ApiParam({ name: 'id', description: 'ID da tarefa (UUID)' })
  @ApiResponse({ status: 200, description: 'Tarefa removida.' })
  async remove(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.tasksService.remove(id, userId);
  }
}
