// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('GET /api/tasks', () => {
  test('업무 목록을 배열로 반환한다', async ({ request }) => {
    const res = await request.get('/api/tasks');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

test.describe('POST /api/tasks', () => {
  test('title을 포함해 요청하면 201과 함께 새 업무를 생성한다', async ({ request }) => {
    const res = await request.post('/api/tasks', { data: { title: '보고서 작성' } });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toMatchObject({ title: '보고서 작성', status: 'todo' });
    expect(typeof body.id).toBe('string');
  });

  test('title 없이 요청하면 400을 반환한다', async ({ request }) => {
    const res = await request.post('/api/tasks', { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('공백만 있는 title은 400을 반환한다', async ({ request }) => {
    const res = await request.post('/api/tasks', { data: { title: '   ' } });
    expect(res.status()).toBe(400);
  });
});

test.describe('PATCH /api/tasks/:id', () => {
  test('유효한 status로 변경하면 200과 함께 갱신된 업무를 반환한다', async ({ request }) => {
    const created = await (await request.post('/api/tasks', { data: { title: '상태변경 테스트' } })).json();
    const res = await request.patch(`/api/tasks/${created.id}`, { data: { status: 'doing' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('doing');
  });

  test('유효하지 않은 status 값이면 400을 반환한다', async ({ request }) => {
    const created = await (await request.post('/api/tasks', { data: { title: '잘못된 상태 테스트' } })).json();
    const res = await request.patch(`/api/tasks/${created.id}`, { data: { status: 'invalid_status' } });
    expect(res.status()).toBe(400);
  });

  test('존재하지 않는 id면 404를 반환한다', async ({ request }) => {
    const res = await request.patch('/api/tasks/non-existent-id', { data: { status: 'done' } });
    expect(res.status()).toBe(404);
  });
});

test.describe('DELETE /api/tasks/:id', () => {
  test('존재하는 업무를 삭제하면 204를 반환한다', async ({ request }) => {
    const created = await (await request.post('/api/tasks', { data: { title: '삭제 테스트' } })).json();
    const res = await request.delete(`/api/tasks/${created.id}`);
    expect(res.status()).toBe(204);

    const list = await (await request.get('/api/tasks')).json();
    expect(list.find((t) => t.id === created.id)).toBeUndefined();
  });

  test('존재하지 않는 id를 삭제하면 404를 반환한다', async ({ request }) => {
    const res = await request.delete('/api/tasks/non-existent-id');
    expect(res.status()).toBe(404);
  });
});
