import {
  IsNumber,
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import {
  RecurrenceFrequency,
  PaymentMethod,
} from '../../../generated/prisma/client';

export class CreateRecurringTransactionDto {
  /**
   * Valor de cada ocorrência financeira automática gerada.
   * @example 99.90
   */
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  /**
   * Descrição para identificação no painel de recorrências.
   * @example "Assinatura do Streaming de Vídeo"
   */
  @IsString()
  @IsNotEmpty()
  description!: string;

  /**
   * Frequência do agendamento (DAILY, WEEKLY, BIWEEKLY, MONTHLY, YEARLY).
   * @example "MONTHLY"
   */
  @IsEnum(RecurrenceFrequency)
  frequency!: RecurrenceFrequency;

  /**
   * Data do primeiro lançamento automático (Formato ISO).
   * @example "2024-04-01T00:00:00.000Z"
   */
  @IsDateString()
  startDate!: string;

  /**
   * Data final opcional do ciclo de cobrança automática.
   * @example "2025-04-01T00:00:00.000Z"
   */
  @IsDateString()
  @IsOptional()
  endDate?: string;

  /**
   * ID único da categoria vinculada.
   * @example "c72df645-5d9c-497d-aa21-0a4ee728cb11"
   */
  @IsUUID()
  categoryId!: string;

  /**
   * Canal de pagamento que será emulado (DEBIT ou CREDIT).
   * @example "CREDIT"
   */
  @IsEnum(PaymentMethod)
  @IsOptional()
  paymentMethod?: PaymentMethod = PaymentMethod.DEBIT;
}
