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
import { WeightGoalsService } from './weight-goals.service';
import { CreateWeightGoalDto } from './dto/create-weight-goal.dto';
import { UpdateWeightGoalDto } from './dto/update-weight-goal.dto';
import { FindWeightGoalsQueryDto } from './dto/find-weight-goals-query.dto';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Nutrição - Metas de Peso')
@ApiBearerAuth('access-token')
@Controller('weight-goals')
@UseGuards(AuthGuard('jwt'))
export class WeightGoalsController {
  constructor(private readonly weightGoalsService: WeightGoalsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:
      'Cadastrar nova meta de perda de peso (arquivando metas ativas anteriores)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Meta de peso criada com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Peso alvo maior que o peso inicial ou ausência de ponto de partida.',
  })
  async create(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateWeightGoalDto,
  ) {
    return this.weightGoalsService.create(userId, dto);
  }

  @Get('current')
  @ApiOperation({
    summary:
      'Obter meta de peso ativa e painel analítico de acompanhamento (ritmo, projeção e aderência)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Meta ativa e dashboard analítico de progresso retornados com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Nenhuma meta de perda de peso ativa encontrada.',
  })
  async getCurrentGoal(@GetCurrentUserId() userId: string) {
    return this.weightGoalsService.getCurrentGoal(userId);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar histórico de metas de peso com filtros e paginação',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Histórico paginado de metas de peso retornado.',
  })
  async findAll(
    @GetCurrentUserId() userId: string,
    @Query() query: FindWeightGoalsQueryDto,
  ) {
    return this.weightGoalsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter detalhes de uma meta de peso específica e seu progresso',
  })
  @ApiParam({ name: 'id', description: 'ID da meta de peso (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Meta de peso localizada.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Meta de peso não encontrada.',
  })
  async findOne(
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
  ) {
    return this.weightGoalsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary:
      'Atualizar parâmetros da meta de peso (peso alvo, datas, status ou notas)',
  })
  @ApiParam({ name: 'id', description: 'ID da meta de peso (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Meta de peso atualizada com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Meta de peso não encontrada.',
  })
  async update(
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: UpdateWeightGoalDto,
  ) {
    return this.weightGoalsService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remover logicamente uma meta de peso (Soft Delete)',
  })
  @ApiParam({ name: 'id', description: 'ID da meta de peso (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Meta de peso removida com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Meta de peso não encontrada.',
  })
  async remove(
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
  ) {
    return this.weightGoalsService.remove(id, userId);
  }
}
