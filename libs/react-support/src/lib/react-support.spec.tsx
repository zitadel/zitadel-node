import { render } from '@testing-library/react';

import ReactSupport from './react-support';

describe('ReactSupport', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<ReactSupport />);
    expect(baseElement).toBeTruthy();
  });
});
