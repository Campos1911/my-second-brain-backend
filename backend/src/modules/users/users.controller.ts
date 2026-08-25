import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Usuários')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  // Sobrescreve o limitador padrão "default" para no máximo 5 requisições por minuto por IP nesta rota.
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Criar um novo usuário' })
  @ApiResponse({ status: 201, description: 'Usuário cadastrado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados de entrada inválidos.' })
  @ApiResponse({ status: 409, description: 'E-mail já cadastrado.' })
  async create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os usuários (Admin/Interno)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Número da página',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Quantidade de itens por página',
  })
  @ApiResponse({
    status: 200,
    description: 'Retorna a lista de usuários cadastrados.',
  })
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.usersService.findAll(page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter perfil de um usuário pelo ID' })
  @ApiParam({ name: 'id', description: 'ID do usuário (UUID)', type: String })
  @ApiResponse({ status: 200, description: 'Usuário retornado.' })
  @ApiResponse({ status: 404, description: 'Usuário não localizado.' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados cadastrais do usuário' })
  @ApiParam({ name: 'id', description: 'ID do usuário (UUID)', type: String })
  @ApiResponse({ status: 200, description: 'Usuário atualizado com sucesso.' })
  async update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover um usuário (Soft Delete)' })
  @ApiParam({ name: 'id', description: 'ID do usuário (UUID)', type: String })
  @ApiResponse({ status: 200, description: 'Usuário excluído com sucesso.' })
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
