import { clientNode } from './client-node.js';

describe('clientNode', () => {
  it('should work', () => {
    expect(clientNode()).toEqual('client-node');
  });
});
