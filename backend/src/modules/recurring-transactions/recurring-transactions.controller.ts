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
import { RecurringTransactionsService } from './recurring-transactions.service';
import { CreateRecurringTransactionDto } from './dto/create-recurring-transaction.dto';
import { UpdateRecurringTransactionDto } from './dto/update-recurring-transaction.dto';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Recorrência Financeira')
@ApiBearerAuth('access-token')
@Controller('recurring-transactions')
@UseGuards(AuthGuard('jwt'))
export class RecurringTransactionsController {
  constructor(
    private readonly recurringTransactionsService: RecurringTransactionsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cadastrar novo agendamento de transação recorrente',
  })
  @ApiResponse({
    status: 201,
    description: 'Recorrência salva e agendamento ativo.',
  })
  async create(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateRecurringTransactionDto,
  ) {
    return this.recurringTransactionsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar agendamentos recorrentes cadastrados' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Retorna a lista de recorrências.' })
  async findAll(
    @GetCurrentUserId() userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.recurringTransactionsService.findAll(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Obter detalhes de uma configuração de recorrência',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da recorrência (UUID)',
    type: String,
  })
  @ApiResponse({ status: 200, description: 'Recorrência encontrada.' })
  async findOne(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.recurringTransactionsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar configuração ou pausar/ativar recorrência',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da recorrência (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Recorrência atualizada com sucesso.',
  })
  async update(
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: UpdateRecurringTransactionDto,
  ) {
    return this.recurringTransactionsService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Excluir definitivamente e inativar o motor recorrente',
  })
  @ApiParam({
    name: 'id',
    description: 'ID da recorrência (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Recorrência removida de forma lógica.',
  })
  async remove(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.recurringTransactionsService.remove(id, userId);
  }
}
