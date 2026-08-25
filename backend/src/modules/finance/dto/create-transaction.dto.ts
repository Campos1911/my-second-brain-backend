import {
  IsNumber,
  IsString,
  IsOptional,
  IsUUID,
  IsDateString,
  IsIn,
} from 'class-validator';

export class CreateTransactionDto {
  /**
   * Valor financeiro da transação.
   * @example 1250.50
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  /**
   * Detalhes opcionais ou descrição da despesa/receita.
   * @example "Supermercado Mensal"
   */
  @IsString()
  @IsOptional()
  description?: string;

  /**
   * Data em que a transação ocorreu (Formato ISO 8601). Se ausente, usa o momento atual.
   * @example "2024-03-20T14:30:00.000Z"
   */
  @IsDateString()
  @IsOptional()
  date?: string;

  /**
   * ID único da categoria associada a esta transação.
   * @example "a8c90be6-7d1c-4b5b-80df-4f40bb8be452"
   */
  @IsUUID()
  categoryId!: string;

  /**
   * Método de pagamento utilizado (DEBIT ou CREDIT).
   * @example "CREDIT"
   */
  @IsIn(['DEBIT', 'CREDIT'], {
    message: 'O método de pagamento deve ser DEBIT ou CREDIT.',
  })
  @IsOptional()
  paymentMethod?: 'DEBIT' | 'CREDIT' = 'DEBIT';
}
