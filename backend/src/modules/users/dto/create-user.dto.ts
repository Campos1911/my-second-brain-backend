import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({
    description: 'Nome completo do usuário',
    example: 'João Silva',
  })
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  name!: string;

  @ApiProperty({
    description: 'E-mail de autenticação do usuário',
    example: 'joao.silva@exemplo.com',
  })
  @IsEmail({}, { message: 'Formato de e-mail inválido.' })
  email!: string;

  @ApiProperty({
    description: 'Senha de acesso',
    example: 'senhaForte123',
  })
  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  password!: string;
}
