import { IsEmail, IsString } from 'class-validator';

export class CreateUserDto {
  /**
   * Endereço de e-mail do novo usuário. Deve ser único no sistema.
   * @example "novo.usuario@email.com"
   */
  @IsEmail()
  email!: string;

  /**
   * Senha de acesso do usuário.
   * @example "senhaForte123"
   */
  @IsString()
  password!: string;
}
