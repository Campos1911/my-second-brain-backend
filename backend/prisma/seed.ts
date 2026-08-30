import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import {
  PrismaClient,
  CategoryType,
  PaymentMethod,
  RecurrenceFrequency,
  ServingUnit,
  MealType,
  TaskPriority,
  TaskStatus,
  Prisma,
} from '../src/generated/prisma/client';
import * as bcrypt from 'bcrypt';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
async function main() {
  console.log('🔄 Iniciando limpeza completa do banco de dados...');
  await prisma.mealFoodItem.deleteMany();
  await prisma.mealLog.deleteMany();
  await prisma.weightLog.deleteMany();
  await prisma.nutritionGoal.deleteMany();
  await prisma.food.deleteMany();
  await prisma.task.deleteMany();
  await prisma.setLog.deleteMany();
  await prisma.workoutSession.deleteMany();
  await prisma.workoutPlanExercise.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.workoutPlan.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.recurringTransaction.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  console.log('✅ Banco de dados limpo com sucesso.');
  console.log('👤 Criando usuário de demonstração...');
  const saltRounds = 12;
  const passwordHash = await bcrypt.hash('senhaSegura123', saltRounds);
  const demoUser = await prisma.user.create({
    data: {
      name: 'Usuário Demo',
      email: 'demo@secondbrain.com',
      passwordHash,
    },
  });
  const userId = demoUser.id;
  console.log(
    `👤 Usuário criado com ID: ${userId} (Login: demo@secondbrain.com / Senha: senhaSegura123)`,
  );
  console.log('📂 Criando categorias padronizadas...');
  const catSalario = await prisma.category.create({
    data: { name: 'Salário', type: CategoryType.INCOME, userId },
  });
  const catInvestimentos = await prisma.category.create({
    data: { name: 'Investimentos', type: CategoryType.INCOME, userId },
  });
  const catAluguel = await prisma.category.create({
    data: { name: 'Aluguel & Moradia', type: CategoryType.EXPENSE, userId },
  });
  const catSupermercado = await prisma.category.create({
    data: { name: 'Supermercado', type: CategoryType.EXPENSE, userId },
  });
  const catRestaurante = await prisma.category.create({
    data: {
      name: 'Restaurantes & Delivery',
      type: CategoryType.EXPENSE,
      userId,
    },
  });
  const catTransporte = await prisma.category.create({
    data: {
      name: 'Transporte & Combustível',
      type: CategoryType.EXPENSE,
      userId,
    },
  });
  const catAssinatura = await prisma.category.create({
    data: {
      name: 'Assinaturas & Serviços',
      type: CategoryType.EXPENSE,
      userId,
    },
  });
  const catPeito = await prisma.category.create({
    data: { name: 'Peito', type: CategoryType.FITNESS, userId },
  });
  const catCostas = await prisma.category.create({
    data: { name: 'Costas', type: CategoryType.FITNESS, userId },
  });
  const catPernas = await prisma.category.create({
    data: { name: 'Pernas', type: CategoryType.FITNESS, userId },
  });
  const catMembrosSuperiores = await prisma.category.create({
    data: { name: 'Braços & Ombros', type: CategoryType.FITNESS, userId },
  });
  console.log('✅ Categorias criadas.');
  console.log('🔄 Criando agendamentos recorrentes...');
  const hoje = new Date();
  const recNetflix = await prisma.recurringTransaction.create({
    data: {
      amount: 55.9,
      description: 'Assinatura Streaming (Netflix)',
      frequency: RecurrenceFrequency.MONTHLY,
      startDate: new Date(hoje.getFullYear(), hoje.getMonth() - 2, 10),
      nextDate: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 10),
      isActive: true,
      paymentMethod: PaymentMethod.CREDIT,
      userId,
      categoryId: catAssinatura.id,
    },
  });
  const recAcademia = await prisma.recurringTransaction.create({
    data: {
      amount: 119.9,
      description: 'Plano Mensal Academia',
      frequency: RecurrenceFrequency.MONTHLY,
      startDate: new Date(hoje.getFullYear(), hoje.getMonth() - 2, 5),
      nextDate: new Date(hoje.getFullYear(), hoje.getMonth() + 1, 5),
      isActive: true,
      paymentMethod: PaymentMethod.DEBIT,
      userId,
      categoryId: catAssinatura.id,
    },
  });
  console.log('💰 Populando histórico de transações financeiras...');
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();
  const transacoesMocks = [
    {
      description: 'Salário Mensal',
      amount: 5200.0,
      date: new Date(anoAtual, mesAtual - 1, 5),
      categoryId: catSalario.id,
      paymentMethod: PaymentMethod.DEBIT,
    },
    {
      description: 'Aluguel Apartamento',
      amount: 1800.0,
      date: new Date(anoAtual, mesAtual - 1, 10),
      categoryId: catAluguel.id,
      paymentMethod: PaymentMethod.DEBIT,
    },
    {
      description: '[Recorrente] Assinatura Streaming (Netflix)',
      amount: 55.9,
      date: new Date(anoAtual, mesAtual - 1, 10),
      categoryId: catAssinatura.id,
      paymentMethod: PaymentMethod.CREDIT,
      recurringTransactionId: recNetflix.id,
    },
    {
      description: '[Recorrente] Plano Mensal Academia',
      amount: 119.9,
      date: new Date(anoAtual, mesAtual - 1, 5),
      categoryId: catAssinatura.id,
      paymentMethod: PaymentMethod.DEBIT,
      recurringTransactionId: recAcademia.id,
    },
  ];
  for (const t of transacoesMocks) {
    await prisma.transaction.create({
      data: {
        description: t.description,
        amount: t.amount,
        date: t.date,
        userId,
        categoryId: t.categoryId,
        paymentMethod: t.paymentMethod,
        recurringTransactionId: t.recurringTransactionId || null,
      },
    });
  }
  console.log('🏋️ Criando fichas e biblioteca de exercícios...');
  const planoA = await prisma.workoutPlan.create({
    data: { name: 'Treino A - Peito & Tríceps', userId },
  });
  const planoB = await prisma.workoutPlan.create({
    data: { name: 'Treino B - Costas & Bíceps', userId },
  });
  const exSupino = await prisma.exercise.create({
    data: { name: 'Supino Reto com Barra', categoryId: catPeito.id, userId },
  });
  const exCrossOver = await prisma.exercise.create({
    data: { name: 'Crossover Polia Média', categoryId: catPeito.id, userId },
  });
  const exTricepsPulley = await prisma.exercise.create({
    data: {
      name: 'Tríceps Pulley (Corda)',
      categoryId: catMembrosSuperiores.id,
      userId,
    },
  });
  const exPuxadaAlta = await prisma.exercise.create({
    data: { name: 'Puxada Alta Pronada', categoryId: catCostas.id, userId },
  });
  const exRemadaBaixa = await prisma.exercise.create({
    data: { name: 'Remada Baixa Triângulo', categoryId: catCostas.id, userId },
  });
  const exRoscaDireta = await prisma.exercise.create({
    data: {
      name: 'Rosca Direta com Barra W',
      categoryId: catMembrosSuperiores.id,
      userId,
    },
  });
  await prisma.workoutPlanExercise.createMany({
    data: [
      { workoutPlanId: planoA.id, exerciseId: exSupino.id, targetSets: 4, targetMinReps: 8, targetMaxReps: 12 },
      { workoutPlanId: planoA.id, exerciseId: exCrossOver.id, targetSets: 3, targetMinReps: 10, targetMaxReps: 12 },
      { workoutPlanId: planoA.id, exerciseId: exTricepsPulley.id, targetSets: 3, targetMinReps: 12, targetMaxReps: 15 },
      { workoutPlanId: planoB.id, exerciseId: exPuxadaAlta.id, targetSets: 4, targetMinReps: 8, targetMaxReps: 12 },
      { workoutPlanId: planoB.id, exerciseId: exRemadaBaixa.id, targetSets: 3, targetMinReps: 10, targetMaxReps: 12 },
      { workoutPlanId: planoB.id, exerciseId: exRoscaDireta.id, targetSets: 3, targetMinReps: 10, targetMaxReps: 12 },
    ],
  });
  const sessao1 = await prisma.workoutSession.create({
    data: {
      workoutPlanId: planoA.id,
      userId,
      startedAt: new Date(anoAtual, mesAtual, hoje.getDate() - 2, 18, 0, 0),
      finishedAt: new Date(anoAtual, mesAtual, hoje.getDate() - 2, 19, 5, 0),
    },
  });
  await prisma.setLog.createMany({
    data: [
      { workoutSessionId: sessao1.id, exerciseId: exSupino.id, reps: 12, weight: 50.0, toFailure: false },
      { workoutSessionId: sessao1.id, exerciseId: exSupino.id, reps: 10, weight: 60.0, toFailure: true },
      { workoutSessionId: sessao1.id, exerciseId: exCrossOver.id, reps: 12, weight: 15.0, toFailure: false },
      { workoutSessionId: sessao1.id, exerciseId: exTricepsPulley.id, reps: 15, weight: 20.0, toFailure: false },
    ],
  });
  console.log('📋 Cadastrando tarefas de demonstração...');
  await prisma.task.createMany({
    data: [
      {
        title: 'Preparar marmitas da semana',
        description: 'Cozinhar frango, arroz e legumes para as refeições de segunda a sexta',
        priority: TaskPriority.HIGH,
        status: TaskStatus.DONE,
        userId,
      },
      {
        title: 'Revisar plano de treino de hipertrofia',
        description: 'Ajustar volume de séries e progressão de cargas para o próximo ciclo',
        priority: TaskPriority.MEDIUM,
        status: TaskStatus.IN_PROGRESS,
        userId,
      },
      {
        title: 'Realizar pesagem em jejum aos sábados',
        description: 'Registrar peso matinal e atualizar estatísticas no painel',
        priority: TaskPriority.LOW,
        status: TaskStatus.TODO,
        userId,
      },
    ],
  });
  console.log('🥗 Cadastrando biblioteca de alimentos globais...');
  const foodFrango = await prisma.food.create({
    data: {
      name: 'Peito de Frango Grelhado',
      brand: 'Sadia',
      servingSize: 100,
      servingUnit: ServingUnit.GRAM,
      calories: 165.0,
      protein: 31.0,
      carbs: 0.0,
      fat: 3.6,
      fiber: 0.0,
      userId: null,
    },
  });
  const foodArroz = await prisma.food.create({
    data: {
      name: 'Arroz Branco Cozido',
      brand: 'Tio João',
      servingSize: 100,
      servingUnit: ServingUnit.GRAM,
      calories: 130.0,
      protein: 2.5,
      carbs: 28.2,
      fat: 0.3,
      fiber: 0.4,
      userId: null,
    },
  });
  const foodOvo = await prisma.food.create({
    data: {
      name: 'Ovo de Galinha Cozido',
      brand: 'Mantiqueira',
      servingSize: 50,
      servingUnit: ServingUnit.UNIT,
      calories: 72.0,
      protein: 6.3,
      carbs: 0.4,
      fat: 4.8,
      fiber: 0.0,
      userId: null,
    },
  });
  const foodBanana = await prisma.food.create({
    data: {
      name: 'Banana Prata',
      brand: null,
      servingSize: 100,
      servingUnit: ServingUnit.UNIT,
      calories: 89.0,
      protein: 1.1,
      carbs: 22.8,
      fat: 0.3,
      fiber: 2.6,
      userId: null,
    },
  });
  const foodAveia = await prisma.food.create({
    data: {
      name: 'Aveia em Flocos Finos',
      brand: 'Quaker',
      servingSize: 30,
      servingUnit: ServingUnit.GRAM,
      calories: 118.0,
      protein: 4.2,
      carbs: 20.0,
      fat: 2.6,
      fiber: 2.7,
      userId: null,
    },
  });
  const foodAzeite = await prisma.food.create({
    data: {
      name: 'Azeite de Oliva Extra Virgem',
      brand: 'Gallo',
      servingSize: 13,
      servingUnit: ServingUnit.TABLESPOON,
      calories: 108.0,
      protein: 0.0,
      carbs: 0.0,
      fat: 12.0,
      fiber: 0.0,
      userId: null,
    },
  });
  const foodWhey = await prisma.food.create({
    data: {
      name: '100% Whey Protein Concentrado',
      brand: 'Growth Supplements',
      servingSize: 30,
      servingUnit: ServingUnit.SCOOP,
      calories: 120.0,
      protein: 24.0,
      carbs: 3.0,
      fat: 1.5,
      fiber: 0.0,
      userId: null,
    },
  });
  const foodFeijao = await prisma.food.create({
    data: {
      name: 'Feijão Preto Cozido',
      brand: 'Camil',
      servingSize: 100,
      servingUnit: ServingUnit.GRAM,
      calories: 77.0,
      protein: 4.5,
      carbs: 14.0,
      fat: 0.5,
      fiber: 4.4,
      userId: null,
    },
  });
  const foodMaca = await prisma.food.create({
    data: {
      name: 'Maçã Fuji Fresca',
      brand: null,
      servingSize: 100,
      servingUnit: ServingUnit.UNIT,
      calories: 52.0,
      protein: 0.3,
      carbs: 13.8,
      fat: 0.2,
      fiber: 2.4,
      userId: null,
    },
  });
  const foodPaoIntegral = await prisma.food.create({
    data: {
      name: 'Pão 100% Integral Tradicional',
      brand: 'Wickbold',
      servingSize: 50,
      servingUnit: ServingUnit.UNIT,
      calories: 120.0,
      protein: 4.5,
      carbs: 22.0,
      fat: 1.5,
      fiber: 3.5,
      userId: null,
    },
  });
  const foodPatinho = await prisma.food.create({
    data: {
      name: 'Patinho Moído Grelhado',
      brand: 'Friboi',
      servingSize: 100,
      servingUnit: ServingUnit.GRAM,
      calories: 219.0,
      protein: 35.9,
      carbs: 0.0,
      fat: 7.3,
      fiber: 0.0,
      userId: null,
    },
  });
  const foodBatataDoce = await prisma.food.create({
    data: {
      name: 'Batata Doce Cozida',
      brand: null,
      servingSize: 100,
      servingUnit: ServingUnit.GRAM,
      calories: 86.0,
      protein: 1.6,
      carbs: 20.1,
      fat: 0.1,
      fiber: 3.0,
      userId: null,
    },
  });
  console.log('✅ 12 alimentos globais cadastrados com sucesso.');
  console.log('🎯 Configurando meta nutricional para o usuário demo...');
  await prisma.nutritionGoal.create({
    data: {
      userId,
      targetCalories: 2000.0,
      targetProtein: 160.0,
      targetCarbs: 220.0,
      targetFat: 60.0,
      targetFiber: 28.0,
      targetWeight: 75.0,
    },
  });
  console.log('✅ Meta nutricional registrada (2000 kcal | 160g P | 220g C | 60g G | 75.0 kg alvo).');
  console.log('⚖️ Gerando histórico de 30 dias de pesagens com evolução gradual...');
  const weightLogsData: Prisma.WeightLogCreateManyInput[] = [];
  const baseWeight = 81.5;
  for (let i = 29; i >= 0; i--) {
    const logDate = new Date(hoje);
    logDate.setDate(hoje.getDate() - i);
    logDate.setHours(7, 30, 0, 0);
    const progress = (29 - i) / 29;
    const trendWeight = baseWeight - progress * 3.5;
    const fluctuation = (((i * 7) % 5) - 2) * 0.08;
    const dayWeight = Math.round((trendWeight + fluctuation) * 100) / 100;
    let notes: string | null = null;
    if (i === 29) notes = 'Início do acompanhamento e novo protocolo';
    if (i === 15) notes = 'Pesagem quinzenal após reajuste calórico';
    if (i === 0) notes = 'Pesagem matinal em jejum';
    weightLogsData.push({
      userId,
      weight: dayWeight,
      date: logDate,
      notes,
    });
  }
  await prisma.weightLog.createMany({
    data: weightLogsData,
  });
  console.log('✅ 30 registros de pesagem gerados com sucesso.');
  console.log('🍽️ Registrando refeições diárias e snapshots calculados...');
  const todayOnlyDate = new Date(
    Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()),
  );
  const breakfast = await prisma.mealLog.create({
    data: {
      userId,
      date: todayOnlyDate,
      mealType: MealType.BREAKFAST,
      notes: 'Café da manhã reforçado pré-treino',
    },
  });
  const ovoFactor = 100 / 50;
  const paoFactor = 50 / 50;
  const bananaFactor = 100 / 100;
  const wheyFactor = 30 / 30;
  await prisma.mealFoodItem.createMany({
    data: [
      {
        mealLogId: breakfast.id,
        foodId: foodOvo.id,
        quantity: 100.0,
        consumedCalories: Number(foodOvo.calories) * ovoFactor,
        consumedProtein: Number(foodOvo.protein) * ovoFactor,
        consumedCarbs: Number(foodOvo.carbs) * ovoFactor,
        consumedFat: Number(foodOvo.fat) * ovoFactor,
        consumedFiber: Number(foodOvo.fiber || 0) * ovoFactor,
      },
      {
        mealLogId: breakfast.id,
        foodId: foodPaoIntegral.id,
        quantity: 50.0,
        consumedCalories: Number(foodPaoIntegral.calories) * paoFactor,
        consumedProtein: Number(foodPaoIntegral.protein) * paoFactor,
        consumedCarbs: Number(foodPaoIntegral.carbs) * paoFactor,
        consumedFat: Number(foodPaoIntegral.fat) * paoFactor,
        consumedFiber: Number(foodPaoIntegral.fiber || 0) * paoFactor,
      },
      {
        mealLogId: breakfast.id,
        foodId: foodBanana.id,
        quantity: 100.0,
        consumedCalories: Number(foodBanana.calories) * bananaFactor,
        consumedProtein: Number(foodBanana.protein) * bananaFactor,
        consumedCarbs: Number(foodBanana.carbs) * bananaFactor,
        consumedFat: Number(foodBanana.fat) * bananaFactor,
        consumedFiber: Number(foodBanana.fiber || 0) * bananaFactor,
      },
      {
        mealLogId: breakfast.id,
        foodId: foodWhey.id,
        quantity: 30.0,
        consumedCalories: Number(foodWhey.calories) * wheyFactor,
        consumedProtein: Number(foodWhey.protein) * wheyFactor,
        consumedCarbs: Number(foodWhey.carbs) * wheyFactor,
        consumedFat: Number(foodWhey.fat) * wheyFactor,
        consumedFiber: Number(foodWhey.fiber || 0) * wheyFactor,
      },
    ],
  });
  const lunch = await prisma.mealLog.create({
    data: {
      userId,
      date: todayOnlyDate,
      mealType: MealType.LUNCH,
      notes: 'Almoço equilibrado pós-treino',
    },
  });
  const frangoFactor = 180 / 100;
  const arrozFactor = 150 / 100;
  const feijaoFactor = 100 / 100;
  const azeiteFactor = 13 / 13;
  await prisma.mealFoodItem.createMany({
    data: [
      {
        mealLogId: lunch.id,
        foodId: foodFrango.id,
        quantity: 180.0,
        consumedCalories: Number(foodFrango.calories) * frangoFactor,
        consumedProtein: Number(foodFrango.protein) * frangoFactor,
        consumedCarbs: Number(foodFrango.carbs) * frangoFactor,
        consumedFat: Number(foodFrango.fat) * frangoFactor,
        consumedFiber: Number(foodFrango.fiber || 0) * frangoFactor,
      },
      {
        mealLogId: lunch.id,
        foodId: foodArroz.id,
        quantity: 150.0,
        consumedCalories: Number(foodArroz.calories) * arrozFactor,
        consumedProtein: Number(foodArroz.protein) * arrozFactor,
        consumedCarbs: Number(foodArroz.carbs) * arrozFactor,
        consumedFat: Number(foodArroz.fat) * arrozFactor,
        consumedFiber: Number(foodArroz.fiber || 0) * arrozFactor,
      },
      {
        mealLogId: lunch.id,
        foodId: foodFeijao.id,
        quantity: 100.0,
        consumedCalories: Number(foodFeijao.calories) * feijaoFactor,
        consumedProtein: Number(foodFeijao.protein) * feijaoFactor,
        consumedCarbs: Number(foodFeijao.carbs) * feijaoFactor,
        consumedFat: Number(foodFeijao.fat) * feijaoFactor,
        consumedFiber: Number(foodFeijao.fiber || 0) * feijaoFactor,
      },
      {
        mealLogId: lunch.id,
        foodId: foodAzeite.id,
        quantity: 13.0,
        consumedCalories: Number(foodAzeite.calories) * azeiteFactor,
        consumedProtein: Number(foodAzeite.protein) * azeiteFactor,
        consumedCarbs: Number(foodAzeite.carbs) * azeiteFactor,
        consumedFat: Number(foodAzeite.fat) * azeiteFactor,
        consumedFiber: Number(foodAzeite.fiber || 0) * azeiteFactor,
      },
    ],
  });
  console.log('✅ Refeições e snapshots nutricionais gravados com sucesso.');
  console.log('\n🚀 Seeding completo. Todos os módulos estão populados e prontos!');
}
main()
  .catch((e) => {
    console.error('❌ Erro durante o processo de seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
