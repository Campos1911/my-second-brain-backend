import { Test, TestingModule } from '@nestjs/testing';
import { FoodsService } from './foods.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, ServingUnit } from '../../generated/prisma/client';

const mockPrismaService = {
  food: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

describe('FoodsService', () => {
  let service: FoodsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FoodsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FoodsService>(FoodsService);
    prisma = module.get(PrismaService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-uuid-1';
    const createDto = {
      name: 'Arroz Branco Cozido',
      brand: 'Tio João',
      servingSize: 100,
      servingUnit: ServingUnit.GRAM,
      calories: 130,
      protein: 2.5,
      carbs: 28.2,
      fat: 0.3,
      fiber: 0.4,
    };

    it('deve cadastrar um alimento customizado com sucesso', async () => {
      const expectedRecord = {
        id: 'food-uuid-1',
        ...createDto,
        servingSize: new Prisma.Decimal(createDto.servingSize),
        calories: new Prisma.Decimal(createDto.calories),
        protein: new Prisma.Decimal(createDto.protein),
        carbs: new Prisma.Decimal(createDto.carbs),
        fat: new Prisma.Decimal(createDto.fat),
        fiber: new Prisma.Decimal(createDto.fiber),
        userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      prisma.food.create.mockResolvedValue(expectedRecord);

      const result = await service.create(userId, createDto);

      expect(prisma.food.create).toHaveBeenCalledWith({
        data: {
          name: createDto.name,
          brand: createDto.brand,
          servingSize: new Prisma.Decimal(createDto.servingSize),
          servingUnit: createDto.servingUnit,
          calories: new Prisma.Decimal(createDto.calories),
          protein: new Prisma.Decimal(createDto.protein),
          carbs: new Prisma.Decimal(createDto.carbs),
          fat: new Prisma.Decimal(createDto.fat),
          fiber: new Prisma.Decimal(createDto.fiber),
          userId,
        },
      });
      expect(result).toEqual(expectedRecord);
    });
  });

  describe('findAll', () => {
    const userId = 'user-uuid-1';

    it('deve listar alimentos globais e do usuário autenticado por padrão', async () => {
      const mockFoods = [
        { id: '1', name: 'Ovo Cozido', userId: null },
        { id: '2', name: 'Whey Protein', userId },
      ];

      prisma.food.count.mockResolvedValue(2);
      prisma.food.findMany.mockResolvedValue(mockFoods);

      const result = await service.findAll(userId, { page: 1, limit: 20 });

      expect(prisma.food.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            OR: [{ userId }, { userId: null }],
          },
        }),
      );
      expect(result.data).toEqual(mockFoods);
      expect(result.meta.total).toBe(2);
    });

    it('deve listar exclusivamente os alimentos do usuário quando onlyMine for true', async () => {
      prisma.food.count.mockResolvedValue(1);
      prisma.food.findMany.mockResolvedValue([{ id: '2', name: 'Whey Protein', userId }]);

      const result = await service.findAll(userId, { page: 1, limit: 20, onlyMine: true });

      expect(prisma.food.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            deletedAt: null,
            userId,
          },
        }),
      );
      expect(result.data).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    const userId = 'user-uuid-1';

    it('deve retornar o alimento se ele for público ou pertencer ao usuário', async () => {
      const mockFood = { id: 'food-1', name: 'Banana Prata', userId: null };
      prisma.food.findFirst.mockResolvedValue(mockFood);

      const result = await service.findOne('food-1', userId);

      expect(prisma.food.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'food-1',
          deletedAt: null,
          OR: [{ userId }, { userId: null }],
        },
      });
      expect(result).toEqual(mockFood);
    });

    it('deve lançar NotFoundException se o alimento não for localizado', async () => {
      prisma.food.findFirst.mockResolvedValue(null);

      await expect(service.findOne('invalid-id', userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    const userId = 'user-uuid-1';

    it('deve permitir atualizar alimento pertencente ao usuário autenticado', async () => {
      const mockFood = { id: 'food-1', name: 'Iogurte Natural', userId };
      prisma.food.findFirst.mockResolvedValue(mockFood);
      prisma.food.update.mockResolvedValue({ ...mockFood, name: 'Iogurte Desnatado' });

      const result = await service.update('food-1', userId, {
        name: 'Iogurte Desnatado',
      });

      expect(prisma.food.update).toHaveBeenCalled();
      expect(result.name).toBe('Iogurte Desnatado');
    });

    it('deve lançar ForbiddenException ao tentar atualizar alimento público global', async () => {
      const mockGlobalFood = { id: 'food-global', name: 'Ovo de Galinha', userId: null };
      prisma.food.findFirst.mockResolvedValue(mockGlobalFood);

      await expect(
        service.update('food-global', userId, { name: 'Ovo Caipira' }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.food.update).not.toHaveBeenCalled();
    });

    it('deve lançar ForbiddenException ao tentar atualizar alimento de outro usuário', async () => {
      const mockOtherUserFood = {
        id: 'food-other',
        name: 'Mix de Frutas',
        userId: 'other-user-uuid',
      };
      prisma.food.findFirst.mockResolvedValue(mockOtherUserFood);

      await expect(
        service.update('food-other', userId, { name: 'Mix de Nuts' }),
      ).rejects.toThrow(ForbiddenException);

      expect(prisma.food.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    const userId = 'user-uuid-1';

    it('deve realizar soft delete se o alimento pertencer ao usuário', async () => {
      const mockFood = { id: 'food-1', name: 'Crepioca', userId };
      prisma.food.findFirst.mockResolvedValue(mockFood);
      prisma.food.update.mockResolvedValue({ ...mockFood, deletedAt: new Date() });

      const result = await service.remove('food-1', userId);

      expect(prisma.food.update).toHaveBeenCalledWith({
        where: { id: 'food-1' },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result).toEqual({ message: 'Alimento removido com sucesso.' });
    });

    it('deve lançar ForbiddenException ao tentar remover alimento global', async () => {
      const mockGlobalFood = { id: 'food-global', name: 'Azeite de Oliva', userId: null };
      prisma.food.findFirst.mockResolvedValue(mockGlobalFood);

      await expect(service.remove('food-global', userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.food.update).not.toHaveBeenCalled();
    });
  });
});