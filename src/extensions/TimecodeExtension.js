import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const TimecodeExtension = Extension.create({
  name: 'timecode',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('timecode'),
        state: {
          init(_, { doc }) {
            return getDecorations(doc);
          },
          apply(tr, old) {
            return tr.docChanged ? getDecorations(tr.doc) : old.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations(state) {
            return this.getState(state);
          },
        },
      }),
    ];
  },
});

function getDecorations(doc) {
  const decorations = [];
  const regex = /\[\d+:\d{2}\]/g;

  doc.descendants((node, pos) => {
    if (!node.isText) {
      return;
    }

    const text = node.text;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const start = pos + match.index;
      const end = start + match[0].length;
      decorations.push(
        Decoration.inline(start, end, {
          class: 'tc-link',
          nodeName: 'span',
        })
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}

export default TimecodeExtension;
