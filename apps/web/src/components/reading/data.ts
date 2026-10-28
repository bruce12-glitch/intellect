export type Category = 'All books' | 'Philosophy' | 'AI & Technology' | 'Psychology' | 'Literature' | 'Design';

export interface Book {
  id: string;
  title: string;
  author: string;
  category: Category;
  cover: string;
  color: string;
  price: number;
  readers: number;
  pages: number;
  tag: string;
  description: string;
  question: string;
  notes: string;
}

// Example listings and discussions for the frontend preview, not live inventory.
export const books: Book[] = [
  {
    id: 'creative-act', title: 'The Creative Act', author: 'Rick Rubin', category: 'Design',
    cover: 'creative-act.webp', color: 'peach', price: 349, readers: 28, pages: 432,
    tag: 'Pip’s pick',
    description: 'A thoughtful invitation to notice more, make space for ideas, and approach everyday life as a creative practice.',
    question: 'Is creativity a skill we learn, or a way of paying attention?',
    notes: 'Light pencil notes on noticing, collecting ideas, and finding a creative rhythm. A few favorite passages are marked.',
  },
  {
    id: 'atomic-habits', title: 'Atomic Habits', author: 'James Clear', category: 'Psychology',
    cover: 'atomic-habits.webp', color: 'lavender', price: 249, readers: 46, pages: 320,
    tag: 'Full of good notes',
    description: 'A practical exploration of small changes, thoughtful systems, and the habits that shape our days.',
    question: 'What’s one tiny habit that made a surprisingly big difference?',
    notes: 'Margin notes on habit stacking and environment design, with a reading habit tracker tucked inside.',
  },
  {
    id: 'psychology-money', title: 'The Psychology of Money', author: 'Morgan Housel', category: 'Psychology',
    cover: 'psychology-money.webp', color: 'mint', price: 299, readers: 34, pages: 256,
    tag: 'A community favorite',
    description: 'Short stories about the ways our experiences, expectations, and behavior influence how we think about money.',
    question: 'How much of our idea of “enough” comes from other people?',
    notes: 'A clean copy with a handful of underlined passages. Includes a handwritten reflection on the chapter about enough.',
  },
  {
    id: 'meditations', title: 'Meditations', author: 'Marcus Aurelius', category: 'Philosophy',
    cover: 'meditations.webp', color: 'butter', price: 199, readers: 19, pages: 304,
    tag: 'A slower kind of read',
    description: 'Personal reflections on attention, responsibility, and living well, written nearly two thousand years ago.',
    question: 'What does “focus on what you can control” look like in practice?',
    notes: 'Thoughtful annotations connecting Stoic ideas to everyday situations. Pencil only; the pages are in good condition.',
  },
  {
    id: 'design-everyday', title: 'The Design of Everyday Things', author: 'Don Norman', category: 'Design',
    cover: 'design-everyday.webp', color: 'sky', price: 399, readers: 22, pages: 368,
    tag: 'See the world differently',
    description: 'A curious look at ordinary objects and the design choices that make them delightful or frustrating to use.',
    question: 'Which everyday object would you redesign first, and why?',
    notes: 'Small sketches and notes about doors, switches, and interfaces. An annotated copy for a fellow design enthusiast.',
  },
  {
    id: 'thinking-fast', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', category: 'Psychology',
    cover: 'thinking-fast.webp', color: 'rose', price: 329, readers: 31, pages: 512,
    tag: 'Bring your questions',
    description: 'An exploration of the quick intuitions and slower reasoning that influence our choices and judgments.',
    question: 'When has your first impression turned out to be completely wrong?',
    notes: 'A well-loved copy with notes about cognitive biases and a few folded page corners. All pages are intact.',
  },
  {
    id: 'ml-systems', title: 'Designing Machine Learning Systems', author: 'Chip Huyen', category: 'AI & Technology',
    cover: 'ml-systems.webp', color: 'sky', price: 599, readers: 16, pages: 386,
    tag: 'For the systems thinkers',
    description: 'A systems approach to building machine learning products, from choosing data to understanding what happens after deployment.',
    question: 'What’s the most overlooked tradeoff when taking a model into production?',
    notes: 'Pencil annotations on evaluation, distribution shifts, and serving models efficiently. A working notebook in the margins.',
  },
  {
    id: 'little-prince', title: 'The Little Prince', author: 'Antoine de Saint-Exupéry', category: 'Literature',
    cover: 'little-prince.webp', color: 'butter', price: 149, readers: 21, pages: 96,
    tag: 'A little book, a big heart',
    description: 'A small traveler’s story of friendship, imagination, and the things we sometimes forget to notice as we grow up.',
    question: 'What did this story mean to you the second time you read it?',
    notes: 'A gently read copy with a short handwritten note from its last reader. The illustrations are unmarked.',
  },
];

export interface Discussion {
  id: string;
  category: Category;
  tag: string;
  title: string;
  book: string;
  initials: string;
  name: string;
  color: string;
  replies: number;
  prompt: string;
}

export const discussions: Discussion[] = [
  { id: 'attention', category: 'Philosophy', tag: 'A little food for thought', title: 'Is paying attention a radical act?', book: 'The Creative Act', initials: 'AM', name: 'A curious reader', color: 'lavender', replies: 18, prompt: 'When everything competes for our attention, choosing what to notice feels like a decision about what matters. Does protecting your attention change how you create?' },
  { id: 'habits', category: 'Psychology', tag: 'Small changes, big ideas', title: 'Your environment might be your best habit coach.', book: 'Atomic Habits · Chapter 6', initials: 'JK', name: 'A fellow bookworm', color: 'peach', replies: 24, prompt: 'I moved my book from a drawer to my pillow, and started reading before bed. What have you changed in your environment to make a good habit easier?' },
  { id: 'ai', category: 'AI & Technology', tag: 'Let’s think it through', title: 'When a machine remembers, what does it actually keep?', book: 'The technology reading circle', initials: 'SP', name: 'A systems thinker', color: 'sky', replies: 12, prompt: 'A reading notebook and a model’s memory both select what to keep. Where does that analogy help us understand AI, and where does it break down?' },
  { id: 'stories', category: 'Literature', tag: 'Between the lines', title: 'Can a book change without a single word changing?', book: 'The literature reading circle', initials: 'RL', name: 'A returning reader', color: 'mint', replies: 9, prompt: 'Rereading a familiar book a few years later can feel like meeting a different story. Which book changed for you when you returned to it?' },
];

export const categories: Category[] = ['All books', 'Philosophy', 'AI & Technology', 'Psychology', 'Literature', 'Design'];
