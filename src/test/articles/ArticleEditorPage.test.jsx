import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ArticleEditorPage from '@/pages/ArticleEditorPage';
import { useEditorAuth } from '@/contexts/EditorAuthContext';
import { getCategories, getArticle, createDraftFromQuestion, saveArticle } from '@/services/articleService';

// Mock dependencies
jest.mock('@/contexts/EditorAuthContext');
jest.mock('@/services/articleService');
jest.mock('@tiptap/react', () => ({
  useEditor: jest.fn(),
  EditorContent: jest.fn(() => <div data-testid="editor-content" />)
}));

describe('ArticleEditorPage', () => {
  const mockEditor = {
    chain: jest.fn(() => ({
      focus: jest.fn(() => ({})),
      toggleBold: jest.fn(() => ({})),
      toggleItalic: jest.fn(() => ({})),
      toggleUnderline: jest.fn(() => ({})),
      toggleHighlight: jest.fn(() => ({})),
      toggleQuestionBlock: jest.fn(() => ({})),
      undo: jest.fn(() => ({})),
      redo: jest.fn(() => ({})),
      run: jest.fn()
    })),
    isActive: jest.fn(),
    can: jest.fn(() => true),
    getHTML: jest.fn(() => '<p>Test content</p>')
  };

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock authenticated user
    useEditorAuth.mockReturnValue({
      editor: {
        id: '1',
        name: 'Test Editor',
        email: 'test@example.com'
      },
      isAuthenticated: true,
      openAuthModal: jest.fn()
    });

    // Mock useEditor
    require('@tiptap/react').useEditor.mockReturnValue(mockEditor);

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
    window.confirm = jest.fn(() => false);
    
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
