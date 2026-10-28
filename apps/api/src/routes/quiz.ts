import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AppError } from '../utils/errors';
import { generateQuiz } from '../services/ai';

const createQuizSchema = z.object({
  contentItemId: z.string().uuid(),
  questionCount: z.number().int().positive().max(20).default(5),
});

const submitQuizSchema = z.object({
  quizId: z.string().uuid(),
  answers: z.array(z.object({
    questionId: z.string(),
    answer: z.union([z.string(), z.array(z.string())]),
    timeSpent: z.number().int().positive(),
  })),
});

export async function quizRoutes(app: FastifyInstance) {
  // Create quiz
  app.post('/', {
    schema: {
      body: createQuizSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof createQuizSchema>;
    const userId = request.user!.id;
    
    const contentItem = await app.prisma.contentItem.findFirst({
      where: { id: data.contentItemId, userId },
    });
    
    if (!contentItem) {
      throw AppError.notFound('Content item not found');
    }
    
    if (!contentItem.summary && !contentItem.rawContent) {
      throw AppError.badRequest('Content must have summary or raw content to generate quiz');
    }
    
    const content = contentItem.summary || contentItem.rawContent || '';
    
    // Generate quiz questions
    const result = await generateQuiz(content, contentItem.title, data.questionCount);
    
    const quiz = await app.prisma.quiz.create({
      data: {
        userId,
        contentItemId: data.contentItemId,
        title: `Quiz: ${contentItem.title}`,
        questions: result.questions || [],
        schedule: {
          algorithm: 'sm2',
          interval: 1,
          easeFactor: 2.5,
          repetitions: 0,
          nextReviewAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
      },
    });
    
    // Create review card
    await app.prisma.reviewCard.create({
      data: {
        userId,
        contentItemId: data.contentItemId,
        quizId: quiz.id,
        schedule: quiz.schedule as any,
        state: 'NEW',
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
    
    return reply.status(201).send({
      success: true,
      data: quiz,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    });
  });

  // Get quizzes
  app.get('/', async (request, reply) => {
    const userId = request.user!.id;
    const { contentItemId } = request.query as { contentItemId?: string };
    
    const where: any = { userId };
    if (contentItemId) where.contentItemId = contentItemId;
    
    const quizzes = await app.prisma.quiz.findMany({
      where,
      include: {
        _count: { select: { attempts: true } },
        contentItem: { select: { id: true, title: true, sourceType: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    return {
      success: true,
      data: quizzes,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Get quiz
  app.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = request.user!.id;
    
    const quiz = await app.prisma.quiz.findFirst({
      where: { id, userId },
      include: {
        contentItem: { select: { id: true, title: true, sourceType: true } },
        attempts: { orderBy: { completedAt: 'desc' }, take: 5 },
      },
    });
    
    if (!quiz) {
      throw AppError.notFound('Quiz not found');
    }
    
    return {
      success: true,
      data: quiz,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Submit quiz attempt
  app.post('/attempts', {
    schema: {
      body: submitQuizSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof submitQuizSchema>;
    const userId = request.user!.id;
    
    const quiz = await app.prisma.quiz.findFirst({
      where: { id: data.quizId, userId },
    });
    
    if (!quiz) {
      throw AppError.notFound('Quiz not found');
    }
    
    const questions = quiz.questions as any[];
    let correct = 0;
    const totalTime = data.answers.reduce((sum, a) => sum + a.timeSpent, 0);
    
    const gradedAnswers = data.answers.map(answer => {
      const question = questions.find(q => q.id === answer.questionId);
      if (!question) return { ...answer, isCorrect: false };
      
      const isCorrect = Array.isArray(question.correctAnswer)
        ? JSON.stringify(question.correctAnswer.sort()) === JSON.stringify((answer.answer as string[]).sort())
        : question.correctAnswer === answer.answer;
      
      if (isCorrect) correct++;
      return { ...answer, isCorrect };
    });
    
    const score = (correct / questions.length) * 100;
    
    const attempt = await app.prisma.quizAttempt.create({
      data: {
        quizId: data.quizId,
        userId,
        answers: gradedAnswers as any,
        score,
        timeSpent: totalTime,
      },
    });
    
    // Update review card schedule based on performance
    const reviewCard = await app.prisma.reviewCard.findFirst({
      where: { quizId: data.quizId, userId },
    });
    
    if (reviewCard) {
      const schedule = reviewCard.schedule as any;
      const quality = score >= 80 ? 5 : score >= 60 ? 4 : score >= 40 ? 3 : score >= 20 ? 2 : 1;
      
      // Simple SM-2 algorithm
      let { interval, easeFactor, repetitions } = schedule;
      if (quality >= 3) {
        if (repetitions === 0) interval = 1;
        else if (repetitions === 1) interval = 6;
        else interval = Math.round(interval * easeFactor);
        repetitions++;
      } else {
        repetitions = 0;
        interval = 1;
      }
      easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
      
      const nextReviewAt = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);
      
      await app.prisma.reviewCard.update({
        where: { id: reviewCard.id },
        data: {
          schedule: { ...schedule, interval, easeFactor, repetitions, nextReviewAt: nextReviewAt.toISOString() },
          state: quality >= 3 ? 'REVIEW' : 'RELEARNING',
          dueAt: nextReviewAt,
        },
      });
    }
    
    return {
      success: true,
      data: {
        attempt,
        score,
        correct,
        total: questions.length,
        feedback: gradedAnswers.map((a, i) => ({
          question: questions[i].question,
          yourAnswer: a.answer,
          correctAnswer: questions[i].correctAnswer,
          isCorrect: a.isCorrect,
          explanation: questions[i].explanation,
        })),
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });

  // Get due reviews
  app.get('/reviews/due', async (request, reply) => {
    const userId = request.user!.id;
    
    const dueCards = await app.prisma.reviewCard.findMany({
      where: {
        userId,
        dueAt: { lte: new Date() },
        state: { in: ['NEW', 'LEARNING', 'REVIEW', 'RELEARNING'] },
      },
      include: {
        contentItem: { select: { id: true, title: true, sourceType: true } },
        quiz: { select: { id: true, title: true, questions: true } },
      },
      orderBy: { dueAt: 'asc' },
      take: 20,
    });
    
    return {
      success: true,
      data: dueCards,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        version: '1.0.0',
      },
    };
  });
}