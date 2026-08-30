import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome é obrigatório.' })
  name!: string;

  @IsEmail({}, { message: 'Formato de e-mail inválido.' })
  email!: string;

  @IsString()
  @IsNotEmpty({ message: 'A senha é obrigatória.' })
  password!: string;
}
