import { transformerNotationWordHighlight } from '@shikijs/transformers';

export default {
  shiki: {
    transformers: [transformerNotationWordHighlight()],
  },
};
