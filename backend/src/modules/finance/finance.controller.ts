import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  BadRequestException,
  Patch,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { UpdateTransactionDto } from './dto/update-transaction.dto';

@ApiTags('Financeiro')
@ApiBearerAuth('access-token')
@Controller('transactions')
@UseGuards(AuthGuard('jwt'))
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar uma nova transação financeira manual' })
  @ApiResponse({
    status: 201,
    description: 'Transação registrada com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Categoria não localizada ou inativa.',
  })
  async create(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateTransactionDto,
  ) {
    return this.transactionsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar transações financeiras filtradas e paginadas',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({
    name: 'month',
    required: false,
    type: Number,
    description: 'Mês de referência (1-12)',
    example: 3,
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Ano de referência',
    example: 2024,
  })
  @ApiQuery({
    name: 'categoryIds',
    required: false,
    type: String,
    description: 'IDs das categorias separados por vírgula',
  })
  @ApiQuery({
    name: 'paymentMethod',
    required: false,
    enum: ['DEBIT', 'CREDIT'],
    description: 'Filtrar por método de pagamento',
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna a lista paginada de transações.',
  })
  async findAll(
    @GetCurrentUserId() userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('month', new ParseIntPipe({ optional: true })) month?: number,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
    @Query('categoryIds') categoryIds?: string | string[],
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    this.validatePaymentMethodQuery(paymentMethod);

    return this.transactionsService.findAll(
      userId,
      page,
      limit,
      month,
      year,
      categoryIds,
      paymentMethod as 'DEBIT' | 'CREDIT' | undefined,
    );
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Exibir painel resumo financeiro (Entradas, Saídas e Saldo)',
  })
  @ApiQuery({ name: 'month', required: false, type: Number, example: 3 })
  @ApiQuery({ name: 'year', required: false, type: Number, example: 2024 })
  @ApiQuery({
    name: 'categoryIds',
    required: false,
    type: String,
    description: 'Filtrar somatório por categorias (CSV)',
  })
  @ApiQuery({
    name: 'paymentMethod',
    required: false,
    enum: ['DEBIT', 'CREDIT'],
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna os consolidados de receita, despesa e saldo.',
  })
  async getSummary(
    @GetCurrentUserId() userId: string,
    @Query('month', new ParseIntPipe({ optional: true })) month?: number,
    @Query('year', new ParseIntPipe({ optional: true })) year?: number,
    @Query('categoryIds') categoryIds?: string | string[],
    @Query('paymentMethod') paymentMethod?: string,
  ) {
    this.validatePaymentMethodQuery(paymentMethod);

    return this.transactionsService.getSummary(
      userId,
      month,
      year,
      categoryIds,
      paymentMethod as 'DEBIT' | 'CREDIT' | undefined,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma transação específica' })
  @ApiParam({ name: 'id', description: 'ID da transação (UUID)', type: String })
  @ApiResponse({ status: 200, description: 'Transação retornada.' })
  @ApiResponse({ status: 404, description: 'Transação não encontrada.' })
  async findOne(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.transactionsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar uma transação financeira existente' })
  @ApiParam({ name: 'id', description: 'ID da transação (UUID)', type: String })
  @ApiResponse({
    status: 200,
    description: 'Transação atualizada com sucesso.',
  })
  @ApiResponse({
    status: 404,
    description: 'Transação ou nova categoria não encontrada.',
  })
  async update(
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactionsService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover transação financeira (Soft Delete)' })
  @ApiParam({ name: 'id', description: 'ID da transação (UUID)', type: String })
  @ApiResponse({ status: 200, description: 'Transação removida.' })
  async remove(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.transactionsService.remove(id, userId);
  }

  private validatePaymentMethodQuery(method?: string) {
    if (method && method !== 'DEBIT' && method !== 'CREDIT') {
      throw new BadRequestException(
        'Método de pagamento inválido. Valores aceitos: DEBIT ou CREDIT.',
      );
    }
  }
}
