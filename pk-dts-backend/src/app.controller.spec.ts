import { AppController } from './app.controller';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(() => {
    controller = new AppController();
  });

  it('returns the v1 health payload', () => {
    expect(controller.health()).toEqual({
      name: 'Document Tracking System API',
      status: 'ok',
      version: 'v1',
    });
  });
});
