import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Categorias')
@ApiBearerAuth('access-token')
@Controller('categories')
@UseGuards(AuthGuard('jwt'))
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  @ApiOperation({ summary: 'Cadastrar nova categoria' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Categoria criada com sucesso.',
  })
  async create(
    @GetCurrentUserId() userId: string,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar categorias do usuário e categorias globais',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista paginada de categorias obtida com sucesso.',
  })
  async findAll(
    @GetCurrentUserId() userId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
  ) {
    return this.categoriesService.findAll(userId, page, limit);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obter detalhes de uma categoria' })
  @ApiParam({ name: 'id', description: 'ID da categoria (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categoria localizada com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Categoria não encontrada.',
  })
  async findOne(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.categoriesService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados de uma categoria personalizada' })
  @ApiParam({ name: 'id', description: 'ID da categoria (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categoria atualizada com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Categoria não localizada ou sem permissão de edição.',
  })
  async update(
    @Param('id') id: string,
    @GetCurrentUserId() userId: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover categoria (Soft Delete)' })
  @ApiParam({ name: 'id', description: 'ID da categoria (UUID)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categoria removida com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Categoria não encontrada ou protegida contra exclusão.',
  })
  async remove(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.categoriesService.remove(id, userId);
  }
}
