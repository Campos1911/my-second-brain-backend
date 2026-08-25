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
import { WeightLogsService } from './weight-logs.service';
import { CreateWeightLogDto } from './dto/create-weight-log.dto';
import { UpdateWeightLogDto } from './dto/update-weight-log.dto';
import { FindWeightLogsQueryDto } from './dto/find-weight-logs-query.dto';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Nutrição - Histórico de Peso')
@ApiBearerAuth('access-token')
@Controller('weight-logs')
@UseGuards(AuthGuard('jwt'))
export class WeightLogsController {
  constructor(private readonly weightLogsService: WeightLogsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar nova pesagem corporal' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pesagem registrada com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados inválidos ou peso fora do intervalo (20 a 400 kg).',
  })
  async create(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateWeightLogDto,
  ) {
    return this.weightLogsService.create(userId, dto);
  }

  @Get('latest')
  @ApiOperation({
    summary:
      'Obter a pesagem mais recente, delta em relação ao registro anterior e distância para a meta',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pesagem mais recente calculada com sucesso.',
  })
  async getLatest(@GetCurrentUserId() userId: string) {
    return this.weightLogsService.getLatest(userId);
  }

  @Get('stats')
  @ApiOperation({
    summary:
      'Obter agregados estatísticos (peso inicial, atual, menor, maior e variação total)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Estatísticas de pesagem obtidas com sucesso.',
  })
  async getStats(@GetCurrentUserId() userId: string) {
    return this.weightLogsService.getStats(userId);
  }

  @Get()
  @ApiOperation({
    summary:
      'Listar histórico de pesagens com suporte a paginação e filtros de período',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Histórico paginado de pesagens.',
  })
  async findAll(
    @GetCurrentUserId() userId: string,
    @Query() query: FindWeightLogsQueryDto,
  ) {
    return this.weightLogsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma pesagem específica' })
  @ApiParam({ name: 'id', description: 'ID da pesagem (UUID)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Pesagem localizada.' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pesagem não encontrada.',
  })
  async findOne(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.weightLogsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar valor, data ou observações de uma pesagem',
  })
  @ApiParam({ name: 'id', description: 'ID da pesagem (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pesagem atualizada com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pesagem não encontrada.',
  })
  async update(
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: UpdateWeightLogDto,
  ) {
    return this.weightLogsService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover logicamente uma pesagem (Soft Delete)' })
  @ApiParam({ name: 'id', description: 'ID da pesagem (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pesagem removida com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Pesagem não encontrada.',
  })
  async remove(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.weightLogsService.remove(id, userId);
  }
}
