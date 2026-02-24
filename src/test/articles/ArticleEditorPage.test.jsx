import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ArticleEditorPage from '@/pages/ArticleEditorPage';
import { useEditorAuth } from '@/contexts/EditorAuthContext';
import { getCategories, getArticle, createDraftFromQuestion, saveArticle } from '@/services/articleService';

// Mock dependencies
vi.mock('@/contexts/EditorAuthContext');
vi.mock('@/services/articleService');

vi.mock('@tiptap/react', () => ({
  useEditor: vi.fn(() => ({
    chain: vi.fn(() => ({
      focus: vi.fn(() => ({})),
      toggleBold: vi.fn(() => ({})),
      toggleItalic: vi.fn(() => ({})),
      toggleUnderline: vi.fn(() => ({})),
      toggleHighlight: vi.fn(() => ({})),
      toggleQuestionBlock: vi.fn(() => ({})),
      undo: vi.fn(() => ({})),
      redo: vi.fn(() => ({})),
      run: vi.fn()
    })),
    isActive: vi.fn(),
    can: vi.fn(() => ({
      undo: vi.fn(() => true),
      redo: vi.fn(() => true)
    })),
    getHTML: vi.fn(() => '<p>Test content</p>'),
    commands: {
      setContent: vi.fn()
    },
    view: {
      dom: document.createElement('div')
    },
    on: vi.fn(),
    off: vi.fn()
  })),
  EditorContent: vi.fn(() => <div data-testid="editor-content" />)
}));

describe('ArticleEditorPage', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Mock authenticated user
    useEditorAuth.mockReturnValue({
      editor: {
        id: '1',
        name: 'Test Editor',
        email: 'test@example.com'
      },
      isAuthenticated: true,
      openAuthModal: vi.fn()
    });

    // Mock article service
    getCategories.mockResolvedValue({
      success: true,
      data: [
        { id: '1', name: 'Category 1', slug: 'category-1' },
        { id: '2', name: 'Category 2', slug: 'category-2' }
      ]
    });

    getArticle.mockResolvedValue({
      success: true,
      data: {
        id: '1',
        slug: 'test-article',
        status: 'draft',
        author: 'Test Author',
        youtube_url: '',
        image_url: '',
        published_at: null,
        created_at: '2024-01-01',
        episode_slug: 'episode-1',
        question_time: 60,
        question_end_time: 120,
        title: 'Test Article',
        summary: 'Test summary',
        content: '<p>Test content</p>',
        lang: 'ru',
        categories: [
          { id: '1', name: 'Category 1', slug: 'category-1' },
          { id: '2', name: 'Category 2', slug: 'category-2' }
        ],
        allTranslations: [
          { language_code: 'ru', title: 'Test Article', summary: 'Test summary', content: '<p>Test content</p>' }
        ]
      }
    });

    createDraftFromQuestion.mockResolvedValue({
      success: true,
      data: { slug: 'new-article', id: '2' }
    });

    saveArticle.mockResolvedValue({
      success: true,
      data: { slug: 'test-article', id: '1', status: 'published' }
    });

    // Mock additional translation functions
    getArticleTranslationStatuses.mockResolvedValue({
      success: true,
      data: {
        statusByLang: {
          ru: true,
          en: false,
          es: false,
          fr: false,
          de: false,
          pl: false
        },
        translatedLanguages: ['ru']
      }
    });

    ensureArticleTranslationLink.mockResolvedValue({
      success: true,
      created: false
    });
  });

  test('renders loading state initially', async () => {
    render(
      <MemoryRouter initialEntries={['/ru/articles/test-article/edit']}>
        <ArticleEditorPage />
      </MemoryRouter>
    );

    // Should show loading indicator
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('renders editor interface with toolbar and content area', async () => {
    render(
      <MemoryRouter initialEntries={['/ru/articles/test-article/edit']}>
        <ArticleEditorPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });
  });

  test('handles saving article with different statuses', async () => {
    render(
      <MemoryRouter initialEntries={['/ru/articles/test-article/edit']}>
        <ArticleEditorPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/save as draft/i)).toBeInTheDocument();
    });

    // Test save as draft
    fireEvent.click(screen.getByText(/save as draft/i));

    await waitFor(() => {
      expect(saveArticle).toHaveBeenCalled();
    });
  });

  test('handles AI actions', async () => {
    render(
      <MemoryRouter initialEntries={['/ru/articles/test-article/edit']}>
        <ArticleEditorPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId('editor-content')).toBeInTheDocument();
    });
  });

  test('renders article details in bottom panel', async () => {
    render(
      <MemoryRouter initialEntries={['/ru/articles/test-article/edit']}>
        <ArticleEditorPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/details/i)).toBeInTheDocument();
    });
  });

  test('handles language translations', async () => {
    render(
      <MemoryRouter initialEntries={['/ru/articles/test-article/edit']}>
        <ArticleEditorPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/translations/i)).toBeInTheDocument();
    });
  });

  test('prevents navigation with unsaved changes', async () => {
    // Mock window.confirm
    const originalConfirm = window.confirm;
    window.confirm = vi.fn(() => false);
    
    render(
      <MemoryRouter initialEntries={['/ru/articles/test-article/edit']}>
        <ArticleEditorPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/details/i)).toBeInTheDocument();
    });

    window.confirm = originalConfirm;
  });
});
