import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  /**
   * Endereço de e-mail registrado do usuário.
   * @example user@example.com
   */
  @IsEmail({}, { message: 'E-mail inválido' })
  email!: string;

  /**
   * Senha de acesso contendo no mínimo 6 caracteres.
   * @example senhaSegura123
   */
  @IsString()
  @MinLength(6, { message: 'A senha deve ter no mínimo 6 caracteres' })
  password!: string;
}
