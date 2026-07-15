const express = require('express');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { randomUUID } = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let tasks = [];

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TaskFlow API',
      version: '1.0.0',
      description: '업무 관리 앱을 위한 CRUD API',
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      schemas: {
        Task: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'a1b2c3' },
            title: { type: 'string', example: '보고서 작성' },
            status: { type: 'string', enum: ['todo', 'doing', 'done'], example: 'todo' },
            createdAt: { type: 'integer', example: 1731650000000 },
          },
        },
        NewTask: {
          type: 'object',
          required: ['title'],
          properties: {
            title: { type: 'string', example: '보고서 작성' },
          },
        },
        StatusUpdate: {
          type: 'object',
          required: ['status'],
          properties: {
            status: { type: 'string', enum: ['todo', 'doing', 'done'], example: 'doing' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
  },
  apis: [__filename],
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @openapi
 * /api/tasks:
 *   get:
 *     summary: 전체 업무 목록 조회
 *     responses:
 *       200:
 *         description: 업무 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 */
app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

/**
 * @openapi
 * /api/tasks:
 *   post:
 *     summary: 새 업무 추가
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NewTask'
 *     responses:
 *       201:
 *         description: 생성된 업무
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: title 누락
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/api/tasks', (req, res) => {
  const { title } = req.body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  const task = {
    id: randomUUID(),
    title: title.trim(),
    status: 'todo',
    createdAt: Date.now(),
  };
  tasks.unshift(task);
  res.status(201).json(task);
});

/**
 * @openapi
 * /api/tasks/{id}:
 *   patch:
 *     summary: 업무 상태 변경
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/StatusUpdate'
 *     responses:
 *       200:
 *         description: 변경된 업무
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: 잘못된 status 값
 *       404:
 *         description: 존재하지 않는 업무
 */
app.patch('/api/tasks/:id', (req, res) => {
  const { status } = req.body || {};
  if (!['todo', 'doing', 'done'].includes(status)) {
    return res.status(400).json({ error: 'invalid status' });
  }
  const task = tasks.find((t) => t.id === req.params.id);
  if (!task) {
    return res.status(404).json({ error: 'task not found' });
  }
  task.status = status;
  res.json(task);
});

/**
 * @openapi
 * /api/tasks/{id}:
 *   delete:
 *     summary: 업무 삭제
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: 삭제 성공
 *       404:
 *         description: 존재하지 않는 업무
 */
app.delete('/api/tasks/:id', (req, res) => {
  const before = tasks.length;
  tasks = tasks.filter((t) => t.id !== req.params.id);
  if (tasks.length === before) {
    return res.status(404).json({ error: 'task not found' });
  }
  res.status(204).send();
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`TaskFlow API listening on http://localhost:${PORT}`);
    console.log(`Swagger docs at http://localhost:${PORT}/api-docs`);
  });
}

module.exports = app;
