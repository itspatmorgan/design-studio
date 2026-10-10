import type { SystemIntro } from '@/platform/app/data/types';

export default {
  summary: 'A blue shadcn system for a small customer-support dashboard.',
  overview: {
    code: 'Nova with Base UI, blue accents, Manrope typography, small corners, and Lucide icons.',
    curation: {
      stage: 'foundations',
      summary: 'Blue accents and Manrope make Curation Test distinct from Product and Marketing.',
      nextStep: 'Review colors, typography, and corners. Then add the first support-dashboard components.',
      sources: [{ label: 'Chosen shadcn preset', url: 'https://ui.shadcn.com/create?preset=b1Q4Tg' }],
      record: 'curation.md',
    },
  },
} satisfies SystemIntro;
