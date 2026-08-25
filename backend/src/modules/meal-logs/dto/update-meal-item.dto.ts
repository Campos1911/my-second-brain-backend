import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateMealItemDto {
  @ApiProperty({
    description: 'Nova quantidade consumida do alimento',
    example: 200.0,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message:
        'A quantidade deve ser um número válido com até 2 casas decimais.',
    },
  )
  @Min(0.01, { message: 'A quantidade consumida deve ser maior que zero.' })
  quantity!: number;
}
