import { createClient } from 'redis';
import { delay } from 'bluebird';
import { HATimer } from '../index';
import { asyncHelper } from '../test-util';

describe('HATimer Integration', () => {
  if (!process.env.REDIS_HOST) {
    pending('Require running Redis host and REDIS_HOST, REDIS_PORT environment variable');
  }
  const redisClient = createClient(process.env.REDIS_PORT || 6379, process.env.REDIS_HOST)
  let timer: HATimer;

  beforeEach(asyncHelper(async () => {
    timer = new HATimer({
      queue: 'test-integration',
      idlePullDelay: 10
    });
    timer.install(redisClient);
    await delay(100);
  }));

  afterEach(asyncHelper(async () => {
    timer.uninstall();
    await redisClient.flushdbAsync();
  }));

  it('should deliver an event', asyncHelper(async () => {
    const arg = {bar: 1};
    const spy = jasmine.createSpy('handler');
    timer.registerHandler('foo', spy);
    await timer.addEvent('foo', arg, 0);
    await delay(50);
    expect(spy).toHaveBeenCalledWith(arg);
  }));

  it('should deliever after some delay', asyncHelper(async () => {
    const spy = jasmine.createSpy('handler');
    timer.registerHandler('foo', spy);
    await timer.addEvent('foo', null, '20ms');
    await timer.addEvent('foo', null, '20ms');
    await delay(50);
    expect(spy).toHaveBeenCalledTimes(2);
  }));
  
  it('should purge all event', asyncHelper(async () => {
    const spyFoo = jasmine.createSpy('handler');
    const spyBar = jasmine.createSpy('handler');
    timer.registerHandler('foo', spyFoo);
    timer.registerHandler('bar', spyBar);
    await timer.addEvent('foo', null, 10);
    await timer.addEvent('bar', null, 10);
    await timer.purge();
    await delay(50);
    expect(spyFoo).not.toHaveBeenCalled();
    expect(spyBar).not.toHaveBeenCalled();
  }));
});