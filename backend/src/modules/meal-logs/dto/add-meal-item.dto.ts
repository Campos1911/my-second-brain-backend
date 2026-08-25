import { IsUUID, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddMealItemDto {
  @ApiProperty({
    description: 'ID do alimento cadastrado (UUID)',
    example: 'd3b07384-d113-4a4b-9c8e-2895e6f33291',
  })
  @IsUUID('4', { message: 'O ID do alimento deve ser um UUID válido.' })
  foodId!: string;

  @ApiProperty({
    description: 'Quantidade consumida na unidade de medida do alimento',
    example: 150.0,
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
