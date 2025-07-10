

// inventoryController.test.js
// Automated tests for inventoryController.js endpoints (ESM, dynamic import for Jest ESM compatibility)



let request, app;
// Create controller mocks for all methods used in tests
const controllerMocks = {
  addInventory: vi.fn(),
  getInventory: vi.fn(),
  updateInventory: vi.fn(),
  batchUpdateInventory: vi.fn(),
  listWarehouses: vi.fn(),
  transferStock: vi.fn(),
  addBatchOrSerial: vi.fn(),
  getStockMovementHistory: vi.fn(),
  getLowStockAlerts: vi.fn(),
  getExpiringProducts: vi.fn(),
  // Add missing controller methods used by routes
  listRegisters: vi.fn(),
  createRegister: vi.fn(),
  syncSales: vi.fn(),
  syncInventory: vi.fn(),
  // Add more as needed if you see similar errors
};



beforeAll(async () => {
  // Mock PrismaClient for all modules that import it
  vi.mock('@prisma/client', () => ({
    PrismaClient: class {
      constructor() {
        this.$connect = vi.fn();
        this.$disconnect = vi.fn();
        this.$transaction = vi.fn((cb) => cb());
      }
    }
  }));

  // Mock the controller module BEFORE importing the app
  vi.mock('../controllers/inventoryController.js', () => ({
    ...controllerMocks,
    default: controllerMocks,
  }));

  vi.mock('../middleware/auth.middleware.js', () => ({
    authenticateToken: (req, res, next) => { req.user = { id: 1, role: 'admin' }; next(); }
  }));
  vi.mock('../middleware/permission.middleware.js', () => ({
    rbac: () => (req, res, next) => next(),
    auditLog: () => (req, res, next) => next(),
  }));

  request = (await import('supertest')).default;
  const appModule = await import('../app.js');
  app = appModule.default || appModule;
});



describe('Inventory Endpoints', () => {
  afterEach(() => {
    Object.values(controllerMocks).forEach(fn => fn.mockReset());
  });

  it('POST /api/inventory should add inventory', async () => {
    controllerMocks.addInventory.mockImplementation((req, res) => res.status(201).json({ success: true }));
    const res = await request(app)
      .post('/api/inventory')
      .send({ productId: '1', quantity: 10, location: 'A' });
    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('GET /api/inventory should get all inventory', async () => {
    controllerMocks.getInventory.mockImplementation((req, res) => res.json([{ id: 1 }]));
    const res = await request(app).get('/api/inventory');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('PUT /api/inventory/:id should update inventory', async () => {
    controllerMocks.updateInventory.mockImplementation((req, res) => res.json({ updated: true }));
    const res = await request(app)
      .put('/api/inventory/1')
      .send({ quantity: 5 });
    expect(res.statusCode).toBe(200);
    expect(res.body.updated).toBe(true);
  });

  it('POST /api/inventory/batch should batch update', async () => {
    controllerMocks.batchUpdateInventory.mockImplementation((req, res) => res.json({ batch: true }));
    const res = await request(app)
      .post('/api/inventory/batch')
      .send([{ productId: '1', quantity: 5 }]);
    expect(res.statusCode).toBe(200);
    expect(res.body.batch).toBe(true);
  });

  it('GET /api/inventory/warehouses should list warehouses', async () => {
    controllerMocks.listWarehouses.mockImplementation((req, res) => res.json([{ id: 1 }]));
    const res = await request(app).get('/api/inventory/warehouses');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/inventory/stock/transfer should transfer stock', async () => {
    controllerMocks.transferStock.mockImplementation((req, res) => res.json({ transferred: true }));
    const res = await request(app)
      .post('/api/inventory/stock/transfer')
      .send({ fromLocation: 'A', toLocation: 'B', productId: '1', quantity: 2 });
    expect(res.statusCode).toBe(200);
    expect(res.body.transferred).toBe(true);
  });

  it('POST /api/inventory/batch-serial should add batch/serial', async () => {
    controllerMocks.addBatchOrSerial.mockImplementation((req, res) => res.json({ batchSerial: true }));
    const res = await request(app)
      .post('/api/inventory/batch-serial')
      .send({ productId: '1', batchNumber: 'B1', serialNumber: 'S1' });
    expect(res.statusCode).toBe(200);
    expect(res.body.batchSerial).toBe(true);
  });

  it('GET /api/inventory/stock/history should get stock movement history', async () => {
    controllerMocks.getStockMovementHistory.mockImplementation((req, res) => res.json([{ id: 1 }]));
    const res = await request(app).get('/api/inventory/stock/history');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/inventory/stock/low should get low stock alerts', async () => {
    controllerMocks.getLowStockAlerts.mockImplementation((req, res) => res.json([{ id: 1 }]));
    const res = await request(app).get('/api/inventory/stock/low');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/inventory/stock/expiring should get expiring product alerts', async () => {
    controllerMocks.getExpiringProducts.mockImplementation((req, res) => res.json([{ id: 1 }]));
    const res = await request(app).get('/api/inventory/stock/expiring');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
