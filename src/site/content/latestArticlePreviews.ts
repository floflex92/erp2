import { articleIndex } from '@/site/content/articleIndex'

export type LatestArticlePreview = Pick<(typeof articleIndex)[number], 'slug' | 'title' | 'description'>

export const latestArticlePreviews: LatestArticlePreview[] = articleIndex.slice(-2)