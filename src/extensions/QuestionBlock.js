import { Node, mergeAttributes } from '@tiptap/core';

/**
 * QuestionBlock — custom TipTap node for highlighting questions in articles.
 * Renders as <div class="question-block"> with nested content.
 * Toggle via toolbar or keyboard shortcut.
 */
const QuestionBlock = Node.create({
  name: 'questionBlock',

  group: 'block',

  content: 'block+',

  defining: true,

  parseHTML() {
    return [
      { tag: 'div.question-block' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'question-block' }), 0];
  },

  addCommands() {
    return {
      toggleQuestionBlock: () => ({ commands }) => {
        return commands.toggleWrap(this.name);
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Shift-q': () => this.editor.commands.toggleQuestionBlock(),
    };
  },
});

export default QuestionBlock;
