import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FoodsService } from './foods.service';
import { CreateFoodDto } from './dto/create-food.dto';
import { UpdateFoodDto } from './dto/update-food.dto';
import { FindFoodsQueryDto } from './dto/find-foods-query.dto';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

@ApiTags('Nutrição - Alimentos')
@ApiBearerAuth('access-token')
@Controller('foods')
@UseGuards(AuthGuard('jwt'))
export class FoodsController {
  constructor(private readonly foodsService: FoodsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Cadastrar novo alimento customizado para o usuário',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Alimento cadastrado com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados de entrada inválidos.',
  })
  async create(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateFoodDto,
  ) {
    return this.foodsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar alimentos com suporte a paginação, busca e filtro de propriedade',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista paginada de alimentos obtida com sucesso.',
  })
  async findAll(
    @GetCurrentUserId() userId: string,
    @Query() query: FindFoodsQueryDto,
  ) {
    return this.foodsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de um alimento específico' })
  @ApiParam({ name: 'id', description: 'ID do alimento (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alimento localizado com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Alimento não encontrado.',
  })
  async findOne(
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
  ) {
    return this.foodsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados de um alimento customizado' })
  @ApiParam({ name: 'id', description: 'ID do alimento (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alimento atualizado com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem permissão para alterar este alimento.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Alimento não encontrado.',
  })
  async update(
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: UpdateFoodDto,
  ) {
    return this.foodsService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remover logicamente um alimento customizado (Soft Delete)' })
  @ApiParam({ name: 'id', description: 'ID do alimento (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Alimento removido com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Sem permissão para remover este alimento.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Alimento não encontrado.',
  })
  async remove(
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
  ) {
    return this.foodsService.remove(id, userId);
  }
}