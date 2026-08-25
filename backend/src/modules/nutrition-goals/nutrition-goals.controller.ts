import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NutritionGoalsService } from './nutrition-goals.service';
import { CalculateNutritionGoalDto } from './dto/calculate-nutrition-goal.dto';
import { UpsertNutritionGoalDto } from './dto/upsert-nutrition-goal.dto';
import { GetCurrentUserId } from '../../common/decorators/get-current-user-id.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('Nutrição - Metas Nutricionais & Calculadora')
@ApiBearerAuth('access-token')
@Controller('nutrition-goals')
@UseGuards(AuthGuard('jwt'))
export class NutritionGoalsController {
  constructor(
    private readonly nutritionGoalsService: NutritionGoalsService,
  ) {}

  @Post('calculate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Calcular TMB, TDEE, déficit calórico e distribuição de macronutrientes (sem persistir)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cálculo de metas e distribuição nutricional retornado.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Parâmetros biométricos inválidos.',
  })
  calculate(@Body() dto: CalculateNutritionGoalDto) {
    return this.nutritionGoalsService.calculate(dto);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cadastrar ou atualizar (Upsert) a meta nutricional do usuário',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Meta nutricional salva com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Dados de meta nutricional inválidos.',
  })
  async upsert(
    @GetCurrentUserId() userId: string,
    @Body() dto: UpsertNutritionGoalDto,
  ) {
    return this.nutritionGoalsService.upsert(userId, dto);
  }

  @Get('current')
  @ApiOperation({
    summary: 'Obter a meta nutricional ativa do usuário autenticado',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Meta nutricional ativa retornada com sucesso.',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Nenhuma meta configurada para o usuário.',
  })
  async getCurrentGoal(@GetCurrentUserId() userId: string) {
    return this.nutritionGoalsService.getCurrentGoal(userId);
  }
}
