import { render, screen } from '@testing-library/react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import Footer from '../components/Footer';

const MockFooter = ({ currentLanguage }) => (
  <BrowserRouter>
    <Footer currentLanguage={currentLanguage} />
  </BrowserRouter>
);

const MockFooterWithRoute = ({ currentLanguage, initialEntries }) => (
  <MemoryRouter initialEntries={initialEntries}>
    <Footer currentLanguage={currentLanguage} />
  </MemoryRouter>
);

describe('Footer', () => {
  test('renders footer with language switcher', () => {
    render(<MockFooter currentLanguage="en" />);
    
    // Check if footer is rendered
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
  });

  test('renders edit history button on radio pages', () => {
    // The history button only renders on pages with /episodes or /episode/ in the path
    render(<MockFooterWithRoute currentLanguage="en" initialEntries={['/en/episodes']} />);
    
    const historyButton = screen.getByRole('button', { name: /history/i });
    expect(historyButton).toBeInTheDocument();
  });

  test('does not render edit history button on non-radio pages', () => {
    render(<MockFooterWithRoute currentLanguage="en" initialEntries={['/en/about']} />);
    
    const historyButton = screen.queryByRole('button', { name: /history/i });
    expect(historyButton).not.toBeInTheDocument();
  });
});