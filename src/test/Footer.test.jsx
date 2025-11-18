import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Footer from '../components/Footer';

const MockFooter = ({ currentLanguage }) => (
  <BrowserRouter>
    <Footer currentLanguage={currentLanguage} />
  </BrowserRouter>
);

describe('Footer', () => {
  test('renders footer with language switcher', () => {
    render(<MockFooter currentLanguage="en" />);
    
    // Check if footer is rendered
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
  });

  test('renders edit history button', () => {
    render(<MockFooter currentLanguage="en" />);
    
    const historyButton = screen.getByRole('button', { name: /history/i });
    expect(historyButton).toBeInTheDocument();
  });
});