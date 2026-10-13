import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the location dropdown', () => {
  render(<App />);
  expect(screen.getByLabelText(/location/i)).toBeInTheDocument();
});
